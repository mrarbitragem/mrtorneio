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
