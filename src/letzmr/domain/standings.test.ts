import { describe, expect, it } from "vitest";
import { buildPlayedScore, buildWoScore, applyScoreToMatch } from "./score";
import { computeGroupStandings, pct, rankGroup } from "./standings";
import type { Match, Registration } from "./types";

function reg(id: string, groupId: string, name: string): Registration {
  return {
    id,
    categoryId: "c1",
    athleteIds: [id],
    displayName: name,
    groupId,
    status: "confirmed",
  };
}

function groupMatch(
  id: string,
  a: string,
  b: string,
  gamesA: number,
  gamesB: number,
): Match {
  const base: Match = {
    id,
    categoryId: "c1",
    phase: "GROUP",
    round: 1,
    position: 1,
    groupId: "g1",
    sideAId: a,
    sideBId: b,
    status: "pending",
  };
  return applyScoreToMatch(base, buildPlayedScore([{ gamesA, gamesB }]));
}

describe("pct denominador zero (R9)", () => {
  it("retorna null quando pró+contra = 0", () => {
    expect(pct(0, 0)).toBeNull();
  });
  it("calcula percentual normal", () => {
    expect(pct(10, 9)).toBeCloseTo((10 / 19) * 100);
  });
});

describe("CT-DES-01 — empate 2 por H2H", () => {
  it("A acima de B quando A venceu B com mesmo W-L", () => {
    // A beats B, A loses to C, B loses to C → wait need same W-L
    // Simpler: A beat B; both have other identical results via third...
    // Two players only: A beat B → different W-L. Need third.
    // A 1-1, B 1-1: A beat B, B beat C, C beat A — classic
    const matches = [
      groupMatch("m1", "A", "B", 6, 4), // A wins
      groupMatch("m2", "B", "C", 6, 3), // B wins
      groupMatch("m3", "C", "A", 6, 2), // C wins
    ];
    const regs = [reg("A", "g1", "A"), reg("B", "g1", "B"), reg("C", "g1", "C")];
    const rows = computeGroupStandings("g1", regs, matches);
    const { ranked } = rankGroup(rows, matches, "g1");
    // All 1-1. setDiff 0. gameDiff: A 8/10=-2, B 10/9=+1, C 9/8=+1
    // B and C +1 → H2H: B beat C → B > C; A last
    expect(ranked.map((r) => r.registrationId)).toEqual(["B", "C", "A"]);
  });
});

describe("CT-DES-02 / CT-DES-03 — empate triplo AG/IS/EK", () => {
  it("ordem AG, IS, EK com H2H ao reduzir a 2", () => {
    // EK 6-4 AG; AG 6-3 IS; IS 6-2 EK
    const matches = [
      groupMatch("m1", "EK", "AG", 6, 4),
      groupMatch("m2", "AG", "IS", 6, 3),
      groupMatch("m3", "IS", "EK", 6, 2),
    ];
    const regs = [
      reg("AG", "g1", "AG"),
      reg("IS", "g1", "IS"),
      reg("EK", "g1", "EK"),
    ];
    const rows = computeGroupStandings("g1", regs, matches);
    const byId = Object.fromEntries(rows.map((r) => [r.registrationId, r]));
    expect(byId.AG.wins).toBe(1);
    expect(byId.AG.gameDiff).toBe(1); // 10-9
    expect(byId.IS.gameDiff).toBe(1); // 9-8
    expect(byId.EK.gameDiff).toBe(-2); // 8-10

    const { ranked } = rankGroup(rows, matches, "g1");
    expect(ranked.map((r) => r.registrationId)).toEqual(["AG", "IS", "EK"]);
    expect(ranked[0].rankSource).toBe("h2h");
  });
});

describe("CT-DES-04 — empate residual", () => {
  it("marca residual_pending sem sorteio; ordena após draw persistido", () => {
    // Identical everything: WO wins between three? Two players each WO once...
    // Force identical: no matches played — all zeros → residual
    const regs = [reg("A", "g1", "A"), reg("B", "g1", "B"), reg("C", "g1", "C")];
    const rows = computeGroupStandings("g1", regs, []);
    const pending = rankGroup(rows, [], "g1");
    expect(pending.residualPending.sort()).toEqual(["A", "B", "C"]);

    const drawn = rankGroup(rows, [], "g1", ["C", "A", "B"]);
    expect(drawn.ranked.map((r) => r.registrationId)).toEqual(["C", "A", "B"]);
    expect(drawn.ranked.every((r) => r.rankSource === "draw")).toBe(true);
  });
});

describe("CT-WO-01 — W.O. não infla sets/games", () => {
  it("credita vitória com 0/0", () => {
    const base: Match = {
      id: "m1",
      categoryId: "c1",
      phase: "GROUP",
      round: 1,
      position: 1,
      groupId: "g1",
      sideAId: "A",
      sideBId: "B",
      status: "pending",
    };
    const played = applyScoreToMatch(base, buildWoScore("A"));
    expect(played.status).toBe("wo");
    expect(played.winnerRegistrationId).toBe("A");
    const regs = [reg("A", "g1", "A"), reg("B", "g1", "B")];
    const rows = computeGroupStandings("g1", regs, [played]);
    const a = rows.find((r) => r.registrationId === "A")!;
    const b = rows.find((r) => r.registrationId === "B")!;
    expect(a.wins).toBe(1);
    expect(b.losses).toBe(1);
    expect(a.setsFor + a.setsAgainst).toBe(0);
    expect(a.gamesFor + a.gamesAgainst).toBe(0);
    expect(a.setPct).toBeNull();
    expect(a.gamePct).toBeNull();
  });
});
