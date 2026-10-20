import { describe, expect, it, vi } from "vitest";

describe("isLetzmrLiveConfigured", () => {
  it("rejeita placeholder", async () => {
    vi.resetModules();
    vi.doMock("@/env/supabasePublic", () => ({
      isSupabaseConfigured: () => true,
      SUPABASE_PUBLIC_URL: "https://placeholder.supabase.co",
    }));
    const { isLetzmrLiveConfigured } = await import("./config");
    expect(isLetzmrLiveConfigured()).toBe(false);
  });

  it("aceita URL real", async () => {
    vi.resetModules();
    vi.doMock("@/env/supabasePublic", () => ({
      isSupabaseConfigured: () => true,
      SUPABASE_PUBLIC_URL: "https://abcdxyz.supabase.co",
    }));
    const { isLetzmrLiveConfigured } = await import("./config");
    expect(isLetzmrLiveConfigured()).toBe(true);
  });
});
