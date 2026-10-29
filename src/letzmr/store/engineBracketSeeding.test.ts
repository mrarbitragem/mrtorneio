import { describe, expect, it } from "vitest";
import type { Engine } from "./engine";
import { createEngine } from "./engine";
import { emptyStore } from "./localStore";
import type { BracketSeeding } from "../domain/types";

function setup(numGroups: number, seeding: BracketSeeding) {
  const eng = createEngine(emptyStore(), { autoLocalPersist: false });
  const t = eng.createTournament("Teste");
  const cat = eng.createCategory({
    tournamentId: t.id,
    name: "Cat",
    format: "GROUP_KO",
    entryType: "singles",
    numGroups,
    advancersPerGroup: 2,
    bracketSeeding: seeding,
  });
  for (let i = 0; i < numGroups * 3; i += 1) {
    eng.register({ categoryId: cat.id, names: [`Atleta ${String(i).padStart(2, "0")}`] });
  }
  eng.generateDraw(cat.id, () => 0);
  return { eng, cat };
}

/** O de menor índice de inscrição vence; o placar do perdedor varia por grupo. */
function playGroups(
  eng: Engine,
  categoryId: string,
  loserGames: (groupIndex: number) => number,
  only?: number[],
) {
  const store = eng.getStore();
  const order = new Map(store.registrations.map((r, i) => [r.id, i]));
  for (const g of store.groups.filter((x) => x.categoryId === categoryId)) {
    if (only && !only.includes(g.index)) continue;
    for (const m of store.matches.filter((x) => x.groupId === g.id)) {
      const aWins = (order.get(m.sideAId!) ?? 0) < (order.get(m.sideBId!) ?? 0);
      const lose = loserGames(g.index);
      eng.recordScore(m.id, [{ gamesA: aWins ? 6 : lose, gamesB: aWins ? lose : 6 }]);
    }
  }
}

function groupOf(eng: Engine, regId?: string): number | undefined {
  const store = eng.getStore();
  const gid = store.registrations.find((r) => r.id === regId)?.groupId;
  return store.groups.find((g) => g.id === gid)?.index;
}

describe("criação de categoria com regra de chave", () => {
  it("recusa posicionamento por grupo para 3 grupos", () => {
    const eng = createEngine(emptyStore(), { autoLocalPersist: false });
    const t = eng.createTournament("T");
    expect(() =>
      eng.createCategory({
        tournamentId: t.id,
        name: "C",
        format: "GROUP_KO",
        entryType: "singles",
        numGroups: 3,
        advancersPerGroup: 2,
        bracketSeeding: "BY_GROUP",
      }),
    ).toThrow(/ranking cruzado/i);
  });

  it("assume por grupo quando a regra não é informada", () => {
    const eng = createEngine(emptyStore(), { autoLocalPersist: false });
    const t = eng.createTournament("T");
    const c = eng.createCategory({
      tournamentId: t.id,
      name: "C",
      format: "GROUP_KO",
      entryType: "singles",
      numGroups: 2,
      advancersPerGroup: 2,
    });
    expect(c.bracketSeeding).toBe("BY_GROUP");
  });
});

