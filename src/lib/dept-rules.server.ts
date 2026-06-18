import { createClient } from "@supabase/supabase-js";

// Server-only persistence for learned condition→responsibility rules.
// We avoid a dedicated table (the external Supabase is managed without a
// migrations workflow here) and instead keep all learned rules inside a single
// sentinel row of public.saved_scenarios, keyed by selected_program.
// This file is *.server.ts so it never ships to the client.

export const DEPT_SENTINEL = "__dept_rules__";

export const RESPONSIBILITIES = ["LO", "Processor", "Borrower", "Title", "Closing", "Other"] as const;
export type Responsibility = (typeof RESPONSIBILITIES)[number];

export type DeptRule = {
  title: string;
  keywords: string;
  responsibility: string;
  updatedAt: string;
};

function getSupabase() {
  const url = process.env.LOFI_SUPABASE_URL;
  const key = process.env.LOFI_SUPABASE_SERVICE_ROLE_KEY || process.env.LOFI_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Department rules are not configured (missing LOFI_SUPABASE_URL / key).");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function normalizeResponsibility(raw: string): Responsibility {
  const r = raw.trim().toLowerCase();
  if (/(loan officer|^lo$|\blo\b|originator)/.test(r)) return "LO";
  if (/(process)/.test(r)) return "Processor";
  if (/(borrow|client|applicant)/.test(r)) return "Borrower";
  if (/(title|escrow)/.test(r)) return "Title";
  if (/(clos|funder|funding|settlement)/.test(r)) return "Closing";
  const exact = RESPONSIBILITIES.find((x) => x.toLowerCase() === r);
  return exact ?? "Other";
}

export async function readDeptRules(): Promise<DeptRule[]> {
  try {
    const sb = getSupabase();
    const { data, error } = await sb
      .from("saved_scenarios")
      .select("analysis_output")
      .eq("selected_program", DEPT_SENTINEL)
      .limit(1)
      .maybeSingle();
    if (error || !data) return [];
    const out = data.analysis_output as { rules?: unknown } | null;
    return Array.isArray(out?.rules) ? (out!.rules as DeptRule[]) : [];
  } catch {
    return [];
  }
}

export async function writeDeptRule(rule: DeptRule): Promise<void> {
  const sb = getSupabase();
  const existing = await readDeptRules();
  const norm = (s: string) => s.toLowerCase().trim();
  const filtered = existing.filter((r) => norm(r.title) !== norm(rule.title));
  const next = [...filtered, rule].slice(-300);

  const { data } = await sb
    .from("saved_scenarios")
    .select("id")
    .eq("selected_program", DEPT_SENTINEL)
    .limit(1)
    .maybeSingle();

  if (data?.id) {
    await sb
      .from("saved_scenarios")
      .update({ analysis_output: { rules: next } })
      .eq("id", data.id);
  } else {
    await sb.from("saved_scenarios").insert({
      raw_scenario: "",
      selected_program: DEPT_SENTINEL,
      analysis_output: { rules: next },
    });
  }
}
