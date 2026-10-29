import { describe, expect, it } from "vitest";
import type { Engine } from "./engine";
import { createEngine } from "./engine";
import { emptyStore } from "./localStore";
import type { BracketSeeding } from "../domain/types";

/** Joga tudo o que está pronto; o lado A vence com placar que varia pela posição. */
function playAllReady(eng: Engine, categoryId: string, phase: "GROUP" | "KO") {
  for (let guard = 0; guard < 200; guard += 1) {
    const next = eng
      .getStore()
      .matches.find(
        (m) =>
          m.categoryId === categoryId &&
          m.phase === phase &&
          m.sideAId &&
          m.sideBId &&
          m.status !== "played" &&
          m.status !== "wo" &&
          m.status !== "bye",
      );
    if (!next) return;
    const lose = (next.position * 2 + next.round) % 5;
    eng.recordScore(next.id, [{ gamesA: 6, gamesB: lose }]);
  }
  throw new Error("loop de jogos não terminou");
}

function build(opts: {
  numGroups: number;
  advancersPerGroup: number;
  pairs: number;
  seeding?: BracketSeeding;
}) {
  const eng = createEngine(emptyStore(), { autoLocalPersist: false });
  const t = eng.createTournament("Estreia");
  const cat = eng.createCategory({
    tournamentId: t.id,
    name: "Categoria",
    format: "GROUP_KO",
    entryType: "doubles",
    numGroups: opts.numGroups,
    advancersPerGroup: opts.advancersPerGroup,
    bracketSeeding: opts.seeding,
  });
  for (let i = 0; i < opts.pairs; i += 1) {
    eng.register({ categoryId: cat.id, names: [`Atleta ${i}A`, `Atleta ${i}B`] });
  }
  eng.generateDraw(cat.id);
  return { eng, cat };
}

describe("torneio completo até o campeão", () => {
  for (const seeding of ["BY_GROUP", "CROSS_RANKING"] as const) {
    it(`4 grupos, 14 duplas (grupos 4-4-3-3), regra ${seeding}`, () => {
      const { eng, cat } = build({ numGroups: 4, advancersPerGroup: 2, pairs: 14, seeding });
      const groups = eng.getStore().groups.filter((g) => g.categoryId === cat.id);
      const sizes = groups
        .map((g) => eng.getStore().registrations.filter((r) => r.groupId === g.id).length)
        .sort();
      expect(sizes).toEqual([3, 3, 4, 4]);

      playAllReady(eng, cat.id, "GROUP");
      // desempates residuais por sorteio, se houver
      for (const g of groups) {
        if (eng.getGroupStandings(g.id).residualPending.length) eng.applyResidualDraw(g.id);
      }
      try {
        eng.materializeBracket(cat.id);
      } catch (e) {
        // empate total entre 1ºs só existe na regra cruzada
        if (seeding !== "CROSS_RANKING") throw e;
        eng.drawFirstPlaceTie(cat.id);
        eng.materializeBracket(cat.id);
      }
      const round1 = eng
        .getStore()
        .matches.filter((m) => m.categoryId === cat.id && m.phase === "KO" && m.round === 1);
      expect(round1).toHaveLength(4);
      expect(round1.every((m) => m.sideAId && m.sideBId)).toBe(true);

      for (let i = 0; i < 4; i += 1) playAllReady(eng, cat.id, "KO");
      const ko = eng.getStore().matches.filter((m) => m.categoryId === cat.id && m.phase === "KO");
      const final = ko.find((m) => m.round === 3)!;
      expect(final.status).toBe("played");
      expect(final.winnerRegistrationId).toBeTruthy();
      expect(ko.every((m) => m.status === "played")).toBe(true);
    });
  }

  it("grupo único de 5 duplas termina no grupo", () => {
    const { eng, cat } = build({ numGroups: 1, advancersPerGroup: 0, pairs: 5 });
    playAllReady(eng, cat.id, "GROUP");
    const g = eng.getStore().groups.find((x) => x.categoryId === cat.id)!;
    const { ranked, residualPending } = eng.getGroupStandings(g.id);
    expect(residualPending).toEqual([]);
    expect(ranked).toHaveLength(5);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5]);
    expect(eng.getStore().matches.filter((m) => m.categoryId === cat.id && m.phase === "KO")).toEqual(
      [],
    );
  });

  it("grupo único de 5 duplas com final entre o 1º e o 2º", () => {
    const { eng, cat } = build({ numGroups: 1, advancersPerGroup: 2, pairs: 5 });
    playAllReady(eng, cat.id, "GROUP");
    const g = eng.getStore().groups.find((x) => x.categoryId === cat.id)!;
    if (eng.getGroupStandings(g.id).residualPending.length) eng.applyResidualDraw(g.id);
    eng.materializeBracket(cat.id);
    playAllReady(eng, cat.id, "KO");
    const final = eng.getStore().matches.find((m) => m.categoryId === cat.id && m.phase === "KO")!;
    expect(final.status).toBe("played");
    expect(final.winnerRegistrationId).toBeTruthy();
  });
});

