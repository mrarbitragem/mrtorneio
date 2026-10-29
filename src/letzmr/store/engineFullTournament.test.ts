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
  const eng = createEngine(emptyStore());
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
    const eng = createEngine(emptyStore());
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
    const eng = createEngine(emptyStore());
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
    const eng = createEngine(emptyStore());
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
    const eng = createEngine(emptyStore());
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

describe("ajustar, refazer, limpar e excluir categoria", () => {
  const countOf = (eng: Engine, catId: string) => {
    const s = eng.getStore();
    return {
      groups: s.groups.filter((g) => g.categoryId === catId).length,
      matches: s.matches.filter((m) => m.categoryId === catId).length,
      regs: s.registrations.filter((r) => r.categoryId === catId).length,
    };
  };

  it("refazer o sorteio apaga placares e recria grupos com as mesmas inscrições", () => {
    const { eng, cat } = build({ numGroups: 2, advancersPerGroup: 2, pairs: 8 });
    playAllReady(eng, cat.id, "GROUP");
    expect(eng.getStore().matches.some((m) => m.status === "played")).toBe(true);
    eng.generateDraw(cat.id);
    expect(eng.getStore().matches.some((m) => m.status === "played")).toBe(false);
    expect(countOf(eng, cat.id).groups).toBe(2);
    expect(countOf(eng, cat.id).regs).toBe(8);
    expect(eng.getStore().registrations.every((r) => r.groupId)).toBe(true);
  });

  it("mudar a quantidade de grupos descarta o sorteio e permite sortear de novo", () => {
    const { eng, cat } = build({ numGroups: 2, advancersPerGroup: 2, pairs: 8 });
    playAllReady(eng, cat.id, "GROUP");
    const res = eng.configureCategory(cat.id, { numGroups: 4, advancersPerGroup: 2 });
    expect(res.drawDiscarded).toBe(true);
    expect(countOf(eng, cat.id)).toEqual({ groups: 0, matches: 0, regs: 8 });
    const after = eng.getStore().categories.find((c) => c.id === cat.id)!;
    expect(after.numGroups).toBe(4);
    expect(after.status).toBe("open");
    expect(eng.hasDraw(cat.id)).toBe(false);
    eng.generateDraw(cat.id);
    expect(countOf(eng, cat.id).groups).toBe(4);
  });

  it("configuração inválida não altera nada", () => {
    const { eng, cat } = build({ numGroups: 2, advancersPerGroup: 2, pairs: 8 });
    expect(() => eng.configureCategory(cat.id, { numGroups: 0, advancersPerGroup: 2 })).toThrow();
    expect(() => eng.configureCategory(cat.id, { numGroups: 9, advancersPerGroup: 2 })).toThrow();
    expect(eng.hasDraw(cat.id)).toBe(true);
    expect(eng.getStore().categories.find((c) => c.id === cat.id)!.numGroups).toBe(2);
  });

  it("de 2 grupos para grupo único (termina no grupo)", () => {
    const { eng, cat } = build({ numGroups: 2, advancersPerGroup: 2, pairs: 5 });
    eng.configureCategory(cat.id, { numGroups: 1, advancersPerGroup: 0 });
    eng.generateDraw(cat.id);
    const s = eng.getStore();
    expect(s.groups.filter((g) => g.categoryId === cat.id)).toHaveLength(1);
    expect(s.matches.filter((m) => m.categoryId === cat.id && m.phase === "KO")).toHaveLength(0);
    expect(s.matches.filter((m) => m.categoryId === cat.id)).toHaveLength(10);
  });

  it("limpar mantém as inscrições; limpar tudo remove inscrições e atletas órfãos", () => {
    const { eng, cat } = build({ numGroups: 2, advancersPerGroup: 2, pairs: 6 });
    eng.setPublished(cat.id, true);
    const r1 = eng.clearCategory(cat.id);
    expect(r1.wasPublished).toBe(true);
    expect(countOf(eng, cat.id)).toEqual({ groups: 0, matches: 0, regs: 6 });
    const c = eng.getStore().categories.find((x) => x.id === cat.id)!;
    expect(c.status).toBe("open");
    expect(c.published).toBe(false);
    expect(eng.getStore().registrations.every((r) => r.groupId === undefined)).toBe(true);

    eng.clearCategory(cat.id, { removeRegistrations: true });
    expect(countOf(eng, cat.id).regs).toBe(0);
    expect(eng.getStore().athletes).toHaveLength(0);
    expect(eng.getStore().categories.some((x) => x.id === cat.id)).toBe(true);
  });

  it("excluir categoria não mexe nas outras do torneio", () => {
    const { eng, cat } = build({ numGroups: 2, advancersPerGroup: 2, pairs: 6 });
    const other = eng.createCategory({
      tournamentId: cat.tournamentId,
      name: "Outra",
      format: "GROUP_KO",
      entryType: "doubles",
      numGroups: 1,
      advancersPerGroup: 0,
    });
    eng.register({ categoryId: other.id, names: ["Atleta 0A", "Zé"] });
    eng.register({ categoryId: other.id, names: ["Ana", "Bia"] });
    eng.generateDraw(other.id);
    eng.deleteCategory(cat.id);
    const s = eng.getStore();
    expect(s.categories.map((c) => c.id)).toEqual([other.id]);
    expect(s.registrations.every((r) => r.categoryId === other.id)).toBe(true);
    expect(s.groups.every((g) => g.categoryId === other.id)).toBe(true);
    expect(s.matches.every((m) => m.categoryId === other.id)).toBe(true);
    // "Atleta 0A" também jogava na outra categoria e continua cadastrado
    expect(s.athletes.some((a) => a.displayName === "Atleta 0A")).toBe(true);
    expect(s.athletes.some((a) => a.displayName === "Atleta 1A")).toBe(false);
  });
});

