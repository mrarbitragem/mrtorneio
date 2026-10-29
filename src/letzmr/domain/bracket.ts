import { newId } from "./ids";
import type { BracketSeeding, Group, Match, StandingRow } from "./types";

export type BracketSideRef =
  | { kind: "group_rank"; groupIndex: number; rank: number; label: string }
  /**
   * Vaga definida pelo ranking cruzado dos 1ºs colocados:
   * place 1 = o k-ésimo melhor 1º; place 2 = o 2º colocado desse mesmo grupo.
   */
  | { kind: "cross_rank"; place: 1 | 2; seed: number; label: string }
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

/**
 * Grupo único com final: o 1º e o 2º do grupo jogam uma final.
 * (Sem classificados, a categoria termina no grupo e não há eliminatória.)
 */
export const PRESET_SINGLE_GROUP_FINAL: BracketPairing[] = [
  {
    round: 1,
    position: 1,
    sideA: { kind: "group_rank", groupIndex: 1, rank: 1, label: "1º lugar do grupo" },
    sideB: { kind: "group_rank", groupIndex: 1, rank: 2, label: "2º lugar do grupo" },
  },
];

/** Grupo único: 0 classificados = termina no grupo; 2 = final entre o 1º e o 2º. */
function isSingleGroupMode(numGroups: number, advancersPerGroup: number): boolean {
  return numGroups === 1 && (advancersPerGroup === 0 || advancersPerGroup === 2);
}

function resolveSingleGroup(advancersPerGroup: number): BracketPairing[] {
  if (advancersPerGroup === 0) return [];
  if (advancersPerGroup === 2) return PRESET_SINGLE_GROUP_FINAL;
  throw new Error(
    "Grupo único: use 0 classificados (termina no grupo) ou 2 (final entre o 1º e o 2º).",
  );
}

/**
 * Posicionamento por grupo ("1º G1 × 2º G3"). Só existe para as configurações
 * verificadas no LetzPlay: 2 ou 4 grupos com 2 classificados, ou 3 classificados no total.
 */
export function resolveBracketPreset(
  numGroups: number,
  advancersPerGroup: number,
): BracketPairing[] {
  if (isSingleGroupMode(numGroups, advancersPerGroup)) return resolveSingleGroup(advancersPerGroup);
  if (numGroups === 2 && advancersPerGroup === 2) return PRESET_N2_ADV2;
  if (numGroups === 4 && advancersPerGroup === 2) return PRESET_N4_ADV2;
  const total = numGroups * advancersPerGroup;
  if (total === 3) return PRESET_BYE_3_QUALIFIERS;
  throw new Error(
    `Sem mapping explícito: posicionamento por grupo indisponível para ${numGroups} grupo(s) com ${advancersPerGroup} classificado(s) por grupo. Disponível só para 2 ou 4 grupos (2 classificados) ou 3 classificados no total. Use o ranking cruzado dos 1ºs colocados.`,
  );
}

type CrossSlot = { type: "first" | "second"; seed: number } | { type: "bye" };

const F = (seed: number): CrossSlot => ({ type: "first", seed });
const S = (seed: number): CrossSlot => ({ type: "second", seed });
const BYE: CrossSlot = { type: "bye" };

/**
 * Vagas da 1ª rodada, de cima para baixo, de 2 em 2 (cada par é um jogo).
 * Vem do protótipo Árbitro BT (KNOCKOUT_TEMPLATES) — 2 classificados por grupo.
 * seed = posição do grupo no ranking cruzado dos 1ºs colocados.
 */
export const CROSS_RANKING_TEMPLATES: Record<number, CrossSlot[]> = {
  2: [F(1), S(2), S(1), F(2)],
  3: [F(1), BYE, S(3), S(2), S(1), F(3), BYE, F(2)],
  // Confirmado pelo organizador (planilha "Chave com 4 grupos"): 1ºM×2ºdo3ºM, 4ºM×2ºdo2ºM, 2ºdo1ºM×3ºM, 2ºdo4ºM×2ºM.
  4: [F(1), S(3), F(4), S(2), S(1), F(3), S(4), F(2)],
  5: [F(1), BYE, S(4), S(5), F(3), BYE, BYE, S(2), F(5), BYE, BYE, F(4), S(1), S(3), BYE, F(2)],
  6: [F(1), BYE, S(6), S(2), F(4), BYE, S(3), F(5), F(6), S(4), BYE, F(3), S(5), S(1), BYE, F(2)],
  7: [F(1), BYE, S(7), S(2), F(4), S(6), S(3), F(5), F(6), S(4), S(5), F(3), F(7), S(1), BYE, F(2)],
  8: [F(1), S(7), F(8), S(2), F(4), S(6), S(3), F(5), F(6), S(4), S(5), F(3), F(7), S(1), S(8), F(2)],
};

export const BRACKET_SEEDING_LABEL: Record<BracketSeeding, string> = {
  BY_GROUP: "Por grupo (1º G1 × 2º G3)",
  CROSS_RANKING: "Ranking cruzado dos 1ºs (ex.: 1º melhor 1º × 2º do 3º melhor 1º)",
};

