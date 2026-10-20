import type { Group, Match, SetScore, StandingRow } from "./types";

/** Every group match has a result, so the public list collapses behind Visualizar. */
export function isGroupComplete(matches: Match[], groupId: string): boolean {
  const groupMatches = matches.filter((m) => m.groupId === groupId && m.phase === "GROUP");
  if (groupMatches.length === 0) return false;
  return groupMatches.every(
    (m) => m.status === "played" || m.status === "wo" || m.status === "bye",
  );
}

/** True when at least two pairs share the same win-loss balance. */
export function standingsNeededTieBreak(rows: Pick<StandingRow, "wins" | "losses">[]): boolean {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const key = `${row.wins}-${row.losses}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.values()].some((count) => count > 1);
}

export function groupTieBreakSummary(ranked: StandingRow[]): string {
  if (!standingsNeededTieBreak(ranked)) return "";
  if (ranked.some((row) => row.rankSource === "h2h")) {
    return "Duas duplas ficaram empatadas e a posição saiu do confronto direto.";
  }
  if (ranked.some((row) => row.rankSource === "draw" || row.rankSource === "residual_pending")) {
    return "O saldo não separou as duplas. A posição restante fica no sorteio.";
  }
  return "O saldo de sets, de games ou o aproveitamento separou as duplas empatadas.";
}

export const TIEBREAK_RULES = [
  "Empate é o mesmo saldo de vitórias e derrotas.",
  "Com exatamente duas duplas, o critério é o confronto direto.",
  "Com três ou mais, a ordem é saldo de sets, saldo de games, aproveitamento de sets, aproveitamento de games e sorteio.",
  "Se nessa sequência restarem só duas duplas, vale de novo o confronto direto.",
];

/** Games stay separate from the tie-break digit so 6 and 5 never become 65. */
export function setScoreParts(set: SetScore): {
  gamesA: number;
  tiebreakA?: number;
  gamesB: number;
  tiebreakB?: number;
} {
  return {
    gamesA: set.gamesA,
    tiebreakA: set.tiebreakA,
    gamesB: set.gamesB,
    tiebreakB: set.tiebreakB,
  };
}

export function matchNumberIndex(matches: Match[], groups: Group[]): Map<string, number> {
  const groupOrder = new Map(groups.map((group) => [group.id, group.index]));
  const sorted = [...matches].sort((a, b) => {
    if (a.phase !== b.phase) return a.phase === "GROUP" ? -1 : 1;
    if (a.phase === "GROUP" && b.phase === "GROUP") {
      const groupA = groupOrder.get(a.groupId ?? "") ?? 0;
      const groupB = groupOrder.get(b.groupId ?? "") ?? 0;
      if (groupA !== groupB) return groupA - groupB;
    }
    if (a.round !== b.round) return a.round - b.round;
    return a.position - b.position;
  });
  return new Map(sorted.map((match, index) => [match.id, index + 1]));
}

export function knockoutRoundTitle(matchCount: number): string {
  if (matchCount >= 8) return "R16";
  if (matchCount === 4) return "QF";
  if (matchCount === 2) return "SF";
  if (matchCount === 1) return "Final";
  return `${matchCount} jogos`;
}

export function groupPhaseLabel(group: Group | undefined): string {
  const index = String(group?.index ?? 0).padStart(2, "0");
  return `Fase de grupos - G${index}`;
}

export function formatScheduleWhen(iso?: string): string {
  if (!iso) return "Sem horário definido";
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}
