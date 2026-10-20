import type { Match, Registration, StandingRow } from "./types";

/** Percent with null when denominator is zero (technical decision R9). */
export function pct(forValue: number, against: number): number | null {
  const den = forValue + against;
  if (den === 0) return null;
  return (forValue / den) * 100;
}

function emptyRow(registrationId: string, groupId: string): StandingRow {
  return {
    registrationId,
    groupId,
    played: 0,
    wins: 0,
    losses: 0,
    setsFor: 0,
    setsAgainst: 0,
    gamesFor: 0,
    gamesAgainst: 0,
    setDiff: 0,
    gameDiff: 0,
    setPct: null,
    gamePct: null,
  };
}

function tallyMatch(rowA: StandingRow, rowB: StandingRow, match: Match): void {
  const score = match.score;
  if (!score) return;

  const isWo = Boolean(score.woSide);
  let setsA = 0;
  let setsB = 0;
  let gamesA = 0;
  let gamesB = 0;

  if (!isWo) {
    for (const s of score.sets) {
      gamesA += s.gamesA;
      gamesB += s.gamesB;
      if (s.gamesA > s.gamesB) setsA += 1;
      else if (s.gamesB > s.gamesA) setsB += 1;
    }
  }

  rowA.played += 1;
  rowB.played += 1;
  rowA.setsFor += setsA;
  rowA.setsAgainst += setsB;
  rowB.setsFor += setsB;
  rowB.setsAgainst += setsA;
  rowA.gamesFor += gamesA;
  rowA.gamesAgainst += gamesB;
  rowB.gamesFor += gamesB;
  rowB.gamesAgainst += gamesA;

  const winner = match.winnerRegistrationId;
  if (winner === rowA.registrationId) {
    rowA.wins += 1;
    rowB.losses += 1;
  } else if (winner === rowB.registrationId) {
    rowB.wins += 1;
    rowA.losses += 1;
  }
}

export function computeGroupStandings(
  groupId: string,
  registrations: Registration[],
  matches: Match[],
): StandingRow[] {
  const regs = registrations.filter((r) => r.groupId === groupId && r.status === "confirmed");
  const map = new Map(regs.map((r) => [r.id, emptyRow(r.id, groupId)]));

  for (const m of matches) {
    if (m.groupId !== groupId || m.phase !== "GROUP") continue;
    if (m.status !== "played" && m.status !== "wo") continue;
    if (!m.sideAId || !m.sideBId) continue;
    const a = map.get(m.sideAId);
    const b = map.get(m.sideBId);
    if (!a || !b) continue;
    tallyMatch(a, b, m);
  }

  for (const row of map.values()) {
    row.setDiff = row.setsFor - row.setsAgainst;
    row.gameDiff = row.gamesFor - row.gamesAgainst;
    row.setPct = pct(row.setsFor, row.setsAgainst);
    row.gamePct = pct(row.gamesFor, row.gamesAgainst);
  }

  return [...map.values()];
}

/** Who won the head-to-head in the group? null if not played / missing. */
export function headToHeadWinner(
  regA: string,
  regB: string,
  matches: Match[],
  groupId: string,
): string | null {
  const m = matches.find(
    (x) =>
      x.groupId === groupId &&
      x.phase === "GROUP" &&
      (x.status === "played" || x.status === "wo") &&
      ((x.sideAId === regA && x.sideBId === regB) ||
        (x.sideAId === regB && x.sideBId === regA)),
  );
  if (!m?.winnerRegistrationId) return null;
  return m.winnerRegistrationId;
}

type Metric = (row: StandingRow) => number | null;

const METRICS: { name: string; metric: Metric }[] = [
  { name: "setDiff", metric: (r) => r.setDiff },
  { name: "gameDiff", metric: (r) => r.gameDiff },
  { name: "setPct", metric: (r) => r.setPct },
  { name: "gamePct", metric: (r) => r.gamePct },
];

function metricKey(row: StandingRow, metric: Metric): string {
  const v = metric(row);
  return v === null ? "null" : String(v);
}

/**
 * Rank group using LETZMR cascade (R2):
 * W-L → (exactly 2: H2H) → (3+: criteria stepwise; when reduced to 2 → H2H) → residual draw.
 */