export const CROSS_RANKING_MIN_GROUPS = 2;
export const CROSS_RANKING_MAX_GROUPS = 8;

function crossLabel(slot: Exclude<CrossSlot, { type: "bye" }>): string {
  if (slot.type === "first") {
    return slot.seed === 1 ? "Melhor 1º colocado" : `${slot.seed}º melhor 1º colocado`;
  }
  return slot.seed === 1 ? "2º do melhor 1º" : `2º do ${slot.seed}º melhor 1º`;
}

function roundWinnerLabel(matchesInRound: number, position: number, round: number): string {
  const name =
    matchesInRound === 8 ? "R16" : matchesInRound === 4 ? "QF" : matchesInRound === 2 ? "SF" : `R${round}`;
  return `Vencedor ${name} ${position}`;
}

/** Monta a chave completa (todas as rodadas) a partir de um template de vagas. */
export function buildCrossRankingPairings(numGroups: number): BracketPairing[] {
  const slots = CROSS_RANKING_TEMPLATES[numGroups];
  if (!slots) {
    throw new Error(
      `Ranking cruzado indisponível para ${numGroups} grupo(s). Use entre ${CROSS_RANKING_MIN_GROUPS} e ${CROSS_RANKING_MAX_GROUPS} grupos.`,
    );
  }
  const toSide = (slot: CrossSlot): BracketSideRef =>
    slot.type === "bye"
      ? { kind: "bye", label: "BYE" }
      : {
          kind: "cross_rank",
          place: slot.type === "first" ? 1 : 2,
          seed: slot.seed,
          label: crossLabel(slot),
        };

  const pairings: BracketPairing[] = [];
  for (let i = 0; i < slots.length; i += 2) {
    pairings.push({
      round: 1,
      position: i / 2 + 1,
      sideA: toSide(slots[i]),
      sideB: toSide(slots[i + 1]),
    });
  }
  let previousCount = slots.length / 2;
  let round = 2;
  while (previousCount > 1) {
    const count = previousCount / 2;
    for (let position = 1; position <= count; position += 1) {
      const fromA = position * 2 - 1;
      const fromB = position * 2;
      pairings.push({
        round,
        position,
        sideA: {
          kind: "winner",
          fromPosition: fromA,
          label: roundWinnerLabel(previousCount, fromA, round - 1),
        },
        sideB: {
          kind: "winner",
          fromPosition: fromB,
          label: roundWinnerLabel(previousCount, fromB, round - 1),
        },
      });
    }
    previousCount = count;
    round += 1;
  }
  return pairings;
}

export function pairingsUseCrossRanking(pairings: BracketPairing[]): boolean {
  return pairings.some((p) => p.sideA.kind === "cross_rank" || p.sideB.kind === "cross_rank");
}

/** Quais regras de posicionamento a configuração aceita (para a UI e a validação). */
export function availableBracketSeedings(
  numGroups: number,
  advancersPerGroup: number,
): Record<BracketSeeding, { available: boolean; reason?: string }> {
  if (isSingleGroupMode(numGroups, advancersPerGroup)) {
    // A regra de posicionamento é irrelevante num grupo único.
    return { BY_GROUP: { available: true }, CROSS_RANKING: { available: true } };
  }
  const byGroup = (() => {
    try {
      resolveBracketPreset(numGroups, advancersPerGroup);
      return { available: true };
    } catch {
      return {
        available: false,
        reason:
          "Posicionamento por grupo só está verificado para 2 ou 4 grupos (2 classificados) ou 3 classificados no total.",
      };
    }
  })();
  const total = numGroups * advancersPerGroup;
  const cross =
    advancersPerGroup === 2 &&
    numGroups >= CROSS_RANKING_MIN_GROUPS &&
    numGroups <= CROSS_RANKING_MAX_GROUPS
      ? { available: true }
      : total === 3
        ? { available: true }
        : {
            available: false,
            reason: `Ranking cruzado exige 2 classificados por grupo e de ${CROSS_RANKING_MIN_GROUPS} a ${CROSS_RANKING_MAX_GROUPS} grupos.`,
          };
  return { BY_GROUP: byGroup, CROSS_RANKING: cross };
}

/**
 * Escolhe as vagas da chave conforme a regra da categoria.
 * Com 3 classificados no total não há ranking a cruzar: vale o preset com BYE.
 */
export function resolveBracketPairings(
  numGroups: number,
  advancersPerGroup: number,
  seeding: BracketSeeding = "BY_GROUP",
): BracketPairing[] {
  // Grupo único não tem o que posicionar: a regra de chave não se aplica.
  if (isSingleGroupMode(numGroups, advancersPerGroup)) return resolveSingleGroup(advancersPerGroup);
  if (numGroups * advancersPerGroup === 3) return PRESET_BYE_3_QUALIFIERS;
  if (seeding === "CROSS_RANKING") {
    if (advancersPerGroup !== 2) {
      throw new Error("Ranking cruzado exige 2 classificados por grupo.");
    }
    return buildCrossRankingPairings(numGroups);
  }
  return resolveBracketPreset(numGroups, advancersPerGroup);
}

