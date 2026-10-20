import { describe, expect, it } from "vitest";
import {
  PRESET_BYE_3_QUALIFIERS,
  PRESET_N2_ADV2,
  PRESET_N4_ADV2,
  buildKoMatchesFromPreset,
  materializeKoSlots,
  resolveBracketPreset,
} from "./bracket";
import type { StandingRow } from "./types";

describe("CT-PROG-N2", () => {
  it("crossover 1ºG1×2ºG2 e 2ºG1×1ºG2", () => {
    const p = resolveBracketPreset(2, 2);
    expect(p).toBe(PRESET_N2_ADV2);
    expect(PRESET_N2_ADV2[0].sideA).toMatchObject({ groupIndex: 1, rank: 1 });
    expect(PRESET_N2_ADV2[0].sideB).toMatchObject({ groupIndex: 2, rank: 2 });
    expect(PRESET_N2_ADV2[1].sideA).toMatchObject({ groupIndex: 1, rank: 2 });
    expect(PRESET_N2_ADV2[1].sideB).toMatchObject({ groupIndex: 2, rank: 1 });
  });
});

describe("CT-PROG-N4", () => {
  it("mapping origem do modal público", () => {
    const p = resolveBracketPreset(4, 2);
    expect(p).toBe(PRESET_N4_ADV2);
    expect(PRESET_N4_ADV2[0]).toMatchObject({
      sideA: { groupIndex: 1, rank: 1 },
      sideB: { groupIndex: 3, rank: 2 },
    });
    expect(PRESET_N4_ADV2[1]).toMatchObject({
      sideA: { groupIndex: 2, rank: 2 },
      sideB: { groupIndex: 4, rank: 1 },
    });
    expect(PRESET_N4_ADV2[2]).toMatchObject({
      sideA: { groupIndex: 3, rank: 1 },
      sideB: { groupIndex: 1, rank: 2 },
    });
    expect(PRESET_N4_ADV2[3]).toMatchObject({
      sideA: { groupIndex: 4, rank: 2 },
      sideB: { groupIndex: 2, rank: 1 },
    });
  });
});

describe("CT-PROG-BYE", () => {
  it("usa mapping explícito para 3 classificados", () => {
    expect(resolveBracketPreset(1, 3)).toBe(PRESET_BYE_3_QUALIFIERS);
    expect(PRESET_BYE_3_QUALIFIERS[0].sideB.kind).toBe("bye");
  });

  it("recusa N sem mapping explícito", () => {
    expect(() => resolveBracketPreset(3, 2)).toThrow(/mapping explícito/);
  });
});

describe("materialização", () => {
  it("preenche nomes a partir dos ranks", () => {
    const matches = buildKoMatchesFromPreset("c1", PRESET_N2_ADV2);
    const standings = new Map<string, StandingRow[]>([
      [
        "g1",
        [
          { registrationId: "R1", groupId: "g1", played: 0, wins: 2, losses: 0, setsFor: 0, setsAgainst: 0, gamesFor: 0, gamesAgainst: 0, setDiff: 0, gameDiff: 0, setPct: null, gamePct: null, rank: 1 },
          { registrationId: "R2", groupId: "g1", played: 0, wins: 1, losses: 1, setsFor: 0, setsAgainst: 0, gamesFor: 0, gamesAgainst: 0, setDiff: 0, gameDiff: 0, setPct: null, gamePct: null, rank: 2 },
        ],
      ],
      [
        "g2",
        [
          { registrationId: "R3", groupId: "g2", played: 0, wins: 2, losses: 0, setsFor: 0, setsAgainst: 0, gamesFor: 0, gamesAgainst: 0, setDiff: 0, gameDiff: 0, setPct: null, gamePct: null, rank: 1 },
          { registrationId: "R4", groupId: "g2", played: 0, wins: 0, losses: 2, setsFor: 0, setsAgainst: 0, gamesFor: 0, gamesAgainst: 0, setDiff: 0, gameDiff: 0, setPct: null, gamePct: null, rank: 2 },
        ],
      ],
    ]);
    const idx = new Map([[1, "g1"], [2, "g2"]]);
    const filled = materializeKoSlots(matches, PRESET_N2_ADV2, idx, standings);
    const sf1 = filled.find((m) => m.round === 1 && m.position === 1)!;
    expect(sf1.sideAId).toBe("R1");
    expect(sf1.sideBId).toBe("R4");
  });
});
