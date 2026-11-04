import { formatScheduleWhen, knockoutRoundTitle } from "./publicDraw";
import type { CategoryFormat, Group, LetzmrStore, Match } from "./types";

/** Encurta origem da chave para caber no A4: 1º lugar do grupo 1 → 1ºG1. */
export function shortenBracketLabel(label: string): string {
  return label
    .replace(/(\d+)º lugar do grupo (\d+)/gi, "$1ºG$2")
    .replace(/(\d+)º lugar do grupo/gi, "$1ºG")
    .replace(/Vencedor QF (\d+)/gi, "V QF$1")
    .replace(/Vencedor SF (\d+)/gi, "V SF$1")
    .replace(/Vencedor R(\d+) #(\d+)/gi, "V R$1-$2");
}

export function categoryFormatLabel(format?: CategoryFormat): string {
  return format === "KO" ? "Eliminatória" : "Grupo + Chaves";
}

export function printedAtLabel(iso = new Date().toISOString()): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(iso));
}

/** Ranking do atleta no impresso de grupos: sempre 4 dígitos, 0000 se não houver. */
export function printRankingLabel(seed?: number): string {
  if (seed != null && Number.isFinite(seed) && seed > 0) {
    return String(Math.trunc(seed)).padStart(4, "0");
  }
  return "0000";
}

export function printAthleteNameUpper(name: string): string {
  return String(name || "").toLocaleUpperCase("pt-BR");
}

export function groupHasPublishedScores(matches: Match[], groupId: string): boolean {
  return matches.some(
    (match) =>
      match.groupId === groupId &&
      match.phase === "GROUP" &&
      (match.status === "played" || match.status === "wo"),
  );
}

/** Cada atleta da dupla em sua linha, como no impresso de grupos. */
export function splitPrintedAthleteNames(name: string): string[] {
  const parts = String(name || "")
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  return parts.length ? parts : [String(name || "").trim()].filter(Boolean);
}

/**
 * Paginação do “Apenas grupos”: cabe ~5 grupos de 3 (ou menos se forem de 4)
 * numa folha A4 vertical.
 */
export function splitGroupsForCompactPrint<T extends { rankingLength: number }>(
  rankings: T[],
): T[][] {
  const pages: T[][] = [];
  let current: T[] = [];
  let currentCost = 0;
  const pageCapacity = 6.1;
  for (const item of rankings) {
    const teamCount = item.rankingLength || 3;
    const sizeCost = 0.96 + Math.max(0, teamCount - 3) * 0.34;
    const exceedsPage =
      current.length > 0 && (currentCost + sizeCost > pageCapacity || current.length >= 5);
    if (exceedsPage) {
      pages.push(current);
      current = [];
      currentCost = 0;
    }
    current.push(item);
    currentCost += sizeCost;
  }
  if (current.length) pages.push(current);
  return pages;
}

/** DF / DM / DX + classe: Feminina Iniciante → DFI; Masculina Avançada → DMAV. */
export function gamesPrintCategoryCode(name = ""): string {
  const clean = String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9+ ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const gender = /\b(?:MIST[AO]S?|MIXTO?S?)\b/.test(clean)
    ? "X"
    : /\bMASCULIN[AO]S?\b/.test(clean)
      ? "M"
      : /\bFEMININ[AO]S?\b/.test(clean)
        ? "F"
        : "";
  if (gender) {
    const tokens = clean.split(" ");
    const grade = tokens.find((word) => /^[A-Z]$/.test(word));
    const level =
      grade ||
      (/\bINICIANTES?\b/.test(clean)
        ? "I"
        : /\bINTERMEDIARI[AO]S?\b/.test(clean)
          ? "INT"
          : /\bAVANCAD[AO]S?\b/.test(clean)
            ? "AV"
            : /\bOPEN\b/.test(clean)
              ? "OPEN"
              : /\bLIVRE\b/.test(clean)
                ? "L"
                : "");
    if (level) return `${gender} ${level}`;
  }
  const words = clean.split(" ").filter(Boolean);
  return (words.length === 1 ? words[0].slice(0, 5) : words.map((word) => word[0]).join("").slice(0, 5)) || "CAT";
}

/** Capitalização só do impresso: CAIXA ALTA vira forma convencional. */
export function gamesPrintDisplayName(value: string): string {
  const smallWords = new Set(["da", "das", "de", "do", "dos", "e"]);
  const source = String(value ?? "").toLocaleLowerCase("pt-BR");
  return source.replace(/[\p{L}]+/gu, (word, pos) => {
    const leading = source.slice(0, pos);
    const beginning = !leading.trim() || /[\/|]\s*$/.test(leading);
    if (!beginning && smallWords.has(word)) return word;
    return word.charAt(0).toLocaleUpperCase("pt-BR") + word.slice(1);
  });
}

