import { createClient } from "@supabase/supabase-js";

// Server-only helpers for silent autosave + history of analyzed scenarios.
// This file is *.server.ts so it is never bundled into the client. Import it
// only from inside a createServerFn .handler() via `await import(...)`.

function getSupabase() {
  const url = process.env.LOFI_SUPABASE_URL;
  const key = process.env.LOFI_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Scenario history is not configured (missing LOFI_SUPABASE_URL / LOFI_SUPABASE_ANON_KEY).",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type SavedScenarioRow = {
  id: string;
  rawScenario: string;
  selectedProgram: string;
  analysis: unknown;
  updatedAt: string;
};

/**
 * Silently upsert a finished analysis into public.saved_scenarios.
 * Best-effort: returns the new row id, or null if the write was rejected
 * (e.g. RLS) so the caller can stay quiet and never break the UI.
 */
export async function saveScenarioRow(input: {
  rawScenario: string;
  selectedProgram: string;
  analysis: unknown;
}): Promise<{ id: string | null; error: string | null }> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("saved_scenarios")
    .insert({
      raw_scenario: input.rawScenario,
      selected_program: input.selectedProgram,
      analysis_output: input.analysis as Record<string, unknown>,
    })
    .select("id")
    .single();

  if (error) return { id: null, error: error.message };
  return { id: (data?.id as string) ?? null, error: null };
}

/** Pull the most recent saved scenarios, newest first. */
export async function listScenarioRows(limit = 30): Promise<SavedScenarioRow[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("saved_scenarios")
    .select("id, raw_scenario, selected_program, analysis_output, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`saved_scenarios read failed: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => ({
    id: String(row.id),
    rawScenario: String(row.raw_scenario ?? ""),
    selectedProgram: String(row.selected_program ?? ""),
    analysis: row.analysis_output ?? null,
    updatedAt: String(row.updated_at ?? ""),
  }));
}
