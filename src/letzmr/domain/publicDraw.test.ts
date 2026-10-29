import { describe, expect, it } from "vitest";
import {
  describeMatchResult,
  formatSetScore,
  isGroupComplete,
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

describe("placar público sem dígito de tie-break", () => {
  it("mostra só os games do set de 6 games (7x6)", () => {
    expect(formatSetScore({ gamesA: 7, gamesB: 6 })).toBe("7x6");
  });

  it("mostra só os games do set profissional (9x8)", () => {
    expect(formatSetScore({ gamesA: 9, gamesB: 8 })).toBe("9x8");
  });

  it("ignora um dígito de tie-break vindo de dados antigos", () => {
    const legacy = { gamesA: 7, gamesB: 6, tiebreakB: 5 };
    expect(formatSetScore(legacy)).toBe("7x6");
  });
});

describe("describeMatchResult", () => {
  const names: Record<string, string> = { a: "Ana / Bia", b: "Carla / Dani" };
  const nameOf = (id?: string) => (id ? names[id] : "—");
  const base = { sideAId: "a", sideBId: "b" } as const;

  it("lado A vence: placar na ordem natural", () => {
    expect(
      describeMatchResult(
        { ...base, status: "played", winnerRegistrationId: "a", score: { sets: [{ gamesA: 6, gamesB: 3 }], recordedAt: "" } },
        nameOf,
      ),
    ).toBe("Ana / Bia vence 6x3");
  });

  it("lado B vence: placar virado para o ponto de vista do vencedor", () => {
    expect(
      describeMatchResult(
        { ...base, status: "played", winnerRegistrationId: "b", score: { sets: [{ gamesA: 2, gamesB: 6 }], recordedAt: "" } },
        nameOf,
      ),
    ).toBe("Carla / Dani vence 6x2");
  });

  it("W.O. e jogo sem resultado", () => {
    expect(
      describeMatchResult(
        { ...base, status: "wo", winnerRegistrationId: "b", score: { sets: [], woSide: "B", recordedAt: "" } },
        nameOf,
      ),
    ).toBe("Carla / Dani vence por W.O.");
    expect(describeMatchResult({ ...base, status: "scheduled" }, nameOf)).toBeNull();
  });
});