describe("chave por ranking cruzado (4 grupos)", () => {
  it("melhor 1º × 2º do 4º melhor 1º", () => {
    const { eng, cat } = setup(4, "CROSS_RANKING");
    // grupo 4 tem o melhor saldo de games, grupo 1 o pior
    playGroups(eng, cat.id, (g) => 5 - g);
    eng.materializeBracket(cat.id);

    const qf = eng
      .getStore()
      .matches.filter((m) => m.categoryId === cat.id && m.phase === "KO" && m.round === 1)
      .sort((a, b) => a.position - b.position);
    expect(qf).toHaveLength(4);
    // Ranking dos 1ºs: F1=G4, F2=G3, F3=G2, F4=G1 (o 2º de cada grupo segue o seu 1º)
    // QF1: F1 × S4 = 1º G4 × 2º G1 | QF2: F3 × S2 = 1º G2 × 2º G3
    // QF3: S1 × F4 = 2º G4 × 1º G1 | QF4: S3 × F2 = 2º G2 × 1º G3
    const rankOf = (regId?: string) =>
      eng.getStore().registrations.find((r) => r.id === regId) &&
      eng.getGroupStandings(
        eng.getStore().registrations.find((r) => r.id === regId)!.groupId!,
      ).ranked.find((r) => r.registrationId === regId)?.rank;
    const slot = (regId?: string) => `${groupOf(eng, regId)}-${rankOf(regId)}`;
    expect(qf.map((m) => [slot(m.sideAId), slot(m.sideBId)])).toEqual([
      ["4-1", "1-2"],
      ["2-1", "3-2"],
      ["4-2", "1-1"],
      ["2-2", "3-1"],
    ]);
    expect(qf[0].placeholderA).toBeUndefined();
  });

  it("não monta a chave enquanto algum grupo não terminou", () => {
    const { eng, cat } = setup(4, "CROSS_RANKING");
    playGroups(eng, cat.id, (g) => 5 - g, [1, 2, 3]);
    expect(() => eng.materializeBracket(cat.id)).toThrow(/conclua todos os jogos/i);
  });

  it("empate total entre 1ºs exige sorteio e depois monta a chave", () => {
    const { eng, cat } = setup(4, "CROSS_RANKING");
    playGroups(eng, cat.id, () => 3);
    expect(() => eng.materializeBracket(cat.id)).toThrow(/Empate entre 1ºs/);
    expect(eng.getFirstPlaceRanking(cat.id).tiedGroupIds.length).toBeGreaterThan(0);

    eng.drawFirstPlaceTie(cat.id, () => 0);
    expect(eng.getFirstPlaceRanking(cat.id).tiedGroupIds).toEqual([]);
    eng.materializeBracket(cat.id);
    const qf = eng
      .getStore()
      .matches.filter((m) => m.categoryId === cat.id && m.phase === "KO" && m.round === 1);
    expect(qf.every((m) => m.sideAId && m.sideBId)).toBe(true);
  });

  it("sorteio fica gravado e só refaz por ação explícita", () => {
    const { eng, cat } = setup(4, "CROSS_RANKING");
    playGroups(eng, cat.id, () => 3);
    const first = eng.drawFirstPlaceTie(cat.id, () => 0);
    const saved = eng.getStore().categories.find((c) => c.id === cat.id)!;
    expect(saved.crossTieDrawOrder).toEqual(first);
    expect(saved.crossTieDrawnAt).toBeTruthy();

    // sem pedir explicitamente, não sorteia de novo
    expect(() => eng.drawFirstPlaceTie(cat.id, () => 0.99)).toThrow(/já está gravado/i);
    expect(eng.getStore().categories.find((c) => c.id === cat.id)!.crossTieDrawOrder).toEqual(first);
    expect(eng.getFirstPlaceRanking(cat.id).resolvedByDrawGroupIds.length).toBeGreaterThan(0);

    // gravar a chave e consultar não alteram o sorteio
    eng.materializeBracket(cat.id);
    expect(eng.getStore().categories.find((c) => c.id === cat.id)!.crossTieDrawOrder).toEqual(first);

    // ação explícita refaz e remonta a chave com a nova ordem
    const second = eng.drawFirstPlaceTie(cat.id, () => 0.99, { redo: true });
    expect(second).not.toEqual(first);
    const r1 = eng
      .getStore()
      .matches.filter((m) => m.categoryId === cat.id && m.phase === "KO" && m.round === 1);
    expect(r1.every((m) => m.sideAId && m.sideBId)).toBe(true);
    const rankedFirsts = eng.getFirstPlaceRanking(cat.id).orderedGroupIds;
    const bestFirstGroup = eng.getStore().groups.find((g) => g.id === rankedFirsts[0])!.index;
    const qf1 = r1.sort((a, b) => a.position - b.position)[0];
    expect(groupOf(eng, qf1.sideAId)).toBe(bestFirstGroup);
  });

  it("não refaz o sorteio se a eliminatória já tem resultado", () => {
    const { eng, cat } = setup(4, "CROSS_RANKING");
    playGroups(eng, cat.id, () => 3);
    eng.drawFirstPlaceTie(cat.id, () => 0);
    eng.materializeBracket(cat.id);
    const qf = eng
      .getStore()
      .matches.find((m) => m.categoryId === cat.id && m.phase === "KO" && m.round === 1)!;
    eng.recordScore(qf.id, [{ gamesA: 6, gamesB: 2 }]);
    expect(() => eng.drawFirstPlaceTie(cat.id, () => 0.99, { redo: true })).toThrow(
      /resultados lançados/i,
    );
  });

  it("não sorteia quando não há empate entre 1ºs", () => {
    const { eng, cat } = setup(4, "CROSS_RANKING");
    playGroups(eng, cat.id, (g) => 5 - g);
    expect(() => eng.drawFirstPlaceTie(cat.id, () => 0)).toThrow(/Não há empate/i);
  });

  it("sorteio de desempate só existe na regra de ranking cruzado", () => {
    const { eng, cat } = setup(2, "BY_GROUP");
    expect(() => eng.drawFirstPlaceTie(cat.id)).toThrow(/por grupo/i);
  });
});

