import { isSupabaseConfigured, SUPABASE_PUBLIC_URL } from "@/env/supabasePublic";

/** True quando a URL parece um projeto real (não o placeholder do repositório). */
export function isLetzmrLiveConfigured(): boolean {
  if (!isSupabaseConfigured()) return false;
  const url = (SUPABASE_PUBLIC_URL ?? "").toLowerCase();
  if (!url) return false;
  if (url.includes("placeholder.supabase.co")) return false;
  if (url.includes("seu_ref.supabase.co")) return false;
  return true;
}
