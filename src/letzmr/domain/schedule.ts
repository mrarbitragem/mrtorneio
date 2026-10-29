import type { Athlete, Match, Registration, ScheduleConflict } from "./types";

function sameInstant(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return new Date(a).getTime() === new Date(b).getTime();
}

/**
 * Cross-category conflicts only (R6). Same-category overlap is allowed — not reported.
 */
export function findCrossCategoryConflicts(args: {
  matches: Match[];
  registrations: Registration[];
  athletes: Athlete[];
  /** Optional: only evaluate this match against others */
  focusMatchId?: string;
}): ScheduleConflict[] {
  const { matches, registrations, athletes, focusMatchId } = args;
  const regById = new Map(registrations.map((r) => [r.id, r]));
  const athById = new Map(athletes.map((a) => [a.id, a]));

  const scheduled = matches.filter((m) => m.scheduledAt);
  const focus = focusMatchId ? scheduled.filter((m) => m.id === focusMatchId || true) : scheduled;

  const conflicts: ScheduleConflict[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < focus.length; i++) {
    for (let j = 0; j < scheduled.length; j++) {
      const a = focus[i];
      const b = scheduled[j];
      if (a.id === b.id) continue;
      if (a.categoryId === b.categoryId) continue; // same category OK
      if (!sameInstant(a.scheduledAt, b.scheduledAt)) continue;

      const regsA = [a.sideAId, a.sideBId].filter(Boolean).map((id) => regById.get(id!));
      const regsB = [b.sideAId, b.sideBId].filter(Boolean).map((id) => regById.get(id!));
      const athletesA = new Set(regsA.flatMap((r) => r?.athleteIds ?? []));
      const athletesB = new Set(regsB.flatMap((r) => r?.athleteIds ?? []));

      for (const athleteId of athletesA) {
        if (!athletesB.has(athleteId)) continue;
        const key = [athleteId, a.scheduledAt, ...[a.id, b.id].sort()].join("|");
        if (seen.has(key)) continue;
        seen.add(key);
        const athlete = athById.get(athleteId);
        conflicts.push({
          athleteId,
          athleteName: athlete?.displayName ?? athleteId,
          matchAId: a.id,
          matchBId: b.id,
          categoryAId: a.categoryId,
          categoryBId: b.categoryId,
          scheduledAt: a.scheduledAt!,
          message: `${athlete?.displayName ?? "Atleta"} tem jogos em categorias diferentes no mesmo horário.`,
        });
      }
    }
  }

  return conflicts;
}

export type PlannedSlot = { matchId: string; scheduledAt: string; court?: string };

/**
 * Distribui os jogos em horários consecutivos. Com N quadras, até N jogos por horário;
 * nunca coloca a mesma dupla em dois jogos no mesmo horário e prefere quem descansou mais.
 */
export function planGroupSchedule(args: {
  matches: Match[];
  startAt: Date;
  minutesPerMatch: number;
  courts?: string[];
}): PlannedSlot[] {
  const { matches, startAt, minutesPerMatch } = args;
  const courts = (args.courts ?? []).map((c) => c.trim()).filter(Boolean);
  const capacity = Math.max(1, courts.length);
  const remaining = [...matches].sort((a, b) => a.position - b.position);
  const lastSlot = new Map<string, number>();
  const plan: PlannedSlot[] = [];

  for (let slot = 0; remaining.length > 0; slot += 1) {
    const busy = new Set<string>();
    const at = new Date(startAt.getTime() + slot * minutesPerMatch * 60_000).toISOString();
    for (let k = 0; k < capacity; k += 1) {
      let best = -1;
      let bestRest = -1;
      remaining.forEach((m, idx) => {
        const sides = [m.sideAId, m.sideBId].filter((x): x is string => Boolean(x));
        if (sides.some((s) => busy.has(s))) return;
        const rest = Math.min(
          ...sides.map((s) => (lastSlot.has(s) ? slot - (lastSlot.get(s) as number) : 1e9)),
        );
        if (rest > bestRest) {
          best = idx;
          bestRest = rest;
        }
      });
      if (best < 0) break;
      const [m] = remaining.splice(best, 1);
      [m.sideAId, m.sideBId].forEach((s) => {
        if (s) {
          busy.add(s);
          lastSlot.set(s, slot);
        }
      });
      plan.push({ matchId: m.id, scheduledAt: at, court: courts[k] });
    }
  }
  return plan;
}
