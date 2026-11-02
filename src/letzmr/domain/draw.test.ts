import { describe, expect, it } from "vitest";
import { assignGroups, groupCapacities } from "./draw";
import type { Registration } from "./types";

function regs(n: number): Registration[] {
  return Array.from({ length: n }, (_, i) => ({
    id: `r${i}`,
    categoryId: "c",
    athleteIds: [`a${i}`],
    displayName: `Dupla ${i + 1}`,
    status: "confirmed" as const,
  }));
}

function sizesOf(assigned: ReturnType<typeof assignGroups>): number[] {
  return assigned.groups
    .slice()
    .sort((a, b) => a.index - b.index)
    .map((g) => assigned.registrations.filter((r) => r.groupId === g.id).length);
}

describe("groupCapacities", () => {
  it("10 duplas em 3 grupos: 3, 3 e 4 no último", () => {
    expect(groupCapacities(10, 3)).toEqual([3, 3, 4]);
  });

  it("14 duplas em 4 grupos: 3, 3, 4 e 4 nos últimos", () => {
    expect(groupCapacities(14, 4)).toEqual([3, 3, 4, 4]);
  });

  it("o resto sempre cai no fim", () => {
    expect(groupCapacities(13, 4)).toEqual([3, 3, 3, 4]);
    expect(groupCapacities(15, 4)).toEqual([3, 4, 4, 4]);
    expect(groupCapacities(11, 3)).toEqual([3, 4, 4]);
    expect(groupCapacities(7, 2)).toEqual([3, 4]);
    expect(groupCapacities(9, 3)).toEqual([3, 3, 3]);
    expect(groupCapacities(8, 2)).toEqual([4, 4]);
    expect(groupCapacities(5, 1)).toEqual([5]);
  });
});

describe("assignGroups", () => {
  it("10 duplas em 3 grupos: grupos 1 e 2 com 3, grupo 3 com 4", () => {
    expect(sizesOf(assignGroups("c", regs(10), 3, () => 0))).toEqual([3, 3, 4]);
  });

  it("14 duplas em 4 grupos: os dois últimos recebem 4", () => {
    expect(sizesOf(assignGroups("c", regs(14), 4, () => 0))).toEqual([3, 3, 4, 4]);
  });

  it("7 duplas em 2 grupos: o último recebe 4", () => {
    expect(sizesOf(assignGroups("c", regs(7), 2, () => 0))).toEqual([3, 4]);
  });
});
