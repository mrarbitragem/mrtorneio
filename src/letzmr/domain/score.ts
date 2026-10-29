import type { CorrectionImpact, Match, Score, SetScore, StandingRow } from "./types";

export function winnerFromSets(
  sideAId: string,
  sideBId: string,
  sets: SetScore[],
): string | null {
  let a = 0;
  let b = 0;
  for (const s of sets) {
    if (s.gamesA > s.gamesB) a += 1;
    else if (s.gamesB > s.gamesA) b += 1;
  }
  if (a === b) return null;
  return a > b ? sideAId : sideBId;
}

export function buildPlayedScore(sets: SetScore[], at = new Date().toISOString()): Score {
  return { sets, recordedAt: at };
}

export function buildWoScore(woSide: "A" | "B", at = new Date().toISOString()): Score {
  return { sets: [], woSide, recordedAt: at };
}

export function applyScoreToMatch(
  match: Match,
  score: Score,
): Match {
  if (!match.sideAId || !match.sideBId) {
    throw new Error("Partida sem lados definidos");
  }
  let winner: string | undefined;
  let status: Match["status"] = "played";

  if (score.woSide) {
    status = "wo";
    winner = score.woSide === "A" ? match.sideAId : match.sideBId;
  } else {
    const w = winnerFromSets(match.sideAId, match.sideBId, score.sets);
    if (!w) throw new Error("Placar sem vencedor");
    winner = w;
  }

  return {
    ...match,
    score,
    status,
    winnerRegistrationId: winner,
  };
}

export function clearMatchScore(match: Match): Match {
  return {
    ...match,
    score: undefined,
    status: match.scheduledAt ? "scheduled" : "pending",
    winnerRegistrationId: undefined,
  };
}

export function advanceWinnerInBracket(matches: Match[], played: Match): Match[] {
  if (!played.winnerRegistrationId || !played.feedsToMatchId || !played.feedsToSlot) {
    return matches;
  }
  return matches.map((m) => {
    if (m.id !== played.feedsToMatchId) return m;
    const next = { ...m };
    if (played.feedsToSlot === "A") {
      next.sideAId = played.winnerRegistrationId;
      next.placeholderA = undefined;
    } else {
      next.sideBId = played.winnerRegistrationId;
      next.placeholderB = undefined;
    }
    return next;
  });
}

export function clearAdvancementFromMatch(matches: Match[], fromMatch: Match): Match[] {
  if (!fromMatch.feedsToMatchId || !fromMatch.feedsToSlot) return matches;

  const clearDownstream = (matchId: string, slot: "A" | "B", acc: Map<string, Match>) => {
    const m = acc.get(matchId);
    if (!m) return;
    const next = { ...m };
    if (slot === "A") {
      next.sideAId = undefined;
      next.placeholderA = next.placeholderA ?? "A definir";
    } else {
      next.sideBId = undefined;
      next.placeholderB = next.placeholderB ?? "A definir";
    }
    // Also clear score if sides incomplete
    if (next.score) {
      next.score = undefined;
      next.winnerRegistrationId = undefined;
      next.status = next.scheduledAt ? "scheduled" : "pending";
    }
    acc.set(matchId, next);
    if (next.feedsToMatchId && next.feedsToSlot) {
      clearDownstream(next.feedsToMatchId, next.feedsToSlot, acc);
    }
  };

  const acc = new Map(matches.map((m) => [m.id, { ...m }]));
  clearDownstream(fromMatch.feedsToMatchId, fromMatch.feedsToSlot, acc);
  return [...acc.values()];
}

/**
 * Compare expected KO slot occupants (from standings) with materialized sides.
 */
export function analyzeCorrectionImpact(args: {
  groupMatch: Match;
  koMatches: Match[];
  /** Registration ids that should occupy KO slots from this category's groups */
  expectedQualifierIds: string[];
  /** Current registration ids occupying KO round-1 group_rank slots */
  materializedQualifierIds: string[];
  standingsChangedOrder: boolean;
  /**
   * Ranking cruzado: a ordem dos 1ºs colocados entre os grupos mudaria
   * (ou surgiu empate sem sorteio). Isso muda os confrontos da 1ª rodada
   * mesmo quando os classificados são os mesmos.
   */
  crossOrderChanged?: boolean;
}): CorrectionImpact {
  const expected = new Set(args.expectedQualifierIds);
  const materialized = new Set(args.materializedQualifierIds.filter(Boolean));
  const sameSet =
    expected.size === materialized.size && [...expected].every((id) => materialized.has(id));

  const mismatch = !sameSet || args.standingsChangedOrder || Boolean(args.crossOrderChanged);
  const koWithScores = args.koMatches.filter(
    (m) => m.phase === "KO" && (m.status === "played" || m.status === "wo"),
  );

  if (!mismatch) {
    return {
      kind: "score_only",
      divergenceWarning: false,
      message:
        "Correção só de placar: classificação mantém os mesmos classificados. Avanços na eliminatória permanecem.",
      affectedKoSlots: [],
      wouldClearAdvancement: false,
    };
  }

  return {
    kind: "advancement_mismatch",
    divergenceWarning: true,
    message: args.crossOrderChanged
      ? "Divergência: a ordem dos 1ºs colocados entre os grupos mudaria e, com ela, os confrontos da 1ª rodada da eliminatória. Confirme se deseja limpar/corrigir o avanço."
      : "Divergência: a classificação recalculada não coincide com os nomes já materializados na eliminatória. Confirme se deseja limpar/corrigir o avanço.",
    affectedKoSlots: args.koMatches
      .filter((m) => m.round === 1 && m.phase === "KO")
      .map((m) => m.id),
    wouldClearAdvancement: true,
    // surface that KO scores may persist until cleared (LetzPlay-like unless organizer confirms clear)
    ...(koWithScores.length
      ? {}
      : {}),
  };
}

export function orderChanged(
  before: StandingRow[],
  after: StandingRow[],
  topN: number,
): boolean {
  const b = before
    .filter((r) => r.rank && r.rank <= topN)
    .sort((a, c) => (a.rank ?? 0) - (c.rank ?? 0))
    .map((r) => r.registrationId);
  const a = after
    .filter((r) => r.rank && r.rank <= topN)
    .sort((x, y) => (x.rank ?? 0) - (y.rank ?? 0))
    .map((r) => r.registrationId);
  if (b.length !== a.length) return true;
  return b.some((id, i) => id !== a[i]);
}
