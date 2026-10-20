import { describe, expect, it, vi } from "vitest";
import { emptyStore } from "../store/localStore";
import { createSupabasePersistence } from "./supabaseRepo";
import { createDemoPersistence, DEMO_KEY, LEGACY_LOCAL_KEY } from "./demoStore";
import { seedDemoTournament } from "../demo/seedDemo";

function mockClient(handlers: {
  selectState?: () => { data: unknown; error: null | { message: string; code?: string } };
  updateState?: () => { data: unknown; error: null | { message: string } };
  insertState?: () => { error: null | { message: string; code?: string } };
  upsertPublic?: () => { error: null | { message: string } };
  deletePublic?: () => { error: null | { message: string } };
  selectPublic?: () => { data: unknown; error: null | { message: string } };
}) {
  const from = vi.fn((table: string) => {
    if (table === "letzmr_organizer_state") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => handlers.selectState?.() ?? { data: null, error: null },
          }),
        }),
        insert: async () => handlers.insertState?.() ?? { error: null },
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: async () => handlers.updateState?.() ?? { data: [{ version: 2 }], error: null },
            }),
          }),
        }),
      };
    }
    return {
      upsert: async () => handlers.upsertPublic?.() ?? { error: null },
      delete: () => ({
        eq: () => ({
          eq: async () => handlers.deletePublic?.() ?? { error: null },
        }),
      }),
      select: () => ({
        eq: () => ({
          maybeSingle: async () => handlers.selectPublic?.() ?? { data: null, error: null },
        }),
      }),
    };
  });
  return { from } as never;
}

describe("demo separada do live", () => {
  it("grava só em letzmr:demo:v1", async () => {
    localStorage.clear();
    const demo = createDemoPersistence();
    const store = seedDemoTournament();
    const r = await demo.save(store, 0);
    expect(r.ok).toBe(true);
    expect(localStorage.getItem(DEMO_KEY)).toBeTruthy();
    expect(localStorage.getItem(LEGACY_LOCAL_KEY)).toBeNull();
  });
});

describe("auth gate na camada de gravação", () => {
  it("recusa save sem user", async () => {
    const p = createSupabasePersistence({
      client: mockClient({}),
      getUserId: () => null,
    });
    const r = await p.save(emptyStore(), 0);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.code).toBe("unauthorized");
  });

  it("recusa torneio de outro organizador", async () => {
    const p = createSupabasePersistence({
      client: mockClient({}),
      getUserId: () => "user-a",
    });
    const store = emptyStore();
    store.tournaments.push({
      id: "t1",
      placeId: store.place.id,
      name: "X",
      organizerId: "user-b",
      status: "open",
      createdAt: new Date().toISOString(),
    });
    const r = await p.save(store, 0);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.code).toBe("forbidden");
  });
});

describe("isolamento / concorrência", () => {
  it("detecta conflito de versão (gravação concorrente)", async () => {
    const p = createSupabasePersistence({
      client: mockClient({
        updateState: () => ({ data: [], error: null }),
      }),
      getUserId: () => "user-a",
    });
    const store = emptyStore();
    store.tournaments.push({
      id: "t1",
      placeId: store.place.id,
      name: "Mine",
      organizerId: "user-a",
      status: "open",
      createdAt: new Date().toISOString(),
    });
    const r = await p.save(store, 3);
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.code).toBe("conflict");
  });

  it("load de outro organizer não é feito — query filtra por auth uid", async () => {
    const selectEq = vi.fn();
    const client = {
      from: () => ({
        select: () => ({
          eq: (col: string, val: string) => {
            selectEq(col, val);
            return { maybeSingle: async () => ({ data: null, error: null }) };
          },
        }),
      }),
    };
    const p = createSupabasePersistence({
      client: client as never,
      getUserId: () => "org-1",
    });
    await p.load();
    expect(selectEq).toHaveBeenCalledWith("organizer_id", "org-1");
  });
});

describe("público RO", () => {
  it("loadPublicCategory retorna snapshot publicado", async () => {
    const snap = emptyStore();
    const p = createSupabasePersistence({
      client: mockClient({
        selectPublic: () => ({
          data: {
            category_id: "c1",
            tournament_id: "t1",
            tournament_name: "Open",
            category_name: "SF",
            snapshot: snap,
            published_at: "2026-10-16T00:00:00.000Z",
          },
          error: null,
        }),
      }),
      getUserId: () => "user-a",
    });
    const pub = await p.loadPublicCategory("c1");
    expect(pub?.categoryName).toBe("SF");
    expect(pub?.tournamentName).toBe("Open");
  });

  it("publish exige login", async () => {
    const p = createSupabasePersistence({
      client: mockClient({}),
      getUserId: () => null,
    });
    const r = await p.publishCategory(emptyStore(), "c1");
    expect(r.ok).toBe(false);
    expect(r.ok === false && r.code).toBe("unauthorized");
  });
});