/** Troca as vagas "k-ésimo melhor 1º" pelo grupo real, já com o ranking resolvido. */
export function bindCrossRanking(
  pairings: BracketPairing[],
  orderedGroupIndexes: number[],
): BracketPairing[] {
  const bind = (side: BracketSideRef): BracketSideRef => {
    if (side.kind !== "cross_rank") return side;
    const groupIndex = orderedGroupIndexes[side.seed - 1];
    if (groupIndex === undefined) {
      throw new Error(`Sem grupo para o ${side.seed}º melhor 1º colocado.`);
    }
    return { kind: "group_rank", groupIndex, rank: side.place, label: side.label };
  };
  return pairings.map((p) => ({ ...p, sideA: bind(p.sideA), sideB: bind(p.sideB) }));
}

export interface FirstPlaceRanking {
  /** Ids dos grupos, do melhor 1º para o pior. */
  orderedGroupIds: string[];
  /** Grupos empatados em todos os critérios e ainda sem sorteio. */
  tiedGroupIds: string[][];
  /** Empates em todos os critérios que já foram separados pelo sorteio gravado. */
  resolvedByDrawGroupIds: string[][];
  /** true quando os grupos têm tamanhos diferentes ou há W.O. */
  usedPercentages: boolean;
  /** Texto do critério usado, para exibir ao organizador. */
  criteria: string;
}

function compareDesc(a: number | null, b: number | null): number {
  const av = a ?? Number.NEGATIVE_INFINITY;
  const bv = b ?? Number.NEGATIVE_INFINITY;
  if (av === bv) return 0;
  return bv > av ? 1 : -1;
}

/**
 * Ranqueia os 1ºs colocados entre os grupos.
 * Critério igual ao do protótipo: vitórias, saldo de sets, saldo de games.
 * Se os grupos têm tamanhos diferentes ou houve W.O., o número de jogos deixa de ser
 * comparável e valem o aproveitamento de sets e o de games.
 */
export function rankFirstPlaces(args: {
  groups: Group[];
  standingsByGroup: Map<string, StandingRow[]>;
  matches: Match[];
  tieDrawOrder?: string[];
}): FirstPlaceRanking {
  const groups = [...args.groups].sort((a, b) => a.index - b.index);
  const groupIds = new Set(groups.map((g) => g.id));
  const sizes = new Set(groups.map((g) => (args.standingsByGroup.get(g.id) ?? []).length));
  const hasWo = args.matches.some(
    (m) => m.phase === "GROUP" && m.groupId && groupIds.has(m.groupId) && m.score?.woSide,
  );
  const usedPercentages = sizes.size > 1 || hasWo;

  const firsts = groups.map((g) => ({
    groupId: g.id,
    row: (args.standingsByGroup.get(g.id) ?? []).find((r) => r.rank === 1),
  }));

  const compare = (
    a: (typeof firsts)[number],
    b: (typeof firsts)[number],
  ): number => {
    if (!a.row || !b.row) return 0;
    if (usedPercentages) {
      return (
        compareDesc(a.row.setPct, b.row.setPct) || compareDesc(a.row.gamePct, b.row.gamePct)
      );
    }
    return (
      compareDesc(a.row.wins, b.row.wins) ||
      compareDesc(a.row.setDiff, b.row.setDiff) ||
      compareDesc(a.row.gameDiff, b.row.gameDiff)
    );
  };

  const sorted = [...firsts].sort(compare);
  const orderedGroupIds: string[] = [];
  const tiedGroupIds: string[][] = [];
  const resolvedByDrawGroupIds: string[][] = [];
  let i = 0;
  while (i < sorted.length) {
    let j = i + 1;
    while (j < sorted.length && compare(sorted[i], sorted[j]) === 0) j += 1;
    const cluster = sorted.slice(i, j).map((x) => x.groupId);
    if (cluster.length > 1) {
      const drawn = args.tieDrawOrder;
      if (drawn && cluster.every((id) => drawn.includes(id))) {
        cluster.sort((a, b) => drawn.indexOf(a) - drawn.indexOf(b));
        resolvedByDrawGroupIds.push([...cluster]);
      } else {
        tiedGroupIds.push(cluster);
      }
    }
    orderedGroupIds.push(...cluster);
    i = j;
  }

  return {
    orderedGroupIds,
    tiedGroupIds,
    resolvedByDrawGroupIds,
    usedPercentages,
    criteria: usedPercentages
      ? "aproveitamento de sets e de games (grupos de tamanhos diferentes ou W.O.)"
      : "vitórias, saldo de sets e saldo de games",
  };
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
      // cross_rank precisa ser resolvido antes (bindCrossRanking)
      if (side.kind !== "group_rank") return undefined;
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
