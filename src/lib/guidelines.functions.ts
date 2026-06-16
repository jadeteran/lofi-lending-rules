import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";

export type Guideline = {
  id: number | string;
  loan_type: string | null;
  category: string | null;
  rule_name: string | null;
  guideline_text: string | null;
};

export const LOAN_TYPES = [
  "Conventional - Fannie Mae",
  "Conventional - Freddie Mac",
  "Government - FHA",
  "Government - VA",
  "HELOC / 2nd Liens",
  "Jumbo - Non-Conforming",
  "Non-QM / DSCR",
  "Private Money / Hard Money",
] as const;

export const getGuidelines = createServerFn({ method: "GET" }).handler(
  async (): Promise<Guideline[]> => {
    const url = process.env.LOFI_SUPABASE_URL;
    const key = process.env.LOFI_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error("Supabase connection is not configured.");
    }

    const supabase = createClient(url, key, {
      auth: {
        storage: undefined,
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const { data, error } = await supabase
      .from("lofi_guidelines")
      .select("id, loan_type, category, rule_name, guideline_text")
      .order("id", { ascending: true });

    if (error) throw new Error(error.message);
    return (data ?? []) as Guideline[];
  },
);
