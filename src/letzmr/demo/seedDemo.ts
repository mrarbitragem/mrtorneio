import { emptyStore } from "../store/localStore";
import { createEngine } from "../store/engine";

/** Torneio fictício completo para demo / browser. */
export function seedDemoTournament() {
  const eng = createEngine(emptyStore(), { autoLocalPersist: false });
  const t = eng.createTournament("Open Beach Demo LETZMR");

  const gc = eng.createCategory({
    tournamentId: t.id,
    name: "Simples Feminino A (G+C)",
    format: "GROUP_KO",
    entryType: "singles",
    numGroups: 2,
    advancersPerGroup: 2,
  });

  for (const n of ["Ana Gloria", "Iris Silva", "Eva Klein", "Paula Dias", "Quinn Rocha", "Bia Nunes"]) {
    eng.register({ categoryId: gc.id, names: [n] });
  }

  const ko = eng.createCategory({
    tournamentId: t.id,
    name: "Duplas Mista KO",
    format: "KO",
    entryType: "doubles",
  });

  eng.register({ categoryId: ko.id, names: ["Carla Mendes", "Diego Alves"] });
  eng.register({ categoryId: ko.id, names: ["Elena Costa", "Felipe Souza"] });
  eng.register({ categoryId: ko.id, names: ["Gabi Lima", "Hugo Martins"] });
  eng.register({ categoryId: ko.id, names: ["Iara Pinto", "Joao Reis"] });

  // Second category sharing Elena for schedule conflict demo later
  const gc2 = eng.createCategory({
    tournamentId: t.id,
    name: "Simples Feminino B",
    format: "GROUP_KO",
    entryType: "singles",
    numGroups: 2,
    advancersPerGroup: 2,
  });
  for (const n of ["Elena Costa", "Lia Prado", "Mona Vaz", "Nina Lopes", "Olga Dias", "Rita Melo"]) {
    eng.register({ categoryId: gc2.id, names: [n] });
  }

  eng.generateDraw(gc.id, () => 0);
  const drawn = eng.getStore();
  const groups = drawn.groups
    .filter((group) => group.categoryId === gc.id)
    .sort((a, b) => a.index - b.index);
  const first = groups[0];
  const second = groups[1];
  if (first) {
    const groupMatches = drawn.matches.filter((match) => match.groupId === first.id);
    const ids = [
      ...new Set(groupMatches.flatMap((match) => [match.sideAId, match.sideBId].filter(Boolean))),
    ] as string[];
    const [a, b, c] = ids;
    const scorePair = (
      winner: string,
      loser: string,
      gamesWinner: number,
      gamesLoser: number,
    ) => {
      const match = groupMatches.find(
        (item) =>
          (item.sideAId === winner && item.sideBId === loser) ||
          (item.sideAId === loser && item.sideBId === winner),
      );
      if (!match?.sideAId) return;
      const winnerIsA = match.sideAId === winner;
      eng.recordScore(match.id, [
        {
          gamesA: winnerIsA ? gamesWinner : gamesLoser,
          gamesB: winnerIsA ? gamesLoser : gamesWinner,
        },
      ]);
    };
    if (a && b && c) {
      scorePair(a, b, 6, 4);
      scorePair(b, c, 7, 6);
      scorePair(c, a, 6, 2);
    }
  }
  const pending = second
    ? eng.getStore().matches.find((match) => match.groupId === second.id && match.status === "pending")
    : undefined;
  if (pending) {
    eng.scheduleMatch(pending.id, "2026-05-10T12:00:00.000Z", "Quadra 01");
  }

  eng.setPublished(gc.id, true);

  return eng.getStore();
}