describe("programar todos os horários de um grupo", () => {
  it("programa só os jogos não disputados e preserva os já jogados", () => {
    const { eng, cat } = build({ numGroups: 1, advancersPerGroup: 0, pairs: 5 });
    const g = eng.getStore().groups.find((x) => x.categoryId === cat.id)!;
    const first = eng.getStore().matches.find((m) => m.groupId === g.id)!;
    eng.recordScore(first.id, [{ gamesA: 6, gamesB: 2 }]);
    const res = eng.scheduleGroup(g.id, {
      startAt: "2026-11-07T12:00:00.000Z",
      minutesPerMatch: 45,
      courts: ["Quadra 1"],
    });
    expect(res.scheduled).toBe(9);
    const ms = eng.getStore().matches.filter((m) => m.groupId === g.id);
    expect(ms.find((m) => m.id === first.id)!.scheduledAt).toBeUndefined();
    expect(ms.find((m) => m.id === first.id)!.status).toBe("played");
    const others = ms.filter((m) => m.id !== first.id);
    expect(others.every((m) => m.status === "scheduled" && m.court === "Quadra 1")).toBe(true);
    expect(new Set(others.map((m) => m.scheduledAt)).size).toBe(9);
  });

  it("recusa horário inválido e duração inválida", () => {
    const { eng, cat } = build({ numGroups: 1, advancersPerGroup: 0, pairs: 4 });
    const g = eng.getStore().groups.find((x) => x.categoryId === cat.id)!;
    expect(() => eng.scheduleGroup(g.id, { startAt: "", minutesPerMatch: 40 })).toThrow();
    expect(() =>
      eng.scheduleGroup(g.id, { startAt: "2026-11-07T12:00:00.000Z", minutesPerMatch: 0 }),
    ).toThrow();
  });
});

