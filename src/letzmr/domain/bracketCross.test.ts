import { describe, expect, it } from "vitest";
import {
  CROSS_RANKING_TEMPLATES,
  PRESET_BYE_3_QUALIFIERS,
  PRESET_N2_ADV2,
  PRESET_N4_ADV2,
  availableBracketSeedings,
  bindCrossRanking,
  buildCrossRankingPairings,
  buildKoMatchesFromPreset,
  pairingsUseCrossRanking,
  rankFirstPlaces,
  resolveBracketPairings,
} from "./bracket";
import type { Group, Match, StandingRow } from "./types";

describe("regra por grupo (LetzPlay) continua igual", () => {
  it("usa os presets verificados", () => {
    expect(resolveBracketPairings(2, 2, "BY_GROUP")).toBe(PRESET_N2_ADV2);
    expect(resolveBracketPairings(4, 2, "BY_GROUP")).toBe(PRESET_N4_ADV2);
    expect(resolveBracketPairings(1, 3, "BY_GROUP")).toBe(PRESET_BYE_3_QUALIFIERS);
  });

  it("recusa 3 grupos em vez de inventar posições", () => {
    expect(() => resolveBracketPairings(3, 2, "BY_GROUP")).toThrow(/ranking cruzado/i);
    expect(availableBracketSeedings(3, 2).BY_GROUP.available).toBe(false);
    expect(availableBracketSeedings(3, 2).CROSS_RANKING.available).toBe(true);
  });
});

describe("regra de ranking cruzado (protótipo)", () => {
  it.each([2, 3, 4, 5, 6, 7, 8])("monta chave válida para %i grupos", (n) => {
    const pairings = buildCrossRankingPairings(n);
    expect(pairingsUseCrossRanking(pairings)).toBe(true);

    const round1 = pairings.filter((p) => p.round === 1);
    const sides = round1.flatMap((p) => [p.sideA, p.sideB]);
    const firsts = sides.flatMap((s) => (s.kind === "cross_rank" && s.place === 1 ? [s.seed] : []));
    const seconds = sides.flatMap((s) => (s.kind === "cross_rank" && s.place === 2 ? [s.seed] : []));
    const byes = sides.filter((s) => s.kind === "bye").length;
    const size = sides.length;

    expect([...firsts].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i + 1));
    expect([...seconds].sort((a, b) => a - b)).toEqual(Array.from({ length: n }, (_, i) => i + 1));
    expect(byes).toBe(size - 2 * n);
    expect(Math.log2(size) % 1).toBe(0);

    for (const p of round1) {
      // nunca o 1º e o 2º do mesmo grupo se enfrentam na 1ª rodada
      if (p.sideA.kind === "cross_rank" && p.sideB.kind === "cross_rank") {
        expect(p.sideA.seed === p.sideB.seed).toBe(false);
      }
      // nunca BYE contra BYE
      expect(p.sideA.kind === "bye" && p.sideB.kind === "bye").toBe(false);
    }
  });

  it("4 grupos: 1º melhor 1º enfrenta o 2º do 4º melhor 1º", () => {
    const pairings = buildCrossRankingPairings(4);
    expect(pairings[0].sideA).toMatchObject({ place: 1, seed: 1, label: "Melhor 1º colocado" });
    expect(pairings[0].sideB).toMatchObject({ place: 2, seed: 4, label: "2º do 4º melhor 1º" });
    expect(pairings.filter((p) => p.round === 2)).toHaveLength(2);
    expect(pairings.filter((p) => p.round === 3)).toHaveLength(1);
  });

  it("exige 2 classificados por grupo e de 2 a 8 grupos", () => {
    expect(() => resolveBracketPairings(4, 1, "CROSS_RANKING")).toThrow(/2 classificados/);
    expect(() => buildCrossRankingPairings(9)).toThrow(/entre 2 e 8/);
    expect(Object.keys(CROSS_RANKING_TEMPLATES)).toHaveLength(7);
  });

  it("com 3 classificados no total não há o que ranquear: usa o preset com BYE", () => {
    expect(resolveBracketPairings(1, 3, "CROSS_RANKING")).toBe(PRESET_BYE_3_QUALIFIERS);
  });

  it("troca 'k-ésimo melhor 1º' pelo grupo real", () => {
    const bound = bindCrossRanking(buildCrossRankingPairings(4), [4, 3, 2, 1]);
    // melhor 1º = grupo 4; 2º do 4º melhor 1º = 2º do grupo 1
    expect(bound[0].sideA).toMatchObject({ kind: "group_rank", groupIndex: 4, rank: 1 });
    expect(bound[0].sideB).toMatchObject({ kind: "group_rank", groupIndex: 1, rank: 2 });
    expect(pairingsUseCrossRanking(bound)).toBe(false);
    const ko = buildKoMatchesFromPreset("c", buildCrossRankingPairings(3));
    expect(ko.filter((m) => m.status === "bye")).toHaveLength(2);
  });
});

