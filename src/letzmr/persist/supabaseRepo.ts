import type { SupabaseClient } from "@supabase/supabase-js";
import { slugsFor } from "../domain/slug";
import type { LetzmrStore } from "../domain/types";
import { emptyStore } from "../store/localStore";
import type {
  LetzmrPersistence,
  PersistResult,
  PublicCategorySnapshot,
  PublicTournamentSummary,
} from "./types";

export type OrganizerStateRow = {
  organizer_id: string;
  place: LetzmrStore["place"];
  payload: {
    tournaments: LetzmrStore["tournaments"];
    categories: LetzmrStore["categories"];
    athletes: LetzmrStore["athletes"];
    registrations: LetzmrStore["registrations"];
    groups: LetzmrStore["groups"];
    matches: LetzmrStore["matches"];
    residualDraws: LetzmrStore["residualDraws"];
  };
  version: number;
  updated_at: string;
};

function storeFromRow(row: OrganizerStateRow): LetzmrStore {
  return {
    version: 1,
    place: row.place,
    tournaments: row.payload.tournaments ?? [],
    categories: row.payload.categories ?? [],
    athletes: row.payload.athletes ?? [],
    registrations: row.payload.registrations ?? [],
    groups: row.payload.groups ?? [],
    matches: row.payload.matches ?? [],
    residualDraws: row.payload.residualDraws ?? [],
  };
}

function payloadFromStore(store: LetzmrStore) {
  return {
    tournaments: store.tournaments,
    categories: store.categories,
    athletes: store.athletes,
    registrations: store.registrations,
    groups: store.groups,
    matches: store.matches,
    residualDraws: store.residualDraws,
  };
}

function buildCategorySnapshot(store: LetzmrStore, categoryId: string): LetzmrStore | null {
  const cat = store.categories.find((c) => c.id === categoryId);
  if (!cat) return null;
  const groupIds = new Set(
    store.groups.filter((g) => g.categoryId === categoryId).map((g) => g.id),
  );
  return {
    version: 1,
    place: store.place,
    tournaments: store.tournaments.filter((t) => t.id === cat.tournamentId),
    categories: [cat],
    athletes: store.athletes,
    registrations: store.registrations.filter((r) => r.categoryId === categoryId),
    groups: store.groups.filter((g) => g.categoryId === categoryId),
    matches: store.matches.filter((m) => m.categoryId === categoryId),
    residualDraws: store.residualDraws.filter((d) => groupIds.has(d.groupId)),
  };
}

function toPublicSnapshot(
  data: Record<string, unknown>,
  tournamentSlug: string,
  categorySlug: string,
): PublicCategorySnapshot {
  return {
    categoryId: data.category_id as string,
    tournamentId: data.tournament_id as string,
    tournamentName: data.tournament_name as string,
    categoryName: data.category_name as string,
    tournamentSlug,
    categorySlug,
    snapshot: data.snapshot as LetzmrStore,
    publishedAt: data.published_at as string,
  };
}

function decoratePublicRows(rows: Record<string, unknown>[]): PublicCategorySnapshot[] {
  const tournamentSlugs = slugsFor(
    uniqueNamed(
      rows.map((row) => ({
        id: row.tournament_id as string,
        name: row.tournament_name as string,
      })),
    ),
  );
  const byTournament = new Map<string, { id: string; name: string }[]>();
  for (const row of rows) {
    const tid = row.tournament_id as string;
    const list = byTournament.get(tid) ?? [];
    list.push({ id: row.category_id as string, name: row.category_name as string });
    byTournament.set(tid, list);
  }
  const categorySlugs = new Map<string, string>();
  for (const cats of byTournament.values()) {
    for (const [id, slug] of slugsFor(uniqueNamed(cats))) {
      categorySlugs.set(id, slug);
    }
  }
  return rows.map((row) =>
    toPublicSnapshot(
      row,
      tournamentSlugs.get(row.tournament_id as string) ?? "torneio",
      categorySlugs.get(row.category_id as string) ?? "categoria",
    ),
  );
}

