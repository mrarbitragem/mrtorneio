import { describe, expect, it } from "vitest";
import { abbreviateCategory, abbreviatePhase, saidaExcelFilename } from "./abbreviate";
import { mergeBlocks, toSaidaMatches } from "./buildSaidaWorkbook";
import type { JogosMatch } from "./types";

describe("abbreviateCategory", () => {
  it("encurta o gênero e a classe", () => {
    expect(abbreviateCategory("Dupla Masculina B")).toBe("M B");
    expect(abbreviateCategory("Dupla Feminina C")).toBe("F C");
    expect(abbreviateCategory("Dupla Masculina Profissional")).toBe("M PRO");
    expect(abbreviateCategory("Dupla Feminina 60+")).toBe("F 60+");
    expect(abbreviateCategory("Dupla Masculina Sub 16")).toBe("M S16");
  });
});

describe("abbreviatePhase", () => {
  it("encurta grupo e chave", () => {
    expect(abbreviatePhase("Fase de grupos - G1")).toBe("G1");
    expect(abbreviatePhase("Fase de grupos - G4")).toBe("G4");
    expect(abbreviatePhase("Quartas de Final")).toBe("QF");
    expect(abbreviatePhase("Semifinal")).toBe("SF");
    expect(abbreviatePhase("Final")).toBe("F");
    expect(abbreviatePhase("R16")).toBe("R16");
  });
});

describe("saidaExcelFilename", () => {
  it("deriva o nome da folha de saída", () => {
    expect(saidaExcelFilename("CIRCUITO FBT - Jogos (2).xlsx")).toBe("CIRCUITO FBT - Jogos saida.xlsx");
    expect(saidaExcelFilename("CIRCUITO FBT - Jogos.xlsx")).toBe("CIRCUITO FBT - Jogos saida.xlsx");
    expect(saidaExcelFilename("folha saida.xlsx")).toBe("folha saida.xlsx");
  });
});

describe("mergeBlocks", () => {
  it("junta partidas seguidas do mesmo horário, categoria e fase", () => {
    const source: JogosMatch[] = [
      { date: "2026-10-17", time: "09:00h", category: "Dupla Masculina B", phase: "Fase de grupos - G1", player1: "A / B", player2: "C / D", result: "" },
      { date: "2026-10-17", time: "09:00h", category: "Dupla Masculina B", phase: "Fase de grupos - G1", player1: "C / D", player2: "E / F", result: "" },
      { date: "2026-10-17", time: "09:00h", category: "Dupla Masculina B", phase: "Fase de grupos - G2", player1: "G / H", player2: "I / J", result: "" },
    ];
    const saida = toSaidaMatches(source);
    expect(saida.map((row) => [row.category, row.phase])).toEqual([
      ["M B", "G1"],
      ["M B", "G1"],
      ["M B", "G2"],
    ]);
    expect(mergeBlocks(saida)).toEqual([
      { start: 0, end: 1 },
      { start: 2, end: 2 },
    ]);
  });
});
