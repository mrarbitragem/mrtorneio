/** Lidas em build time (prefixo VITE_). */

export function normalizeSupabaseProjectUrl(url: string | undefined): string | undefined {
  if (url == null) return undefined;
  let t = String(url).trim();
  if (!t) return undefined;
  t = t.replace(/\/+$/, "");
  t = t.replace(/\/rest\/v1\/?$/i, "");
  return t.replace(/\/+$/, "") || undefined;
}

export const SUPABASE_PUBLIC_URL = normalizeSupabaseProjectUrl(
  import.meta.env.VITE_SUPABASE_URL as string | undefined,
);

export const SUPABASE_PUBLIC_KEY = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim()
);

export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_PUBLIC_URL && SUPABASE_PUBLIC_KEY);
}
