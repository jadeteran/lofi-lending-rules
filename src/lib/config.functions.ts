import { createServerFn } from "@tanstack/react-start";

// Required server-side environment variables for the app to function. The
// frontend queries this to render a clear configuration warning instead of
// silently failing into empty states when a key is missing.
const REQUIRED_ENV = [
  "LOVABLE_API_KEY",
  "LOFI_SUPABASE_URL",
  "LOFI_SUPABASE_ANON_KEY",
  "LOFI_SUPABASE_SERVICE_ROLE_KEY",
] as const;

// Friendly labels keyed by env var, for the UI warning.
const ENV_LABELS: Record<(typeof REQUIRED_ENV)[number], string> = {
  LOVABLE_API_KEY: "AI Gateway key (LOVABLE_API_KEY)",
  LOFI_SUPABASE_URL: "Database URL (LOFI_SUPABASE_URL)",
  LOFI_SUPABASE_ANON_KEY: "Database anon key (LOFI_SUPABASE_ANON_KEY)",
  LOFI_SUPABASE_SERVICE_ROLE_KEY: "Database service role key (LOFI_SUPABASE_SERVICE_ROLE_KEY)",
};

export type ConfigStatus = {
  ok: boolean;
  /** Friendly labels for any missing required variables. */
  missing: string[];
};

export const getConfigStatus = createServerFn({ method: "GET" }).handler(
  async (): Promise<ConfigStatus> => {
    const missing = REQUIRED_ENV.filter((key) => {
      const v = process.env[key];
      return !v || v.trim() === "";
    }).map((key) => ENV_LABELS[key]);

    return { ok: missing.length === 0, missing };
  },
);