function uniqueNamed(items: { id: string; name: string }[]): { id: string; name: string }[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

export function createSupabasePersistence(args: {
  client: SupabaseClient;
  getUserId: () => string | null;
}): LetzmrPersistence {
  const { client, getUserId } = args;

  const requireUser = (): string | PersistResult => {
    const uid = getUserId();
    if (!uid) {
      return {
        ok: false,
        code: "unauthorized",
        message: "Faça login como organizador para gravar no Supabase.",
      };
    }
    return uid;
  };

  async function fetchAllPublic(): Promise<Record<string, unknown>[]> {
    const { data, error } = await client
      .from("letzmr_public_categories")
      .select("*")
      .order("category_name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as Record<string, unknown>[];
  }

  return {
    async load() {
      const uid = getUserId();
      if (!uid) {
        return { store: emptyStore(), version: 0 };
      }
      const { data, error } = await client
        .from("letzmr_organizer_state")
        .select("*")
        .eq("organizer_id", uid)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) {
        const blank = emptyStore();
        blank.place = {
          id: `place_${uid.slice(0, 8)}`,
          name: "MRTorneio",
          slug: `org-${uid.slice(0, 8)}`,
        };
        return { store: blank, version: 0 };
      }
      return { store: storeFromRow(data as OrganizerStateRow), version: data.version as number };
    },

    async save(store, expectedVersion): Promise<PersistResult> {
      const uidOrErr = requireUser();
      if (typeof uidOrErr !== "string") return uidOrErr;
      const uid = uidOrErr;

      // Enforce organizer ownership on every write (client-side gate; RLS is authoritative)
      if (store.tournaments.some((t) => t.organizerId && t.organizerId !== uid)) {
        return {
          ok: false,
          code: "forbidden",
          message: "Torneio pertence a outro organizador.",
        };
      }

      const nextVersion = expectedVersion + 1;
      const row = {
        organizer_id: uid,
        place: store.place,
        payload: payloadFromStore(store),
        version: expectedVersion === 0 ? 1 : nextVersion,
        updated_at: new Date().toISOString(),
      };

      if (expectedVersion === 0) {
        const { error } = await client.from("letzmr_organizer_state").insert({
          ...row,
          version: 1,
        });
        if (error) {
          if (error.code === "23505") {
            return {
              ok: false,
              code: "conflict",
              message: "Estado já existe — recarregue e tente de novo.",
            };
          }
          return { ok: false, code: "network", message: error.message };
        }
        return { ok: true, version: 1 };
      }

      const { data, error } = await client
        .from("letzmr_organizer_state")
        .update({
          place: row.place,
          payload: row.payload,
          version: nextVersion,
          updated_at: row.updated_at,
        })
        .eq("organizer_id", uid)
        .eq("version", expectedVersion)
        .select("version");

      if (error) return { ok: false, code: "network", message: error.message };
      if (!data?.length) {
        return {
          ok: false,
          code: "conflict",
          message:
            "Gravação concorrente detectada (versão desatualizada). Recarregue os dados do servidor.",
        };
      }
      return { ok: true, version: nextVersion };
    },

    async publishCategory(store, categoryId): Promise<PersistResult> {
      const uidOrErr = requireUser();
      if (typeof uidOrErr !== "string") return uidOrErr;
      const uid = uidOrErr;
      const snap = buildCategorySnapshot(store, categoryId);
      if (!snap) return { ok: false, code: "forbidden", message: "Categoria não encontrada" };
      const cat = snap.categories[0];
      const t = snap.tournaments[0];
      const { error } = await client.from("letzmr_public_categories").upsert(
        {
          category_id: categoryId,
          tournament_id: cat.tournamentId,
          organizer_id: uid,
          tournament_name: t?.name ?? "Torneio",
          category_name: cat.name,
          snapshot: snap,
          published_at: new Date().toISOString(),
        },
        { onConflict: "category_id" },
      );
      if (error) return { ok: false, code: "network", message: error.message };
      return { ok: true, version: -1 };
    },

    async unpublishCategory(categoryId): Promise<PersistResult> {
      const uidOrErr = requireUser();
      if (typeof uidOrErr !== "string") return uidOrErr;
      const uid = uidOrErr;
      const { error } = await client
        .from("letzmr_public_categories")
        .delete()
        .eq("category_id", categoryId)
        .eq("organizer_id", uid);
      if (error) return { ok: false, code: "network", message: error.message };
      return { ok: true, version: -1 };
    },

    async loadPublicCategory(categoryId): Promise<PublicCategorySnapshot | null> {
      const { data, error } = await client
        .from("letzmr_public_categories")
        .select("*")
        .eq("category_id", categoryId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) return null;
      return decoratePublicRows([data as Record<string, unknown>])[0] ?? null;
    },

    async loadPublicCategoryBySlug(
      tournamentSlug: string,
      categorySlug: string,
    ): Promise<PublicCategorySnapshot | null> {
      const rows = await fetchAllPublic();
      return (
        decoratePublicRows(rows).find(
          (row) => row.tournamentSlug === tournamentSlug && row.categorySlug === categorySlug,
        ) ?? null
      );
    },

    async listPublicTournaments(): Promise<PublicTournamentSummary[]> {
      const { data, error } = await client
        .from("letzmr_public_categories")
        .select("category_id,tournament_id,tournament_name,category_name,published_at")
        .order("published_at", { ascending: false });
      if (error) throw new Error(error.message);
      const decorated = decoratePublicRows((data ?? []) as Record<string, unknown>[]);
      const byTournament = new Map<string, PublicTournamentSummary>();
      for (const row of decorated) {
        const current = byTournament.get(row.tournamentId) ?? {
          tournamentId: row.tournamentId,
          tournamentName: row.tournamentName,
          tournamentSlug: row.tournamentSlug,
          categories: [],
          updatedAt: row.publishedAt,
        };
        current.categories.push({
          categoryId: row.categoryId,
          categoryName: row.categoryName,
          categorySlug: row.categorySlug,
        });
        if (row.publishedAt > current.updatedAt) current.updatedAt = row.publishedAt;
        byTournament.set(row.tournamentId, current);
      }
      return [...byTournament.values()]
        .map((t) => ({
          ...t,
          categories: t.categories.sort((a, b) => a.categoryName.localeCompare(b.categoryName)),
        }))
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    },

    async loadPublicTournament(tournamentId): Promise<PublicCategorySnapshot[]> {
      const { data, error } = await client
        .from("letzmr_public_categories")
        .select("*")
        .eq("tournament_id", tournamentId)
        .order("category_name", { ascending: true });
      if (error) throw new Error(error.message);
      return decoratePublicRows((data ?? []) as Record<string, unknown>[]);
    },

    async loadPublicTournamentBySlug(tournamentSlug: string): Promise<PublicCategorySnapshot[]> {
      const rows = await fetchAllPublic();
      const decorated = decoratePublicRows(rows);
      const match = decorated.find((row) => row.tournamentSlug === tournamentSlug);
      if (!match) return [];
      return decorated.filter((row) => row.tournamentId === match.tournamentId);
    },
  };
}
