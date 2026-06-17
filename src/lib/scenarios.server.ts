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
  summaryTitle: string;
  creditScore: string;
  dti: string;
  ltv: string;
  propertyState: string;
  profileGroup: string;
};

/** Pull the structured catalog header out of the analysis JSON payload. */
function extractProfile(analysis: unknown) {
  const fp =
    (analysis && typeof analysis === "object"
      ? (analysis as Record<string, unknown>).fileProfile
      : null) as Record<string, unknown> | null;
  const s = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  return {
    summary_title: s(fp?.summaryTitle),
    credit_score: s(fp?.creditScore),
    dti: s(fp?.dti),
    ltv: s(fp?.ltv),
    property_state: s(fp?.propertyState),
    profile_group: s(fp?.profileGroup),
  };
}

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
      ...extractProfile(input.analysis),
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
    .select(
      "id, raw_scenario, selected_program, analysis_output, updated_at, summary_title, credit_score, dti, ltv, property_state, profile_group",
    )
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`saved_scenarios read failed: ${error.message}`);

  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : "");

  return (data ?? []).map((row: Record<string, unknown>) => {
    const fp =
      (row.analysis_output && typeof row.analysis_output === "object"
        ? (row.analysis_output as Record<string, unknown>).fileProfile
        : null) as Record<string, unknown> | null;
    return {
      id: String(row.id),
      rawScenario: String(row.raw_scenario ?? ""),
      selectedProgram: String(row.selected_program ?? ""),
      analysis: row.analysis_output ?? null,
      updatedAt: String(row.updated_at ?? ""),
      summaryTitle: str(row.summary_title) || str(fp?.summaryTitle),
      creditScore: str(row.credit_score) || str(fp?.creditScore),
      dti: str(row.dti) || str(fp?.dti),
      ltv: str(row.ltv) || str(fp?.ltv),
      propertyState: str(row.property_state) || str(fp?.propertyState),
      profileGroup: str(row.profile_group) || str(fp?.profileGroup),
    };
  });
}