describe("todos os jogos do grupo no mesmo horário", () => {
  it("marca todos os jogos pendentes com o mesmo horário e preserva os disputados", () => {
    const { eng, cat } = build({ numGroups: 1, advancersPerGroup: 0, pairs: 4 });
    const g = eng.getStore().groups.find((x) => x.categoryId === cat.id)!;
    const first = eng.getStore().matches.find((m) => m.groupId === g.id)!;
    eng.recordScore(first.id, [{ gamesA: 6, gamesB: 1 }]);
    const res = eng.scheduleGroup(g.id, {
      startAt: "2026-11-07T12:00:00.000Z",
      minutesPerMatch: 1,
      sameTime: true,
      courts: ["Quadras 1 e 2"],
    });
    expect(res.scheduled).toBe(5);
    const others = eng.getStore().matches.filter((m) => m.groupId === g.id && m.id !== first.id);
    expect(new Set(others.map((m) => m.scheduledAt))).toEqual(
      new Set(["2026-11-07T12:00:00.000Z"]),
    );
    expect(others.every((m) => m.status === "scheduled" && m.court === "Quadras 1 e 2")).toBe(true);
    expect(eng.getStore().matches.find((m) => m.id === first.id)!.scheduledAt).toBeUndefined();
  });
});

describe("cancelar resultado", () => {
  it("antes de montar a chave é só placar, sem falso aviso de divergência", () => {
    const { eng, cat } = build({ numGroups: 4, advancersPerGroup: 2, pairs: 14 });
    const m = eng.getStore().matches.find((x) => x.categoryId === cat.id && x.phase === "GROUP")!;
    eng.recordScore(m.id, [{ gamesA: 6, gamesB: 2 }]);
    const impact = eng.previewCancelImpact(m.id);
    expect(impact.kind).toBe("score_only");
    expect(impact.divergenceWarning).toBe(false);
    eng.cancelScore(m.id, { correctionKind: "score_only", confirmClear: false });
    const after = eng.getStore().matches.find((x) => x.id === m.id)!;
    expect(after.score).toBeUndefined();
    expect(after.status).toBe("pending");
    expect(after.winnerRegistrationId).toBeUndefined();
  });

  it("jogo da eliminatória: cancelar remove o vencedor da fase seguinte", () => {
    const { eng, cat } = build({ numGroups: 2, advancersPerGroup: 2, pairs: 8, seeding: "BY_GROUP" });
    playAllReady(eng, cat.id, "GROUP");
    for (const g of eng.getStore().groups) {
      if (eng.getGroupStandings(g.id).residualPending.length) eng.applyResidualDraw(g.id);
    }
    eng.materializeBracket(cat.id);
    const ko = eng.getStore().matches.find(
      (x) => x.categoryId === cat.id && x.phase === "KO" && x.round === 1 && x.sideAId && x.sideBId,
    )!;
    eng.recordScore(ko.id, [{ gamesA: 6, gamesB: 1 }]);
    const next = () => eng.getStore().matches.find((x) => x.id === ko.feedsToMatchId)!;
    expect([next().sideAId, next().sideBId]).toContain(ko.sideAId);
    eng.cancelScore(ko.id, { correctionKind: "score_only", confirmClear: false });
    expect(eng.getStore().matches.find((x) => x.id === ko.id)!.score).toBeUndefined();
    expect([next().sideAId, next().sideBId]).not.toContain(ko.sideAId);
  });
});

describe("nomes com caracteres invisíveis", () => {
  it("register limpa o nome e o armazenamento antigo é normalizado ao carregar", () => {
    const eng = createEngine(emptyStore());
    const t = eng.createTournament("T");
    const cat = eng.createCategory({
      tournamentId: t.id,
      name: "C",
      format: "GROUP_KO",
      entryType: "doubles",
      numGroups: 1,
      advancersPerGroup: 0,
    });
    const reg = eng.register({ categoryId: cat.id, names: ["\u2060 \u2060Guilherme", "Daniel\u200b"] });
    expect(reg.displayName).toBe("Guilherme / Daniel");

    // dado antigo, já gravado sujo
    const dirty = eng.getStore();
    const sujo = {
      ...dirty,
      registrations: dirty.registrations.map((r) => ({ ...r, displayName: "\u2060 \u2060Guilherme / Daniel" })),
      athletes: dirty.athletes.map((a) => ({ ...a, displayName: "\u2060" + a.displayName })),
    };
    const loaded = createEngine(sujo);
    expect(loaded.getStore().registrations[0].displayName).toBe("Guilherme / Daniel");
    expect(loaded.regName(reg.id)).toBe("Guilherme / Daniel");
    expect(loaded.getStore().athletes.map((a) => a.displayName)).toEqual(["Guilherme", "Daniel"]);
  });
});
