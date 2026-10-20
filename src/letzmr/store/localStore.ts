import type { LetzmrStore, Place } from "../domain/types";
import { newId } from "../domain/ids";

const KEY = "letzmr:v1";

export function emptyStore(): LetzmrStore {
  const place: Place = {
    id: newId("place"),
    name: "LETZMR Demo Place",
    slug: "letzmr-demo",
  };
  return {
    version: 1,
    place,
    tournaments: [],
    categories: [],
    athletes: [],
    registrations: [],
    groups: [],
    matches: [],
    residualDraws: [],
  };
}

export function loadStore(): LetzmrStore {
  if (typeof localStorage === "undefined") return emptyStore();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return emptyStore();
    const parsed = JSON.parse(raw) as LetzmrStore;
    if (parsed.version !== 1) return emptyStore();
    return parsed;
  } catch {
    return emptyStore();
  }
}

export function saveStore(store: LetzmrStore): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(store));
}

export function resetStore(): LetzmrStore {
  const s = emptyStore();
  saveStore(s);
  return s;
}
