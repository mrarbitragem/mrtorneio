import { describe, expect, it } from "vitest";
import {
  isGroupComplete,
  setScoreParts,
  standingsNeededTieBreak,
} from "./publicDraw";
import type { Match, StandingRow } from "./types";

function match(status: Match["status"]): Match {
  return {
    id: status,
    categoryId: "c",
    phase: "GROUP",
    round: 1,
    position: 1,
    groupId: "g1",
    status,
  };
}

describe("visibilidade dos jogos do grupo", () => {
  it("mantém o grupo aberto enquanto falta resultado", () => {
    expect(isGroupComplete([match("played"), match("pending")], "g1")).toBe(false);
  });

  it("fecha o grupo quando todos os jogos têm resultado", () => {
    expect(isGroupComplete([match("played"), match("wo")], "g1")).toBe(true);
  });
});

describe("desempate só quando o saldo de vitórias empata", () => {
  it("não pede critério extra quando cada dupla tem saldo diferente", () => {
    const rows = [
      { wins: 2, losses: 0 },
      { wins: 1, losses: 1 },
      { wins: 0, losses: 2 },
    ];
    expect(standingsNeededTieBreak(rows)).toBe(false);
  });

  it("pede critério quando duas duplas têm o mesmo saldo", () => {
    const rows = [
      { wins: 1, losses: 1 },
      { wins: 1, losses: 1 },
    ] as Pick<StandingRow, "wins" | "losses">[];
    expect(standingsNeededTieBreak(rows)).toBe(true);
  });
});

describe("placar com tie-break", () => {
  it("guarda o games e o dígito do tie-break separados", () => {
    expect(setScoreParts({ gamesA: 6, gamesB: 7, tiebreakA: 5 })).toEqual({
      gamesA: 6,
      gamesB: 7,
      tiebreakA: 5,
      tiebreakB: undefined,
    });
  });
});
