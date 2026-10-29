import { describe, expect, it } from "vitest";
import { findCrossCategoryConflicts, planGroupSchedule } from "./schedule";
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

function rr(ids: string[]): Match[] {
  const out: Match[] = [];
  let pos = 1;
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++)
      out.push({
        id: `m${pos}`,
        categoryId: "c",
        phase: "GROUP",
        round: 1,
        position: pos++,
        groupId: "g",
        sideAId: ids[i],
        sideBId: ids[j],
        status: "pending",
      });
  return out;
}

describe("planGroupSchedule", () => {
  const start = new Date("2026-11-07T09:00:00.000Z");

  it("1 quadra: um jogo por horário, 10 jogos de 5 duplas, sem repetir horário", () => {
    const plan = planGroupSchedule({ matches: rr(["a", "b", "c", "d", "e"]), startAt: start, minutesPerMatch: 40 });
    expect(plan).toHaveLength(10);
    expect(new Set(plan.map((p) => p.scheduledAt)).size).toBe(10);
    expect(plan[0].scheduledAt).toBe(start.toISOString());
    expect(plan[1].scheduledAt).toBe(new Date(start.getTime() + 40 * 60_000).toISOString());
  });

  it("evita a mesma dupla em jogos colados quando há alternativa", () => {
    const matches = rr(["a", "b", "c", "d", "e"]);
    const plan = planGroupSchedule({ matches, startAt: start, minutesPerMatch: 40 });
    const byId = new Map(matches.map((m) => [m.id, m]));
    let backToBack = 0;
    for (let i = 1; i < plan.length; i++) {
      const p = byId.get(plan[i - 1].matchId)!;
      const q = byId.get(plan[i].matchId)!;
      if ([p.sideAId, p.sideBId].some((x) => x === q.sideAId || x === q.sideBId)) backToBack++;
    }
    expect(backToBack).toBeLessThanOrEqual(1);
  });

  it("2 quadras: dois jogos por horário, nunca a mesma dupla duas vezes no horário", () => {
    const matches = rr(["a", "b", "c", "d"]);
    const plan = planGroupSchedule({ matches, startAt: start, minutesPerMatch: 30, courts: ["Q1", "Q2"] });
    expect(plan).toHaveLength(6);
    const byId = new Map(matches.map((m) => [m.id, m]));
    const bySlot = new Map<string, string[]>();
    for (const p of plan) {
      const m = byId.get(p.matchId)!;
      bySlot.set(p.scheduledAt, [...(bySlot.get(p.scheduledAt) ?? []), m.sideAId!, m.sideBId!]);
    }
    for (const sides of bySlot.values()) expect(new Set(sides).size).toBe(sides.length);
    expect(bySlot.size).toBe(3);
    expect(plan.map((p) => p.court).sort()).toEqual(["Q1", "Q1", "Q1", "Q2", "Q2", "Q2"]);
  });
});
