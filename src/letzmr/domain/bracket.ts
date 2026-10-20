import { newId } from "./ids";
import type { Match, StandingRow } from "./types";

export type BracketSideRef =
  | { kind: "group_rank"; groupIndex: number; rank: number; label: string }
  | { kind: "bye"; label: "BYE" }
  | { kind: "winner"; fromPosition: number; label: string };

export interface BracketPairing {
  round: number;
  position: number;
  sideA: BracketSideRef;
  sideB: BracketSideRef;
}

/** N=2, 2 advancers — Verificado lab SF A */
export const PRESET_N2_ADV2: BracketPairing[] = [
  {
    round: 1,
    position: 1,
    sideA: { kind: "group_rank", groupIndex: 1, rank: 1, label: "1º lugar do grupo 1" },
    sideB: { kind: "group_rank", groupIndex: 2, rank: 2, label: "2º lugar do grupo 2" },
  },
  {
    round: 1,
    position: 2,
    sideA: { kind: "group_rank", groupIndex: 1, rank: 2, label: "2º lugar do grupo 1" },
    sideB: { kind: "group_rank", groupIndex: 2, rank: 1, label: "1º lugar do grupo 2" },
  },
  {
    round: 2,
    position: 1,
    sideA: { kind: "winner", fromPosition: 1, label: "Vencedor SF 1" },
    sideB: { kind: "winner", fromPosition: 2, label: "Vencedor SF 2" },
  },
];

/** N=4, 2 advancers — Verificado modal público (origem) */
export const PRESET_N4_ADV2: BracketPairing[] = [
  {
    round: 1,
    position: 1,
    sideA: { kind: "group_rank", groupIndex: 1, rank: 1, label: "1º lugar do grupo 1" },
    sideB: { kind: "group_rank", groupIndex: 3, rank: 2, label: "2º lugar do grupo 3" },
  },
  {
    round: 1,
    position: 2,
    sideA: { kind: "group_rank", groupIndex: 2, rank: 2, label: "2º lugar do grupo 2" },
    sideB: { kind: "group_rank", groupIndex: 4, rank: 1, label: "1º lugar do grupo 4" },
  },
  {
    round: 1,
    position: 3,
    sideA: { kind: "group_rank", groupIndex: 3, rank: 1, label: "1º lugar do grupo 3" },
    sideB: { kind: "group_rank", groupIndex: 1, rank: 2, label: "2º lugar do grupo 1" },
  },
  {
    round: 1,
    position: 4,
    sideA: { kind: "group_rank", groupIndex: 4, rank: 2, label: "2º lugar do grupo 4" },
    sideB: { kind: "group_rank", groupIndex: 2, rank: 1, label: "1º lugar do grupo 2" },
  },
  {
    round: 2,
    position: 1,
    sideA: { kind: "winner", fromPosition: 1, label: "Vencedor QF 1" },
    sideB: { kind: "winner", fromPosition: 2, label: "Vencedor QF 2" },
  },
  {
    round: 2,
    position: 2,
    sideA: { kind: "winner", fromPosition: 3, label: "Vencedor QF 3" },
    sideB: { kind: "winner", fromPosition: 4, label: "Vencedor QF 4" },
  },
  {
    round: 3,
    position: 1,
    sideA: { kind: "winner", fromPosition: 1, label: "Vencedor SF 1" },
    sideB: { kind: "winner", fromPosition: 2, label: "Vencedor SF 2" },
  },
];

/**
 * Explicit BYE mapping for odd qualifiers (proposta).
 * Example: 3 qualifiers → 4-slot SF with BYE for best remaining.
 * Only use when mapping is explicit — never invent silently.
 */
export const PRESET_BYE_3_QUALIFIERS: BracketPairing[] = [
  {
    round: 1,
    position: 1,
    sideA: { kind: "group_rank", groupIndex: 1, rank: 1, label: "1º lugar do grupo 1" },
    sideB: { kind: "bye", label: "BYE" },
  },
  {
    round: 1,
    position: 2,
    sideA: { kind: "group_rank", groupIndex: 1, rank: 2, label: "2º lugar do grupo 1" },
    sideB: { kind: "group_rank", groupIndex: 2, rank: 1, label: "1º lugar do grupo 2" },
  },
  {
    round: 2,
    position: 1,
    sideA: { kind: "winner", fromPosition: 1, label: "Vencedor SF 1" },
    sideB: { kind: "winner", fromPosition: 2, label: "Vencedor SF 2" },
  },
];

export function resolveBracketPreset(
  numGroups: number,
  advancersPerGroup: number,
): BracketPairing[] {
  if (numGroups === 2 && advancersPerGroup === 2) return PRESET_N2_ADV2;
  if (numGroups === 4 && advancersPerGroup === 2) return PRESET_N4_ADV2;
  const total = numGroups * advancersPerGroup;
  if (total === 3) return PRESET_BYE_3_QUALIFIERS;
  throw new Error(
    `Sem mapping explícito para N=${numGroups}, classificados/grupo=${advancersPerGroup}. Use presets N=2/N=4 ou BYE documentado.`,
  );
}

