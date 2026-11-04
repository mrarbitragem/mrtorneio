import { describe, expect, it } from "vitest";
import { emptyStore } from "../store/localStore";
import { createEngine } from "../store/engine";
import {
  collectPrintGames,
  formatRefereeTime,
  gamesPrintCategoryCode,
  gamesPrintDisplayName,
  gamesPrintShortTeamName,
  groupPrintGames,
  groupPrintWhen,
  printableScoreLabel,
  printAthleteNameUpper,
  printRankingLabel,
  shortenBracketLabel,
  splitGroupsForCompactPrint,
  splitPrintedAthleteNames,
} from "./print";

describe("rótulos da chave impressa", () => {
  it("abreviam origem do grupo e vencedor", () => {
    expect(shortenBracketLabel("1º lugar do grupo 1")).toBe("1ºG1");
    expect(shortenBracketLabel("2º lugar do grupo 3")).toBe("2ºG3");
    expect(shortenBracketLabel("Vencedor QF 1")).toBe("V QF1");
    expect(shortenBracketLabel("Vencedor SF 2")).toBe("V SF2");
  });
});

describe("impressão compacta de grupos", () => {
  it("separa cada atleta da dupla", () => {
    expect(splitPrintedAthleteNames("ANA SILVA / BIA COSTA")).toEqual(["ANA SILVA", "BIA COSTA"]);
  });

  it("imprime ranking com 4 dígitos e nome em caixa alta", () => {
    expect(printRankingLabel()).toBe("0000");
    expect(printRankingLabel(12)).toBe("0012");
    expect(printAthleteNameUpper("Manuela Monteiro Tavares")).toBe("MANUELA MONTEIRO TAVARES");
  });

  it("mostra data e hora do grupo", () => {
    expect(groupPrintWhen([])).toBe("");
    expect(groupPrintWhen([undefined, "2026-11-07T11:30:00.000Z"])).toMatch(/07\/11/);
    expect(groupPrintWhen([undefined, "2026-11-07T11:30:00.000Z"])).toMatch(/08:30/);
  });

  it("pagina ~5 grupos de 3 por folha", () => {
    const items = Array.from({ length: 8 }, (_, i) => ({ id: i, rankingLength: 3 }));
    const pages = splitGroupsForCompactPrint(items);
    expect(pages).toHaveLength(2);
    expect(pages[0]).toHaveLength(5);
    expect(pages[1]).toHaveLength(3);
  });
});

describe("códigos e nomes da lista para árbitros", () => {
  it("monta siglas M/F/X com a classe, no estilo da folha do dia", () => {
    expect(gamesPrintCategoryCode("Feminina Iniciante")).toBe("F I");
    expect(gamesPrintCategoryCode("Feminina Avançada")).toBe("F AV");
    expect(gamesPrintCategoryCode("Masculina Avançada")).toBe("M AV");
    expect(gamesPrintCategoryCode("Masculina B")).toBe("M B");
    expect(gamesPrintCategoryCode("Mista A")).toBe("X A");
  });

  it("mostra só primeiro e último nome de cada atleta", () => {
    expect(gamesPrintDisplayName("MACHADO DE OLIVEIRA / ANA DA SILVA")).toBe(
      "Machado de Oliveira / Ana da Silva",
    );
    expect(gamesPrintShortTeamName("MACHADO DE OLIVEIRA / ANA DA SILVA")).toBe(
      "Machado Oliveira / Ana Silva",
    );
    expect(gamesPrintShortTeamName("1ºG1")).toBe("1ºG1");
    expect(gamesPrintShortTeamName("2ºG3")).toBe("2ºG3");
  });
});

describe("coleta da lista para árbitros", () => {
  it("lista jogos do grupo com fase G1 e une horário/fase no rowspan", () => {
    const eng = createEngine(emptyStore());
    const t = eng.createTournament("Torneio Interno");
    const c = eng.createCategory({
      tournamentId: t.id,
      name: "Feminina Iniciante",
      format: "GROUP_KO",
      entryType: "doubles",
      numGroups: 2,
      advancersPerGroup: 2,
    });
    const pairs = [
      ["Ana Silva", "Bia Costa"],
      ["Carla Souza", "Dana Lima"],
      ["Eva Nunes", "Fran Dias"],
      ["Gabi Melo", "Helena Paz"],
      ["Iara Cruz", "Julia Reis"],
      ["Katia Lopes", "Lia Pinto"],
    ];
    for (const names of pairs) eng.register({ categoryId: c.id, names });
    eng.generateDraw(c.id, () => 0);
    const group = eng.getStore().groups.filter((g) => g.categoryId === c.id)[0];
    eng.scheduleGroup(group.id, {
      startAt: "2026-11-07T12:00:00.000Z",
      minutesPerMatch: 40,
      sameTime: true,
    });

    const games = collectPrintGames(eng.getStore(), [c.id]).filter((g) => g.phase === "G1");
    expect(games.length).toBeGreaterThan(0);
    expect(games.every((g) => g.phase === "G1")).toBe(true);
    expect(games.every((g) => g.time === games[0].time)).toBe(true);

    const sections = groupPrintGames(games);
    const firstBlock = sections[0].blocks[0];
    expect(firstBlock.rows[0].timeSpan).toBe(games.length);
    expect(firstBlock.rows[0].phaseSpan).toBe(games.length);
    expect(firstBlock.rows[0].categorySpan).toBe(games.length);
    expect(formatRefereeTime(games[0].time)).toMatch(/h$/);
    expect(printableScoreLabel(eng.getStore().matches.find((m) => m.id === games[0].id)!)).toBe("");
  });

  it("não junta grupos diferentes no mesmo horário", () => {
    const eng = createEngine(emptyStore());
    const t = eng.createTournament("Dia");
    const c = eng.createCategory({
      tournamentId: t.id,
      name: "Masculina B",
      format: "GROUP_KO",
      entryType: "doubles",
      numGroups: 2,
      advancersPerGroup: 2,
    });
    const pairs = [
      ["Ana Silva", "Bia Costa"],
      ["Carla Souza", "Dana Lima"],
      ["Eva Nunes", "Fran Dias"],
      ["Gabi Melo", "Helena Paz"],
      ["Iara Cruz", "Julia Reis"],
      ["Katia Lopes", "Lia Pinto"],
    ];
    for (const names of pairs) eng.register({ categoryId: c.id, names });
    eng.generateDraw(c.id, () => 0);
    const groups = eng.getStore().groups.filter((g) => g.categoryId === c.id);
    for (const group of groups) {
      eng.scheduleGroup(group.id, {
        startAt: "2026-11-07T12:00:00.000Z",
        minutesPerMatch: 40,
        sameTime: true,
      });
    }
    const games = collectPrintGames(eng.getStore(), [c.id]);
    const sections = groupPrintGames(games);
    expect(sections[0].blocks.length).toBeGreaterThanOrEqual(2);
    expect(sections[0].blocks[0].rows[0].game.phase).not.toBe(sections[0].blocks[1].rows[0].game.phase);
    expect(sections[0].blocks[0].rows[0].timeSpan).toBe(sections[0].blocks[0].rows.length);
  });
});