export function gamesPrintShortAthleteName(name = ""): string {
  const trimmed = String(name || "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!trimmed) return "";
  if (/^(a definir|bye)$/i.test(trimmed)) return gamesPrintDisplayName(trimmed);
  if (/^\d+º/i.test(trimmed) || /^v(encedor)?\b/i.test(trimmed)) return trimmed;
  const conventional = gamesPrintDisplayName(trimmed);
  const words = conventional.split(/\s+/).filter(Boolean);
  if (words.length <= 2) return conventional;
  return `${words[0]} ${words[words.length - 1]}`;
}

export function gamesPrintShortTeamName(value = ""): string {
  return String(value || "")
    .split(/\s*\/\s*/)
    .map(gamesPrintShortAthleteName)
    .filter(Boolean)
    .join(" / ");
}

export function printableScoreLabel(match: Match): string {
  if (match.status === "wo") return "W.O.";
  if (match.status !== "played" || !match.score?.sets?.length) return "";
  return match.score.sets.map((set) => `${set.gamesA}x${set.gamesB}`).join(" ");
}

export function dateKeyFromIso(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function timeFromIso(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(d);
}

export function gamesPrintDateLabel(day: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "Sem data definida";
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date).toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export type PrintGame = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryOrder: number;
  phase: string;
  phaseOrder: number;
  phaseGroupKey: string;
  dateTime: string;
  dateKey: string;
  time: string;
  teamA: string;
  teamB: string;
  score: string;
  matchOrder: number;
};

function teamNameOf(store: LetzmrStore, match: Match, side: "A" | "B"): string {
  const id = side === "A" ? match.sideAId : match.sideBId;
  const placeholder = side === "A" ? match.placeholderA : match.placeholderB;
  if (id) return store.registrations.find((reg) => reg.id === id)?.displayName ?? "—";
  return shortenBracketLabel(placeholder || "A definir");
}

function koPhaseCode(roundTitle: string, phaseOrder: number): string {
  const name = String(roundTitle || "Eliminatória");
  if (/quart/i.test(name) || name === "QF") return "QF";
  if (/semi/i.test(name) || name === "SF") return "SF";
  if (/final/i.test(name)) return "F";
  if (name.length <= 7) return name.toUpperCase();
  return `E${phaseOrder + 1}`;
}

/** Fila para árbitros: grupos + eliminatória, sem BYE e sem confrontos futuros vazios. */
export function collectPrintGames(store: LetzmrStore, categoryIds?: string[]): PrintGame[] {
  const allowed = categoryIds ? new Set(categoryIds) : null;
  const games: PrintGame[] = [];
  store.categories.forEach((category, categoryOrder) => {
    if (allowed && !allowed.has(category.id)) return;
    const groups = store.groups
      .filter((group) => group.categoryId === category.id)
      .sort((a, b) => a.index - b.index);
    const groupById = new Map(groups.map((group) => [group.id, group]));
    const matches = store.matches.filter((match) => match.categoryId === category.id);
    const groupMatches = matches.filter((match) => match.phase === "GROUP");
    const koMatches = matches.filter((match) => match.phase === "KO");
    const koByRound = new Map<number, Match[]>();
    for (const match of koMatches) {
      const list = koByRound.get(match.round) ?? [];
      list.push(match);
      koByRound.set(match.round, list);
    }

    for (const match of groupMatches) {
      const group = match.groupId ? groupById.get(match.groupId) : undefined;
      const dateTime = match.scheduledAt || "";
      games.push({
        id: match.id,
        categoryId: category.id,
        categoryName: category.name,
        categoryOrder,
        phase: `G${group?.index ?? 0}`,
        phaseOrder: (group?.index ?? 1) - 1,
        phaseGroupKey: group?.id || match.groupId || `grupo-${group?.index ?? 0}`,
        dateTime,
        dateKey: dateKeyFromIso(dateTime),
        time: timeFromIso(dateTime),
        teamA: teamNameOf(store, match, "A"),
        teamB: teamNameOf(store, match, "B"),
        score: printableScoreLabel(match),
        matchOrder: match.position,
      });
    }

    const rounds = [...koByRound.keys()].sort((a, b) => a - b);
    rounds.forEach((round, phaseOrder) => {
      const roundMatches = (koByRound.get(round) ?? []).slice().sort((a, b) => a.position - b.position);
      const phase = koPhaseCode(knockoutRoundTitle(roundMatches.length), phaseOrder);
      for (const match of roundMatches) {
        if (match.status === "bye") continue;
        if (!match.scheduledAt && !match.sideAId && !match.sideBId) continue;
        const dateTime = match.scheduledAt || "";
        games.push({
          id: match.id,
          categoryId: category.id,
          categoryName: category.name,
          categoryOrder,
          phase,
          phaseOrder: 100 + phaseOrder,
          phaseGroupKey: `eliminatoria-${round}`,
          dateTime,
          dateKey: dateKeyFromIso(dateTime),
          time: timeFromIso(dateTime),
          teamA: teamNameOf(store, match, "A"),
          teamB: teamNameOf(store, match, "B"),
          score: printableScoreLabel(match),
          matchOrder: match.position,
        });
      }
    });
  });

  return games.sort((a, b) => {
    if (!a.dateTime && b.dateTime) return 1;
    if (a.dateTime && !b.dateTime) return -1;
    if (a.dateTime !== b.dateTime) return a.dateTime.localeCompare(b.dateTime);
    return a.categoryOrder - b.categoryOrder || a.phaseOrder - b.phaseOrder || a.matchOrder - b.matchOrder;
  });
}

export type PrintGameRow = {
  game: PrintGame;
  timeSpan?: number;
  categorySpan?: number;
  phaseSpan?: number;
  groupStart: boolean;
};

export type PrintDaySection = {
  dateKey: string;
  label: string;
  count: number;
  blocks: { rows: PrintGameRow[] }[];
};

function samePrintUnit(a: PrintGame, b: PrintGame): boolean {
  return (
    (a.dateKey || "") === (b.dateKey || "") &&
    a.time === b.time &&
    a.categoryId === b.categoryId &&
    a.phase === b.phase &&
    (a.phaseGroupKey || a.phase) === (b.phaseGroupKey || b.phase)
  );
}

export function formatRefereeTime(time: string): string {
  if (!time) return "—";
  return time.endsWith("h") ? time : `${time}h`;
}

/** Data e hora do grupo na folha impressa (o horário compartilhado pelos jogos). */
export function groupPrintWhen(scheduledAts: (string | undefined)[]): string {
  const times = [...new Set(scheduledAts.filter((iso): iso is string => Boolean(iso)))].sort();
  if (!times.length) return "";
  const first = formatScheduleWhen(times[0]);
  if (times.length === 1) return first;
  const rest = times.slice(1).map((iso) => timeFromIso(iso)).filter(Boolean);
  return rest.length ? `${first} / ${rest.join(" / ")}` : first;
}

/**
 * Folha do dia: cada bloco é um horário + categoria + fase (G1, G2, QF…).
 * HORA/CAT/FASE não atravessam grupos diferentes.
 */
export function groupPrintGames(games: PrintGame[]): PrintDaySection[] {
  const dayCounts = new Map<string, number>();
  for (const game of games) {
    const key = game.dateKey || "";
    dayCounts.set(key, (dayCounts.get(key) || 0) + 1);
  }
  const sections: PrintDaySection[] = [];
  let offset = 0;
  while (offset < games.length) {
    const day = games[offset].dateKey || "";
    let dayEnd = offset;
    while (dayEnd < games.length && (games[dayEnd].dateKey || "") === day) dayEnd += 1;
    const blocks: { rows: PrintGameRow[] }[] = [];
    let cursor = offset;
    while (cursor < dayEnd) {
      const current = games[cursor];
      let to = cursor + 1;
      while (to < dayEnd && samePrintUnit(games[to], current)) to += 1;
      const count = to - cursor;
      const rows: PrintGameRow[] = [];
      for (let i = cursor; i < to; i += 1) {
        const row: PrintGameRow = {
          game: games[i],
          groupStart: i === cursor,
        };
        if (i === cursor) {
          row.timeSpan = count;
          row.categorySpan = count;
          row.phaseSpan = count;
        }
        rows.push(row);
      }
      blocks.push({ rows });
      cursor = to;
    }
    sections.push({
      dateKey: day,
      label: day ? gamesPrintDateLabel(day) : "SEM DATA DEFINIDA",
      count: dayCounts.get(day) || 0,
      blocks,
    });
    offset = dayEnd;
  }
  return sections;
}

export function filterPrintGames(
  games: PrintGame[],
  opts: { allDays: boolean; dateKeys: Set<string>; includeUnscheduled: boolean },
): PrintGame[] {
  return games.filter((game) =>
    game.dateKey
      ? opts.allDays || opts.dateKeys.has(game.dateKey)
      : opts.includeUnscheduled,
  );
}

export type PrintDateFilter = {
  allDays: boolean;
  dateKeys: Set<string>;
  includeUnscheduled: boolean;
};

/** Dias em que há jogos de grupo (não inclui a eliminatória). */
export function collectGroupPrintDates(store: LetzmrStore, categoryIds?: string[]): string[] {
  const allowed = categoryIds ? new Set(categoryIds) : null;
  const keys = new Set<string>();
  for (const match of store.matches) {
    if (match.phase !== "GROUP") continue;
    if (allowed && !allowed.has(match.categoryId)) continue;
    const key = dateKeyFromIso(match.scheduledAt);
    if (key) keys.add(key);
  }
  return [...keys].sort();
}

export function filterGroupsForPrint(
  groups: Group[],
  matches: Match[],
  opts: PrintDateFilter,
): Group[] {
  return groups.filter((group) => {
    const groupMatches = matches.filter(
      (match) => match.groupId === group.id && match.phase === "GROUP",
    );
    const keys = [
      ...new Set(groupMatches.map((match) => dateKeyFromIso(match.scheduledAt)).filter(Boolean)),
    ];
    if (keys.length === 0) return opts.includeUnscheduled;
    return opts.allDays || keys.some((key) => opts.dateKeys.has(key));
  });
}