describe("cancelar resultado compara a ordem dos 1ºs", () => {
  /** Jogo do grupo 4 entre o 1º e o 3º colocado: mantém os 2 classificados, mas derruba o 1º. */
  function firstVsThird(eng: Engine, categoryId: string) {
    const g4 = eng.getStore().groups.find((g) => g.categoryId === categoryId && g.index === 4)!;
    const ranked = eng.getGroupStandings(g4.id).ranked;
    const first = ranked.find((r) => r.rank === 1)!.registrationId;
    const third = ranked.find((r) => r.rank === 3)!.registrationId;
    return eng
      .getStore()
      .matches.find(
        (m) =>
          m.groupId === g4.id &&
          [m.sideAId, m.sideBId].includes(first) &&
          [m.sideAId, m.sideBId].includes(third),
      )!;
  }

  it("ranking cruzado: avisa quando só a ordem dos 1ºs muda (mesmos classificados)", () => {
    const { eng, cat } = setup(4, "CROSS_RANKING");
    playGroups(eng, cat.id, (g) => 5 - g);
    eng.materializeBracket(cat.id);

    const impact = eng.previewCancelImpact(firstVsThird(eng, cat.id).id);
    expect(impact.kind).toBe("advancement_mismatch");
    expect(impact.divergenceWarning).toBe(true);
    expect(impact.message).toMatch(/ordem dos 1ºs/i);
  });

  it("mesmo cenário por grupo não acusa mudança de ordem dos 1ºs", () => {
    const { eng, cat } = setup(4, "BY_GROUP");
    playGroups(eng, cat.id, (g) => 5 - g);
    eng.materializeBracket(cat.id);

    const impact = eng.previewCancelImpact(firstVsThird(eng, cat.id).id);
    expect(impact.message).not.toMatch(/ordem dos 1ºs/i);
    expect(impact.kind).toBe("score_only");
  });
});

describe("chave por ranking cruzado com BYE (3 grupos)", () => {
  it("gera 2 BYEs na 1ª rodada e avança os melhores 1ºs", () => {
    const { eng, cat } = setup(3, "CROSS_RANKING");
    playGroups(eng, cat.id, (g) => 4 - g);
    eng.materializeBracket(cat.id);
    const r1 = eng
      .getStore()
      .matches.filter((m) => m.categoryId === cat.id && m.phase === "KO" && m.round === 1)
      .sort((a, b) => a.position - b.position);
    expect(r1).toHaveLength(4);
    const byes = r1.filter((m) => m.status === "bye");
    expect(byes).toHaveLength(2);
    // o melhor 1º (grupo 3) e o 3º melhor 1º já avançam, sem jogar
    const ko2 = eng
      .getStore()
      .matches.filter((m) => m.categoryId === cat.id && m.phase === "KO" && m.round === 2);
    expect(ko2).toHaveLength(2);
    expect(groupOf(eng, ko2[0].sideAId)).toBe(3);
  });
});

describe("regra por grupo segue valendo", () => {
  it("2 grupos: 1º G1 × 2º G2", () => {
    const { eng, cat } = setup(2, "BY_GROUP");
    playGroups(eng, cat.id, () => 3);
    eng.materializeBracket(cat.id);
    const sf = eng
      .getStore()
      .matches.filter((m) => m.categoryId === cat.id && m.phase === "KO" && m.round === 1)
      .sort((a, b) => a.position - b.position);
    expect([groupOf(eng, sf[0].sideAId), groupOf(eng, sf[0].sideBId)]).toEqual([1, 2]);
    expect([groupOf(eng, sf[1].sideAId), groupOf(eng, sf[1].sideBId)]).toEqual([1, 2]);
  });
});