function group(index: number): Group {
  return { id: `g${index}`, categoryId: "c", index, label: `Grupo ${index}` };
}

function first(
  groupId: string,
  data: Partial<StandingRow>,
): StandingRow {
  return {
    registrationId: `${groupId}-r1`,
    groupId,
    played: 2,
    wins: 2,
    losses: 0,
    setsFor: 2,
    setsAgainst: 0,
    gamesFor: 12,
    gamesAgainst: 4,
    setDiff: 2,
    gameDiff: 8,
    setPct: 100,
    gamePct: 75,
    rank: 1,
    ...data,
  };
}

function second(groupId: string): StandingRow {
  return first(groupId, { registrationId: `${groupId}-r2`, wins: 1, losses: 1, rank: 2 });
}

describe("ranking dos 1ºs colocados", () => {
  const groups = [group(1), group(2), group(3)];

  const standings = (gameDiffs: number[]) =>
    new Map(
      groups.map((g, i) => [g.id, [first(g.id, { gameDiff: gameDiffs[i] }), second(g.id)]]),
    );

  it("ordena por vitórias, saldo de sets e saldo de games", () => {
    const r = rankFirstPlaces({ groups, standingsByGroup: standings([4, 9, 6]), matches: [] });
    expect(r.orderedGroupIds).toEqual(["g2", "g3", "g1"]);
    expect(r.tiedGroupIds).toEqual([]);
    expect(r.usedPercentages).toBe(false);
  });

  it("empate em tudo fica pendente até sortear", () => {
    const pending = rankFirstPlaces({ groups, standingsByGroup: standings([5, 5, 7]), matches: [] });
    expect(pending.orderedGroupIds[0]).toBe("g3");
    expect(pending.tiedGroupIds).toEqual([["g1", "g2"]]);

    const drawn = rankFirstPlaces({
      groups,
      standingsByGroup: standings([5, 5, 7]),
      matches: [],
      tieDrawOrder: ["g2", "g3", "g1"],
    });
    expect(drawn.tiedGroupIds).toEqual([]);
    expect(drawn.orderedGroupIds).toEqual(["g3", "g2", "g1"]);
  });

  it("com grupos de tamanhos diferentes compara por aproveitamento", () => {
    const map = new Map<string, StandingRow[]>([
      ["g1", [first("g1", { setPct: 80, gamePct: 60 }), second("g1")]],
      ["g2", [first("g2", { setPct: 100, gamePct: 55 }), second("g2"), second("g2")]],
      ["g3", [first("g3", { setPct: 80, gamePct: 70 }), second("g3")]],
    ]);
    const r = rankFirstPlaces({ groups, standingsByGroup: map, matches: [] });
    expect(r.usedPercentages).toBe(true);
    expect(r.orderedGroupIds).toEqual(["g2", "g3", "g1"]);
  });

  it("um W.O. no grupo também troca para aproveitamento", () => {
    const wo = {
      id: "m",
      categoryId: "c",
      phase: "GROUP",
      round: 1,
      position: 1,
      groupId: "g1",
      status: "wo",
      score: { sets: [], woSide: "A", recordedAt: "" },
    } as Match;
    const r = rankFirstPlaces({ groups, standingsByGroup: standings([4, 9, 6]), matches: [wo] });
    expect(r.usedPercentages).toBe(true);
  });
});
