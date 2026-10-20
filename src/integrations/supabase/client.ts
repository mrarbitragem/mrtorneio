import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  isSupabaseConfigured,
  SUPABASE_PUBLIC_KEY,
  SUPABASE_PUBLIC_URL,
} from "@/env/supabasePublic";

/** Null enquanto `VITE_SUPABASE_URL` e a chave pública não existirem. */
export const supabase: SupabaseClient | null =
  isSupabaseConfigured() && SUPABASE_PUBLIC_URL && SUPABASE_PUBLIC_KEY
    ? createClient(SUPABASE_PUBLIC_URL, SUPABASE_PUBLIC_KEY, {
        auth: {
          storage: localStorage,
          persistSession: true,
          autoRefreshToken: true,
        },
      })
    : null;
