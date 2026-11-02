import { newId } from "./ids";
import type { Group, Match, Registration } from "./types";

function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Tamanho de cada grupo: o restante vai para os últimos.
 * 10 duplas em 3 grupos → [3, 3, 4]; 14 em 4 → [3, 3, 4, 4].
 */
export function groupCapacities(count: number, numGroups: number): number[] {
  if (numGroups < 1) throw new Error("numGroups inválido");
  const base = Math.floor(count / numGroups);
  const extra = count % numGroups;
  return Array.from({ length: numGroups }, (_, i) =>
    i >= numGroups - extra ? base + 1 : base,
  );
}

/** Distribui inscritos em N grupos; grupos maiores ficam no fim. */
export function assignGroups(
  categoryId: string,
  registrations: Registration[],
  numGroups: number,
  rng: () => number = Math.random,
): { groups: Group[]; registrations: Registration[] } {
  if (numGroups < 1) throw new Error("numGroups inválido");
  const groups: Group[] = Array.from({ length: numGroups }, (_, i) => ({
    id: newId("g"),
    categoryId,
    index: i + 1,
    label: `Grupo ${i + 1}`,
  }));

  const seeded = [...registrations].sort((a, b) => {
    if (a.seed != null && b.seed != null) return a.seed - b.seed;
    if (a.seed != null) return -1;
    if (b.seed != null) return 1;
    return 0;
  });

  const unseeded = shuffle(
    seeded.filter((r) => r.seed == null),
    rng,
  );
  const withSeed = seeded.filter((r) => r.seed != null);
  const order = [...withSeed, ...unseeded];
  const capacities = groupCapacities(order.length, numGroups);
  const filled = capacities.map(() => 0);

  let cursor = 0;
  const updated = order.map((r) => {
    let steps = 0;
    while (filled[cursor] >= capacities[cursor]) {
      cursor = (cursor + 1) % numGroups;
      steps += 1;
      if (steps > numGroups) {
        throw new Error("Não foi possível distribuir as duplas nos grupos.");
      }
    }
    const groupIndex = cursor;
    filled[groupIndex] += 1;
    cursor = (cursor + 1) % numGroups;
    return { ...r, groupId: groups[groupIndex].id };
  });

  return { groups, registrations: updated };
}

/** Round-robin within a group */
export function buildRoundRobinMatches(
  categoryId: string,
  groupId: string,
  registrationIds: string[],
): Match[] {
  const ids = [...registrationIds];
  const matches: Match[] = [];
  let pos = 1;
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      matches.push({
        id: newId("m"),
        categoryId,
        phase: "GROUP",
        round: 1,
        position: pos++,
        groupId,
        sideAId: ids[i],
        sideBId: ids[j],
        status: "pending",
      });
    }
  }
  return matches;
}

/** Explicit residual draw — persists caller-provided order (or shuffled with rng). */
export function performResidualDraw(
  registrationIds: string[],
  rng: () => number = Math.random,
): string[] {
  return shuffle(registrationIds, rng);
}

/** Single-elimination KO from list of registration ids (direct KO format). */
export function buildDirectKoBracket(
  categoryId: string,
  registrationIds: string[],
): Match[] {
  const n = registrationIds.length;
  let size = 1;
  while (size < n) size *= 2;
  const byeCount = size - n;

  // Place BYEs against top seeds (first entries)
  const slots: (string | "BYE")[] = [...registrationIds];
  for (let i = 0; i < byeCount; i++) slots.push("BYE");

  // Pair 0 vs last, etc. — explicit: first half vs second half reversed
  const round1Count = size / 2;
  const matches: Match[] = [];
  const r1: Match[] = [];

  for (let i = 0; i < round1Count; i++) {
    const a = slots[i];
    const b = slots[size - 1 - i];
    const m: Match = {
      id: newId("m"),
      categoryId,
      phase: "KO",
      round: 1,
      position: i + 1,
      sideAId: a === "BYE" ? undefined : a,
      sideBId: b === "BYE" ? undefined : b,
      placeholderA: a === "BYE" ? "BYE" : undefined,
      placeholderB: b === "BYE" ? "BYE" : undefined,
      status: a === "BYE" || b === "BYE" ? "bye" : "pending",
      winnerRegistrationId:
        a === "BYE" && b !== "BYE" ? b : b === "BYE" && a !== "BYE" ? a : undefined,
    };
    r1.push(m);
    matches.push(m);
  }

  let prev = r1;
  let round = 2;
  while (prev.length > 1) {
    const next: Match[] = [];
    for (let i = 0; i < prev.length; i += 2) {
      const m: Match = {
        id: newId("m"),
        categoryId,
        phase: "KO",
        round,
        position: next.length + 1,
        placeholderA: `Vencedor R${round - 1} #${prev[i].position}`,
        placeholderB: `Vencedor R${round - 1} #${prev[i + 1].position}`,
        status: "pending",
      };
      prev[i].feedsToMatchId = m.id;
      prev[i].feedsToSlot = "A";
      prev[i + 1].feedsToMatchId = m.id;
      prev[i + 1].feedsToSlot = "B";
      // propagate bye winners
      if (prev[i].winnerRegistrationId) {
        m.sideAId = prev[i].winnerRegistrationId;
        m.placeholderA = undefined;
      }
      if (prev[i + 1].winnerRegistrationId) {
        m.sideBId = prev[i + 1].winnerRegistrationId;
        m.placeholderB = undefined;
      }
      next.push(m);
      matches.push(m);
    }
    prev = next;
    round += 1;
  }

  return matches;
}
