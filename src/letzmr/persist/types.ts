import type { LetzmrStore } from "../domain/types";

export type PersistResult =
  | { ok: true; version: number }
  | { ok: false; code: "unauthorized" | "conflict" | "network" | "not_configured" | "forbidden"; message: string };

export type PublicCategorySnapshot = {
  categoryId: string;
  tournamentId: string;
  tournamentName: string;
  categoryName: string;
  snapshot: LetzmrStore;
  publishedAt: string;
};

export interface LetzmrPersistence {
  load(): Promise<{ store: LetzmrStore; version: number }>;
  save(store: LetzmrStore, expectedVersion: number): Promise<PersistResult>;
  publishCategory(store: LetzmrStore, categoryId: string): Promise<PersistResult>;
  unpublishCategory(categoryId: string): Promise<PersistResult>;
  loadPublicCategory(categoryId: string): Promise<PublicCategorySnapshot | null>;
  /** Todas as categorias publicadas de um torneio (leitura aberta, sem login). */
  loadPublicTournament(tournamentId: string): Promise<PublicCategorySnapshot[]>;
}
