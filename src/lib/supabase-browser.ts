import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getPublicAuthConfig } from "./auth.functions";

// Browser-only Supabase client used for authentication. This project uses a
// custom (non-Cloud) Supabase setup whose URL + anon key live in server-only
// secrets, so we fetch the publishable config once and lazily build a singleton
// client that persists the session in localStorage.

let clientPromise: Promise<SupabaseClient> | null = null;

export function getBrowserSupabase(): Promise<SupabaseClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const { url, anonKey } = await getPublicAuthConfig();
      return createClient(url, anonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: "lofi-auth",
        },
      });
    })();
  }
  return clientPromise;
}
