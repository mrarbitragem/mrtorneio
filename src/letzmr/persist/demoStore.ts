import type { LetzmrStore } from "../domain/types";
import { emptyStore } from "../store/localStore";
import type { LetzmrPersistence, PublicCategorySnapshot } from "./types";

/** Demo fictícia — localStorage isolado; nunca grava no Supabase. */
export const DEMO_KEY = "letzmr:demo:v1";
/** Legacy key from first MVP — never used for live; ignored by demo. */
export const LEGACY_LOCAL_KEY = "letzmr:v1";

export function loadDemoStore(): LetzmrStore {
  if (typeof localStorage === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(DEMO_KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as LetzmrStore;
    if (parsed.version !== 1) return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

export function saveDemoStore(store: LetzmrStore): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(DEMO_KEY, JSON.stringify(store));
}

export function clearDemoStore(): LetzmrStore {
  const s = emptyStore();
  saveDemoStore(s);
  return s;
}

export function createDemoPersistence(): LetzmrPersistence {
  let version = 0;
  return {
    mode: "demo",
    async load() {
      const store = loadDemoStore();
      if (store.tournaments.length > 0 && version === 0) version = 1;
      return { store, version };
    },
    async save(store, expectedVersion) {
      if (expectedVersion !== version) {
        return {
          ok: false,
          code: "conflict",
          message: "Conflito de versão na demo local (recarregue).",
        };
      }
      saveDemoStore(store);
      version = expectedVersion === 0 ? 1 : expectedVersion + 1;
      return { ok: true, version };
    },
    async publishCategory() {
      return { ok: true, version };
    },
    async unpublishCategory() {
      return { ok: true, version };
    },
    async loadPublicCategory(categoryId): Promise<PublicCategorySnapshot | null> {
      const store = loadDemoStore();
      const cat = store.categories.find((c) => c.id === categoryId && c.published);
      if (!cat) return null;
      const t = store.tournaments.find((x) => x.id === cat.tournamentId);
      return {
        categoryId: cat.id,
        tournamentId: cat.tournamentId,
        tournamentName: t?.name ?? "Torneio",
        categoryName: cat.name,
        snapshot: store,
        publishedAt: cat.createdAt,
      };
    },
  };
}