export function rankGroup(
  rows: StandingRow[],
  matches: Match[],
  groupId: string,
  residualOrder?: string[],
): { ranked: StandingRow[]; residualPending: string[]; pendingH2h: string[][] } {
  const byId = new Map(rows.map((r) => [r.registrationId, { ...r }]));
  const residualPending: string[] = [];
  const pendingH2h: string[][] = [];

  function resolveH2hPair(a: string, b: string): string[] | null {
    const h2h = headToHeadWinner(a, b, matches, groupId);
    if (h2h === a) {
      byId.get(a)!.rankSource = "h2h";
      byId.get(b)!.rankSource = "h2h";
      return [a, b];
    }
    if (h2h === b) {
      byId.get(a)!.rankSource = "h2h";
      byId.get(b)!.rankSource = "h2h";
      return [b, a];
    }
    return null;
  }

  function applyResidual(ids: string[]): string[] {
    if (residualOrder && ids.every((id) => residualOrder.includes(id))) {
      const ordered = [...ids].sort(
        (a, b) => residualOrder.indexOf(a) - residualOrder.indexOf(b),
      );
      for (const id of ordered) byId.get(id)!.rankSource = "draw";
      return ordered;
    }
    residualPending.push(...ids);
    for (const id of ids) {
      if (!byId.get(id)!.rankSource) byId.get(id)!.rankSource = "residual_pending";
    }
    return [...ids].sort((a, b) => a.localeCompare(b));
  }

  function resolveCluster(ids: string[], metricIndex: number): string[] {
    if (ids.length <= 1) {
      if (ids[0] && !byId.get(ids[0])!.rankSource) {
        byId.get(ids[0])!.rankSource = "criteria";
      }
      return ids;
    }

    if (ids.length === 2) {
      const pair = resolveH2hPair(ids[0], ids[1]);
      if (pair) return pair;
      // No conclusive H2H — continue cascade between the two
      if (metricIndex < METRICS.length) {
        return partitionByMetric(ids, metricIndex);
      }
      pendingH2h.push([ids[0], ids[1]]);
      byId.get(ids[0])!.rankSource = "pending_h2h";
      byId.get(ids[1])!.rankSource = "pending_h2h";
      return applyResidual(ids);
    }

    // 3+
    if (metricIndex >= METRICS.length) {
      return applyResidual(ids);
    }
    return partitionByMetric(ids, metricIndex);
  }

  function partitionByMetric(ids: string[], metricIndex: number): string[] {
    const { metric } = METRICS[metricIndex];
    const groups = new Map<string, string[]>();
    for (const id of ids) {
      const key = metricKey(byId.get(id)!, metric);
      const arr = groups.get(key) ?? [];
      arr.push(id);
      groups.set(key, arr);
    }

    // Sort keys descending by numeric value; nulls last (neutral)
    const keys = [...groups.keys()].sort((ka, kb) => {
      if (ka === "null" && kb === "null") return 0;
      if (ka === "null") return 1;
      if (kb === "null") return -1;
      return Number(kb) - Number(ka);
    });

    const ordered: string[] = [];
    for (const key of keys) {
      const cluster = groups.get(key)!;
      // After this metric, if cluster size is 2 → H2H immediately (do not advance metrics between them)
      if (cluster.length === 2) {
        const pair = resolveH2hPair(cluster[0], cluster[1]);
        if (pair) {
          ordered.push(...pair);
          continue;
        }
        // no H2H → keep cascading
        ordered.push(...resolveCluster(cluster, metricIndex + 1));
      } else if (cluster.length === 1) {
        const id = cluster[0];
        if (!byId.get(id)!.rankSource) byId.get(id)!.rankSource = "criteria";
        ordered.push(id);
      } else {
        ordered.push(...resolveCluster(cluster, metricIndex + 1));
      }
    }
    return ordered;
  }

  // Partition by W-L first
  const wlBuckets = new Map<string, string[]>();
  for (const r of rows) {
    const key = `${r.wins}-${r.losses}`;
    const arr = wlBuckets.get(key) ?? [];
    arr.push(r.registrationId);
    wlBuckets.set(key, arr);
  }

  const wlKeys = [...wlBuckets.keys()].sort((a, b) => {
    const [aw, al] = a.split("-").map(Number);
    const [bw, bl] = b.split("-").map(Number);
    if (bw !== aw) return bw - aw;
    return al - bl;
  });

  const ordered: string[] = [];
  for (const key of wlKeys) {
    const bucket = wlBuckets.get(key)!;
    if (bucket.length === 1) {
      byId.get(bucket[0])!.rankSource = "criteria";
      ordered.push(bucket[0]);
    } else if (bucket.length === 2) {
      // Exactly 2 on W-L → H2H first
      const pair = resolveH2hPair(bucket[0], bucket[1]);
      if (pair) ordered.push(...pair);
      else ordered.push(...resolveCluster(bucket, 0));
    } else {
      ordered.push(...resolveCluster(bucket, 0));
    }
  }

  const ranked = ordered.map((id, idx) => {
    const row = byId.get(id)!;
    row.rank = idx + 1;
    if (!row.rankSource) row.rankSource = "criteria";
    return row;
  });

  return {
    ranked,
    residualPending: [...new Set(residualPending)],
    pendingH2h,
  };
}
