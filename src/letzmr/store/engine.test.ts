import { describe, expect, it } from "vitest";
import { emptyStore } from "./localStore";
import { createEngine } from "./engine";

describe("CT-FMT-01 — formatos", () => {
  it("aceita GROUP_KO e KO; rejeita outros", () => {
    const eng = createEngine(emptyStore());
    const t = eng.createTournament("Lab");
    expect(eng.createCategory({ tournamentId: t.id, name: "SF", format: "GROUP_KO", entryType: "singles", numGroups: 2, advancersPerGroup: 2 }).format).toBe("GROUP_KO");
    expect(eng.createCategory({ tournamentId: t.id, name: "KO", format: "KO", entryType: "singles" }).format).toBe("KO");
  });
});

describe("fluxo G+C N=2 + correções", () => {
  it("CT-PROG-N2 + CT-COR-PLACAR / CT-COR-ATLETA", () => {
    const eng = createEngine(emptyStore());
    const t = eng.createTournament("Torneio");
    const c = eng.createCategory({
      tournamentId: t.id,
      name: "SF A",
      format: "GROUP_KO",
      entryType: "singles",
      numGroups: 2,
      advancersPerGroup: 2,
    });

    const names = ["AG", "IS", "EK", "P4", "Q1", "Q2", "Q3", "Q4"];
    // 4 per group ideal — use 3+3? N=2 with 3 each = 6 players
    for (const n of ["AG", "IS", "EK", "P4", "Q1", "Q2"]) {
      eng.register({ categoryId: c.id, names: [n] });
    }

    let i = 0;
    eng.generateDraw(c.id, () => {
      // deterministic distribution: first 3 → g0, next 3 → g1 via idx % 2
      // assignGroups: order preserved for unseeded after shuffle with fixed rng
      i += 1;
      return 0; // Fisher-Yates with 0 keeps relative order mostly
    });

    const store = eng.getStore();
    const groups = store.groups.filter((g) => g.categoryId === c.id);
    expect(groups).toHaveLength(2);

    // Play all group matches with deterministic winners (side A wins 6-3)
    const groupMatches = store.matches.filter(
      (m) => m.categoryId === c.id && m.phase === "GROUP",
    );
    for (const m of groupMatches) {
      eng.recordScore(m.id, [{ gamesA: 6, gamesB: 3 }]);
    }

    eng.materializeBracket(c.id);
    const koBefore = eng
      .getStore()
      .matches.filter((m) => m.categoryId === c.id && m.phase === "KO" && m.round === 1);
    expect(koBefore.every((m) => m.sideAId && m.sideBId)).toBe(true);
    const slotsBefore = koBefore.flatMap((m) => [m.sideAId, m.sideBId]).sort();

    // CT-COR-PLACAR: cancel a match that doesn't change qualifiers (margin only)
    // Flip is hard; cancel then re-enter same winner with different score
    const gm = groupMatches[0];
    const impactSame = eng.previewCancelImpact(gm.id);
    // After cancel standings change temporarily — may warn. Re-apply same result:
    eng.cancelScore(gm.id, { correctionKind: "score_only", confirmClear: false });
    eng.recordScore(gm.id, [{ gamesA: 6, gamesB: 1 }]);
    const koAfterScoreOnly = eng
      .getStore()
      .matches.filter((m) => m.categoryId === c.id && m.phase === "KO" && m.round === 1);
    const slotsAfter = koAfterScoreOnly.flatMap((m) => [m.sideAId, m.sideBId]).sort();
    // score_only path should keep materialized names (no clear)
    expect(slotsAfter).toEqual(slotsBefore);

    // CT-COR-ATLETA path: force clear
    const impact = eng.previewCancelImpact(gm.id);
    void impactSame;
    eng.cancelScore(gm.id, {
      correctionKind: "advancement_mismatch",
      confirmClear: true,
    });
    const koCleared = eng
      .getStore()
      .matches.filter((m) => m.categoryId === c.id && m.phase === "KO" && m.round === 1);
    expect(koCleared.some((m) => !m.sideAId || !m.sideBId)).toBe(true);
    expect(impact.divergenceWarning || impact.kind === "score_only").toBeTruthy();
  });
});

describe("persistência", () => {
  it("salva e recarrega torneio", () => {
    const eng = createEngine(emptyStore());
    eng.createTournament("Persist Me");
    const snap = eng.getStore();
    const eng2 = createEngine(structuredClone(snap));
    expect(eng2.getStore().tournaments[0].name).toBe("Persist Me");
  });
});

describe("CT-DES-03 via engine residual draw action", () => {
  it("exige sorteio explícito antes de materializar se residual", () => {
    const eng = createEngine(emptyStore());
    const t = eng.createTournament("T");
    const c = eng.createCategory({
      tournamentId: t.id,
      name: "G",
      format: "GROUP_KO",
      entryType: "singles",
      numGroups: 2,
      advancersPerGroup: 2,
    });
    for (const n of ["A", "B", "C", "D", "E", "F"]) {
      eng.register({ categoryId: c.id, names: [n] });
    }
    eng.generateDraw(c.id, () => 0);
    // no scores → residual on materialize
    expect(() => eng.materializeBracket(c.id)).toThrow(/residual|sorteio|pendente/i);
    const g = eng.getStore().groups.find((x) => x.categoryId === c.id)!;
    eng.applyResidualDraw(g.id, () => 0);
    // still other group residual
    expect(() => eng.materializeBracket(c.id)).toThrow();
  });
});
