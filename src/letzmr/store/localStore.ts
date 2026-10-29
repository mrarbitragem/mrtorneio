import type { LetzmrStore, Place } from "../domain/types";
import { newId } from "../domain/ids";

/** Estado vazio em memória (a gravação é feita pela camada de persistência no Supabase). */
export function emptyStore(): LetzmrStore {
  const place: Place = {
    id: newId("place"),
    name: "MRTorneio",
    slug: "mrtorneio",
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
