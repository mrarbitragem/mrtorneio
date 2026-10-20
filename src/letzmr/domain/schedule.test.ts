import { describe, expect, it } from "vitest";
import { findCrossCategoryConflicts } from "./schedule";
import type { Athlete, Match, Registration } from "./types";

describe("CT-PROG-02 — conflito entre categorias", () => {
  const athletes: Athlete[] = [{ id: "ath1", displayName: "Elena" }];
  const regs: Registration[] = [
    {
      id: "rA",
      categoryId: "catA",
      athleteIds: ["ath1"],
      displayName: "Elena",
      status: "confirmed",
    },
    {
      id: "rB",
      categoryId: "catB",
      athleteIds: ["ath1"],
      displayName: "Elena",
      status: "confirmed",
    },
    {
      id: "rC",
      categoryId: "catA",
      athleteIds: ["ath2"],
      displayName: "Other",
      status: "confirmed",
    },
  ];

  it("notifica choque entre categorias diferentes", () => {
    const when = "2026-10-16T10:00:00.000Z";
    const matches: Match[] = [
      {
        id: "m1",
        categoryId: "catA",
        phase: "GROUP",
        round: 1,
        position: 1,
        sideAId: "rA",
        sideBId: "rC",
        status: "scheduled",
        scheduledAt: when,
      },
      {
        id: "m2",
        categoryId: "catB",
        phase: "GROUP",
        round: 1,
        position: 1,
        sideAId: "rB",
        sideBId: "rC",
        status: "scheduled",
        scheduledAt: when,
      },
    ];
    const conflicts = findCrossCategoryConflicts({ matches, registrations: regs, athletes });
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].athleteId).toBe("ath1");
  });

  it("não notifica sobreposição na mesma categoria", () => {
    const when = "2026-10-16T10:00:00.000Z";
    const matches: Match[] = [
      {
        id: "m1",
        categoryId: "catA",
        phase: "GROUP",
        round: 1,
        position: 1,
        sideAId: "rA",
        sideBId: "rC",
        status: "scheduled",
        scheduledAt: when,
      },
      {
        id: "m2",
        categoryId: "catA",
        phase: "GROUP",
        round: 1,
        position: 2,
        sideAId: "rA",
        sideBId: "rC",
        status: "scheduled",
        scheduledAt: when,
      },
    ];
    const conflicts = findCrossCategoryConflicts({ matches, registrations: regs, athletes });
    expect(conflicts).toHaveLength(0);
  });
});
