import type { LetzmrStore } from "../domain/types";

function categoryPublicFingerprint(store: LetzmrStore, categoryId: string): string {
  const matches = store.matches.filter((m) => m.categoryId === categoryId);
  const regs = store.registrations.filter((r) => r.categoryId === categoryId);
  return JSON.stringify({
    matches: matches.map((m) => ({
      id: m.id,
      status: m.status,
      sideAId: m.sideAId,
      sideBId: m.sideBId,
      winner: m.winnerRegistrationId,
      score: m.score,
      scheduledAt: m.scheduledAt,
    })),
    regs: regs.map((r) => ({ id: r.id, name: r.displayName, groupId: r.groupId })),
  });
}

export function publishedCategoryFingerprints(store: LetzmrStore): Map<string, string> {
  const map = new Map<string, string>();
  for (const cat of store.categories) {
    if (!cat.published) continue;
    map.set(cat.id, categoryPublicFingerprint(store, cat.id));
  }
  return map;
}

/** Categorias no ar cujo snapshot público precisa acompanhar a operação. */
export function publishedCategoriesToSync(
  before: Map<string, string>,
  after: LetzmrStore,
): string[] {
  const next = publishedCategoryFingerprints(after);
  const ids: string[] = [];
  for (const [id, fingerprint] of next) {
    if (before.get(id) !== fingerprint) ids.push(id);
  }
  return ids;
}
