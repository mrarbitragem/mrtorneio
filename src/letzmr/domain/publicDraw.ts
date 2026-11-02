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

/** Aproveitamento de games: vencidos ÷ jogados. Sem games, "—". */
export function formatAvg(gamePct: number | null): string {
  if (gamePct == null || Number.isNaN(gamePct)) return "—";
  return `${gamePct.toLocaleString("pt-BR", {
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  })}%`;
}

/** Texto público do set: só games, sem dígito de tie-break (7x6, 9x8). */
export function formatSetScore(set: SetScore): string {
  return `${set.gamesA}x${set.gamesB}`;
}

/**
 * Resultado em frase para a consulta pública: "Ana / Bia vence 6x3".
 * O placar sai sempre do ponto de vista de quem venceu. Sem resultado, devolve null.
 */
export function describeMatchResult(
  match: Pick<Match, "sideAId" | "sideBId" | "winnerRegistrationId" | "score" | "status">,
  nameOf: (id?: string) => string,
): string | null {
  if (match.status === "bye" || !match.winnerRegistrationId || !match.score) return null;
  const winner = nameOf(match.winnerRegistrationId);
  if (match.score.woSide) return `${winner} vence por W.O.`;
  const winnerIsB = match.winnerRegistrationId === match.sideBId;
  const sets = match.score.sets
    .map((set) =>
      formatSetScore(winnerIsB ? { ...set, gamesA: set.gamesB, gamesB: set.gamesA } : set),
    )
    .join(" ");
  return sets ? `${winner} vence ${sets}` : `${winner} vence`;
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

/** Título da coluna da chave, por extenso: "Oitavas", "Quartas", "Semifinal", "Final". */
export function knockoutRoundLabel(matchCount: number): string {
  if (matchCount >= 8) return "Oitavas de Final";
  if (matchCount === 4) return "Quartas de Final";
  if (matchCount === 2) return "Semifinal";
  if (matchCount === 1) return "Final";
  return `Rodada (${matchCount} jogos)`;
}

export const REFEREE_ORDER_NOTICE =
  "Os jogos não têm ordem fixa. A ordem é definida no dia pelo árbitro.";

/** Ausente nos dados antigos conta como ligado: a ordem do grupo é do árbitro. */
export function shouldShowRefereeOrderNotice(flag?: boolean): boolean {
  return flag !== false;
}

export function matchStatusLabel(status: Match["status"]): string {
  switch (status) {
    case "pending":
      return "Pendente";
    case "scheduled":
      return "Programado";
    case "played":
      return "Encerrado";
    case "wo":
      return "W.O.";
    case "bye":
      return "BYE";
    default:
      return status;
  }
}

export function groupPhaseLabel(group: Group | undefined): string {
  const index = String(group?.index ?? 0).padStart(2, "0");
  return `Fase de grupos - G${index}`;
}

export function formatScheduleWhen(iso?: string): string {
  if (!iso) return "Sem horário definido";
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
  return `${date} às ${time}`;
}