describe("excluir torneio", () => {
  it("remove só o torneio escolhido e o que depende dele", () => {
    const eng = createEngine(emptyStore(), { autoLocalPersist: false });
    const keep = eng.createTournament("Fica");
    const drop = eng.createTournament("Sai");
    const mk = (tid: string, names: string[][]) => {
      const c = eng.createCategory({
        tournamentId: tid,
        name: "C",
        format: "GROUP_KO",
        entryType: "doubles",
        numGroups: 1,
        advancersPerGroup: 0,
      });
      names.forEach((n) => eng.register({ categoryId: c.id, names: n }));
      eng.generateDraw(c.id);
      return c;
    };
    const keepCat = mk(keep.id, [["Ana", "Bia"], ["Cris", "Duda"], ["Eva", "Fabi"]]);
    const dropCat = mk(drop.id, [["Ana", "Bia"], ["Gabi", "Helo"], ["Ivo", "Jo"]]);
    eng.setPublished(dropCat.id, true);

    const res = eng.deleteTournament(drop.id);
    expect(res.categoryIds).toEqual([dropCat.id]);
    expect(res.publishedCategoryIds).toEqual([dropCat.id]);

    const s = eng.getStore();
    expect(s.tournaments.map((t) => t.id)).toEqual([keep.id]);
    expect(s.categories.map((c) => c.id)).toEqual([keepCat.id]);
    expect(s.registrations.every((r) => r.categoryId === keepCat.id)).toBe(true);
    expect(s.matches.every((m) => m.categoryId === keepCat.id)).toBe(true);
    expect(s.groups.every((g) => g.categoryId === keepCat.id)).toBe(true);
    // atletas de outro torneio ficam; os exclusivos saem
    const names = s.athletes.map((a) => a.displayName).sort();
    expect(names).toEqual(["Ana", "Bia", "Cris", "Duda", "Eva", "Fabi"]);
    expect(() => eng.deleteTournament("nao-existe")).toThrow(/não encontrado/);
  });
});

describe("inscrição", () => {
  it("recusa nome vazio e aparar espaços", () => {
    const eng = createEngine(emptyStore(), { autoLocalPersist: false });
    const t = eng.createTournament("T");
    const c = eng.createCategory({
      tournamentId: t.id,
      name: "C",
      format: "GROUP_KO",
      entryType: "doubles",
      numGroups: 1,
      advancersPerGroup: 0,
    });
    expect(() => eng.register({ categoryId: c.id, names: ["", "Bia"] })).toThrow(/2 atletas/);
    expect(() => eng.register({ categoryId: c.id, names: ["  ", "Bia"] })).toThrow(/2 atletas/);
    const r = eng.register({ categoryId: c.id, names: ["  Ana ", "Bia"] });
    expect(r.displayName).toBe("Ana / Bia");
  });
});

describe("remover inscrição", () => {
  it("só antes do sorteio", () => {
    const eng = createEngine(emptyStore(), { autoLocalPersist: false });
    const t = eng.createTournament("T");
    const c = eng.createCategory({
      tournamentId: t.id,
      name: "C",
      format: "GROUP_KO",
      entryType: "doubles",
      numGroups: 1,
      advancersPerGroup: 0,
    });
    const a = eng.register({ categoryId: c.id, names: ["Ana", "Bia"] });
    eng.register({ categoryId: c.id, names: ["Cris", "Duda"] });
    eng.register({ categoryId: c.id, names: ["Eva", "Fabi"] });
    eng.removeRegistration(a.id);
    expect(eng.getStore().registrations).toHaveLength(2);
    expect(eng.getStore().athletes.map((x) => x.displayName).sort()).toEqual([
      "Cris",
      "Duda",
      "Eva",
      "Fabi",
    ]);
    eng.generateDraw(c.id);
    const any = eng.getStore().registrations[0];
    expect(() => eng.removeRegistration(any.id)).toThrow(/sorteio/);
  });
});

describe("inscrição em lista", () => {
  function doublesCat() {
    const eng = createEngine(emptyStore(), { autoLocalPersist: false });
    const t = eng.createTournament("T");
    const c = eng.createCategory({
      tournamentId: t.id,
      name: "C",
      format: "GROUP_KO",
      entryType: "doubles",
      numGroups: 1,
      advancersPerGroup: 0,
    });
    return { eng, c };
  }

  it("inscreve toda a lista de uma vez", () => {
    const { eng, c } = doublesCat();
    const created = eng.registerMany(c.id, [
      ["Dilma", "Sueli"],
      ["Gisele", "Bia"],
      ["Renata", "Patricia"],
    ]);
    expect(created.map((r) => r.displayName)).toEqual([
      "Dilma / Sueli",
      "Gisele / Bia",
      "Renata / Patricia",
    ]);
    expect(eng.getStore().registrations).toHaveLength(3);
  });

  it("é tudo ou nada: uma linha inválida não inscreve ninguém", () => {
    const { eng, c } = doublesCat();
    expect(() =>
      eng.registerMany(c.id, [["Dilma", "Sueli"], ["Gisele"], ["Renata", "Patricia"]]),
    ).toThrow(/Linha 2.*2 nomes/);
    expect(eng.getStore().registrations).toHaveLength(0);
    expect(() => eng.registerMany(c.id, [])).toThrow(/vazia/);
  });
});
