import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// Server-only auth helpers. This file is *.server.ts so it is never bundled
// into the client. Import it only from inside a createServerFn .handler().

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Auth is not configured (missing ${name}).`);
  return value;
}

/** Service-role client — bypasses RLS. Privileged operations only. */
export function getAdminSupabase(): SupabaseClient {
  return createClient(
    requireEnv("LOFI_SUPABASE_URL"),
    requireEnv("LOFI_SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

/** Anon client used only to validate a caller's access token. */
function getAnonSupabase(): SupabaseClient {
  return createClient(
    requireEnv("LOFI_SUPABASE_URL"),
    requireEnv("LOFI_SUPABASE_ANON_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export type CallerUser = {
  id: string;
  email: string | null;
  role: string | null;
};

/**
 * Validate a bearer access token and confirm the caller is an admin.
 * These server functions are public endpoints on the published site, so the
 * role check here is mandatory.
 */
export async function verifyAdminCaller(accessToken: string): Promise<CallerUser> {
  if (!accessToken) throw new Error("Not authenticated.");
  const anon = getAnonSupabase();
  const { data, error } = await anon.auth.getUser(accessToken);
  if (error || !data.user) throw new Error("Not authenticated.");
  const role = (data.user.user_metadata?.role as string | undefined) ?? null;
  if (role !== "admin") throw new Error("Forbidden: admin access required.");
  return { id: data.user.id, email: data.user.email ?? null, role };
}
