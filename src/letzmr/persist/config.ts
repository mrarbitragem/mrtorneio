import { isSupabaseConfigured, SUPABASE_PUBLIC_URL } from "@/env/supabasePublic";

/** True when URL looks like a real project (not the repo placeholder). */
export function isLetzmrLiveConfigured(): boolean {
  if (!isSupabaseConfigured()) return false;
  const url = (SUPABASE_PUBLIC_URL ?? "").toLowerCase();
  if (!url) return false;
  if (url.includes("placeholder.supabase.co")) return false;
  if (url.includes("seu_ref.supabase.co")) return false;
  return true;
}

export const LETZMR_MODE_KEY = "letzmr:mode";

export function readStoredMode(): "demo" | "live" {
  if (typeof localStorage === "undefined") return "demo";
  const v = localStorage.getItem(LETZMR_MODE_KEY);
  return v === "live" ? "live" : "demo";
}

export function writeStoredMode(mode: "demo" | "live"): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LETZMR_MODE_KEY, mode);
}
