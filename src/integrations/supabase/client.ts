import { createClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLIC_KEY, SUPABASE_PUBLIC_URL } from "@/env/supabasePublic";

export const supabase = createClient(
  SUPABASE_PUBLIC_URL ?? "",
  SUPABASE_PUBLIC_KEY ?? "",
  {
    auth: {
      storage: localStorage,
      persistSession: true,
      autoRefreshToken: true,
    },
  },
);
