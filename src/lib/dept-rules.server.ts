import { createClient } from "@supabase/supabase-js";

// Server-only persistence for learned condition→responsibility rules.
// Stored in a dedicated table: public.dept_rules (see db/migrations/0001_dept_rules_table.sql).
// This file is *.server.ts so it never ships to the client.

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
      .from("dept_rules")
      .select("title, keywords, responsibility, updated_at")
      .order("updated_at", { ascending: true })
      .limit(300);
    if (error || !data) return [];
    return data.map((row: Record<string, unknown>) => ({
      title: String(row.title ?? ""),
      keywords: String(row.keywords ?? ""),
      responsibility: String(row.responsibility ?? ""),
      updatedAt: String(row.updated_at ?? ""),
    }));
  } catch {
    return [];
  }
}

export async function writeDeptRule(rule: DeptRule): Promise<void> {
  const sb = getSupabase();
  // Case-insensitive title is the natural key. Delete any prior mapping for the
  // same title (the unique index on lower(title) is an expression index that
  // PostgREST upsert can't target), then insert the fresh rule.
  await sb.from("dept_rules").delete().ilike("title", rule.title);
  const { error } = await sb.from("dept_rules").insert({
    title: rule.title,
    keywords: rule.keywords,
    responsibility: rule.responsibility,
    updated_at: rule.updatedAt,
  });
  if (error) throw new Error(`dept_rules write failed: ${error.message}`);
}