export function buildKoMatchesFromPreset(
  categoryId: string,
  pairings: BracketPairing[],
): Match[] {
  const round1 = pairings.filter((p) => p.round === 1);
  const byRoundPos = new Map<string, Match>();
  const matches: Match[] = [];

  for (const p of pairings) {
    const m: Match = {
      id: newId("m"),
      categoryId,
      phase: "KO",
      round: p.round,
      position: p.position,
      placeholderA: p.sideA.label,
      placeholderB: p.sideB.label,
      status: p.sideB.kind === "bye" || p.sideA.kind === "bye" ? "bye" : "pending",
    };
    if (p.sideA.kind === "bye") m.sideAId = undefined;
    if (p.sideB.kind === "bye") m.sideBId = undefined;
    matches.push(m);
    byRoundPos.set(`${p.round}:${p.position}`, m);
  }

  // Wire feeds: round R winners → round R+1
  for (const p of pairings) {
    if (p.sideA.kind !== "winner" && p.sideB.kind !== "winner") continue;
    const target = byRoundPos.get(`${p.round}:${p.position}`)!;
    if (p.sideA.kind === "winner") {
      const src = roundSource(p.sideA.fromPosition, p.round, byRoundPos, round1.length);
      if (src) {
        src.feedsToMatchId = target.id;
        src.feedsToSlot = "A";
      }
    }
    if (p.sideB.kind === "winner") {
      const src = roundSource(p.sideB.fromPosition, p.round, byRoundPos, round1.length);
      if (src) {
        src.feedsToMatchId = target.id;
        src.feedsToSlot = "B";
      }
    }
  }

  // Auto-advance BYE
  for (const m of matches) {
    if (m.status !== "bye") continue;
    const pairing = pairings.find((p) => p.round === m.round && p.position === m.position);
    if (!pairing) continue;
    // Winner is the non-bye side — resolved at materialize time
    void pairing;
  }

  return matches;
}

function roundSource(
  fromPosition: number,
  targetRound: number,
  byRoundPos: Map<string, Match>,
  _r1Count: number,
): Match | undefined {
  // Winners reference positions in previous round
  return byRoundPos.get(`${targetRound - 1}:${fromPosition}`);
}

export function materializeKoSlots(
  koMatches: Match[],
  pairings: BracketPairing[],
  groupIndexToId: Map<number, string>,
  standingsByGroup: Map<string, StandingRow[]>,
): Match[] {
  return koMatches.map((m) => {
    const pairing = pairings.find((p) => p.round === m.round && p.position === m.position);
    if (!pairing) return m;
    const next = { ...m };

    const resolve = (side: BracketPairing["sideA"]): string | undefined => {
      if (side.kind === "bye") return undefined;
      if (side.kind === "winner") return undefined; // filled by feed
      const gid = groupIndexToId.get(side.groupIndex);
      if (!gid) return undefined;
      const rows = standingsByGroup.get(gid) ?? [];
      const row = rows.find((r) => r.rank === side.rank);
      return row?.registrationId;
    };

    if (pairing.sideA.kind === "group_rank") {
      next.sideAId = resolve(pairing.sideA);
      if (next.sideAId) next.placeholderA = undefined;
    }
    if (pairing.sideB.kind === "group_rank") {
      next.sideBId = resolve(pairing.sideB);
      if (next.sideBId) next.placeholderB = undefined;
    }

    // BYE advance
    if (pairing.sideB.kind === "bye" && next.sideAId) {
      next.status = "bye";
      next.winnerRegistrationId = next.sideAId;
    }
    if (pairing.sideA.kind === "bye" && next.sideBId) {
      next.status = "bye";
      next.winnerRegistrationId = next.sideBId;
    }

    return next;
  });
}

/** After materialize + BYE, propagate winners into next rounds once. */
export function propagateByeWinners(matches: Match[]): Match[] {
  const byId = new Map(matches.map((m) => [m.id, { ...m }]));
  for (const m of byId.values()) {
    if ((m.status === "bye" || m.status === "played" || m.status === "wo") && m.winnerRegistrationId && m.feedsToMatchId && m.feedsToSlot) {
      const next = byId.get(m.feedsToMatchId);
      if (!next) continue;
      if (m.feedsToSlot === "A") {
        next.sideAId = m.winnerRegistrationId;
        next.placeholderA = undefined;
      } else {
        next.sideBId = m.winnerRegistrationId;
        next.placeholderB = undefined;
      }
    }
  }
  return [...byId.values()];
}

export function expectedQualifiersFromStandings(
  standingsByGroup: Map<string, StandingRow[]>,
  advancersPerGroup: number,
): string[] {
  const out: string[] = [];
  for (const rows of standingsByGroup.values()) {
    for (const r of rows) {
      if (r.rank && r.rank <= advancersPerGroup) out.push(r.registrationId);
    }
  }
  return out;
}
