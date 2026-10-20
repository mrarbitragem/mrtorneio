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

  eng.setPublished(gc.id, true);

  return eng.getStore();
}
