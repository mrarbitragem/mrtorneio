import { describe, expect, it } from "vitest";
import { emptyStore } from "../store/localStore";
import { createEngine } from "../store/engine";
import { publishedCategoriesToSync, publishedCategoryFingerprints } from "./publicSync";

describe("publicSync", () => {
  it("não pede sync se nada mudou", () => {
    const store = emptyStore();
    const before = publishedCategoryFingerprints(store);
    expect(publishedCategoriesToSync(before, store)).toEqual([]);
  });

  it("após placar da chave, sincroniza só a categoria publicada", () => {
    const eng = createEngine(emptyStore());
    const t = eng.createTournament("T");
    const cat = eng.createCategory({
      tournamentId: t.id,
      name: "Feminina Iniciante",
      format: "GROUP_KO",
      entryType: "doubles",
      numGroups: 2,
      advancersPerGroup: 2,
    });
    const other = eng.createCategory({
      tournamentId: t.id,
      name: "Masculina B",
      format: "GROUP_KO",
      entryType: "doubles",
      numGroups: 2,
      advancersPerGroup: 2,
    });
    const pairs = [
      ["Ana", "Bia"],
      ["Carla", "Dana"],
      ["Eva", "Fran"],
      ["Gabi", "Helena"],
      ["Iara", "Julia"],
      ["Katia", "Lia"],
    ];
    for (const names of pairs) {
      eng.register({ categoryId: cat.id, names });
      eng.register({ categoryId: other.id, names });
    }
    eng.generateDraw(cat.id, () => 0);
    eng.generateDraw(other.id, () => 0);
    const playGroup = (categoryId: string) => {
      for (const m of eng.getStore().matches.filter((x) => x.categoryId === categoryId && x.phase === "GROUP")) {
        if (m.sideAId && m.sideBId && m.status !== "played") {
          eng.recordScore(m.id, [{ gamesA: 6, gamesB: 3 }]);
        }
      }
    };
    playGroup(cat.id);
    for (const g of eng.getStore().groups.filter((x) => x.categoryId === cat.id)) {
      if (eng.getGroupStandings(g.id).residualPending.length) eng.applyResidualDraw(g.id);
    }
    eng.materializeBracket(cat.id);
    eng.setPublished(cat.id, true);
    eng.setPublished(other.id, true);

    const before = publishedCategoryFingerprints(eng.getStore());
    const ko = eng.getStore().matches.find(
      (m) => m.categoryId === cat.id && m.phase === "KO" && m.sideAId && m.sideBId,
    )!;
    eng.recordScore(ko.id, [{ gamesA: 6, gamesB: 2 }]);
    const next = eng.getStore().matches.find((m) => m.id === ko.feedsToMatchId)!;
    expect([next.sideAId, next.sideBId]).toContain(ko.sideAId);
    expect(publishedCategoriesToSync(before, eng.getStore())).toEqual([cat.id]);
  });
});
