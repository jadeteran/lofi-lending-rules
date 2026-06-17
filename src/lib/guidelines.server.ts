import { createClient } from "@supabase/supabase-js";

// Server-only grounding helpers for the hybrid RAG + curated-rules model.
// This file is *.server.ts so it is never bundled into the client. Import it
// only from inside a createServerFn .handler() via `await import(...)`.

const EMBED_MODEL = "google/gemini-embedding-001";
const EMBED_DIMS = 3072; // must match guideline_library.embedding vector(3072)

function getSupabase() {
  const url = process.env.LOFI_SUPABASE_URL;
  const key = process.env.LOFI_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase grounding is not configured (missing LOFI_SUPABASE_URL / LOFI_SUPABASE_ANON_KEY).");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type LockedRule = Record<string, unknown>;

export type HandbookPassage = {
  content: string;
  citation: string;
  similarity: number;
};

export type GroundingContext = {
  lockedRules: LockedRule[];
  passages: HandbookPassage[];
  notes: string[];
};

/**
 * Pull the curated, locked numbers / caps / standard program criteria from
 * public.lofi_guidelines (Option 3 — controllable source of truth).
 * Schema-agnostic: returns whole rows so the model gets every column verbatim.
 */
async function fetchLockedRules(): Promise<LockedRule[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("lofi_guidelines")
    .select("*")
    .limit(500);
  if (error) throw new Error(`lofi_guidelines read failed: ${error.message}`);
  return data ?? [];
}

/** Embed the scenario query via the Lovable AI Gateway embeddings endpoint. */
async function embedQuery(text: string, lovableApiKey: string): Promise<number[]> {
  const res = await fetch("https://ai.gateway.lovable.dev/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableApiKey}`,
    },
    body: JSON.stringify({ model: EMBED_MODEL, input: text }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Embedding failed (${res.status}): ${body.slice(0, 300)}`);
  }
  const json = (await res.json()) as { data?: { embedding?: number[] }[] };
  const vec = json.data?.[0]?.embedding;
  if (!vec || vec.length === 0) throw new Error("Embedding response was empty.");
  if (vec.length !== EMBED_DIMS) {
    throw new Error(`Embedding dimension mismatch: got ${vec.length}, expected ${EMBED_DIMS}.`);
  }
  return vec;
}

/**
 * Vector similarity search against public.guideline_library via the
 * match_guidelines RPC (Option 1 — exact handbook passages for complex
 * scenario constraints).
 */
async function matchGuidelines(
  embedding: number[],
  matchCount = 6,
): Promise<HandbookPassage[]> {
  const supabase = getSupabase();
  const { data, error } = await supabase.rpc("match_guidelines", {
    query_embedding: embedding,
    match_count: matchCount,
  });
  if (error) throw new Error(`match_guidelines RPC failed: ${error.message}`);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const meta = (row.metadata ?? {}) as Record<string, unknown>;
    const citation =
      (typeof row.citation === "string" && row.citation) ||
      (typeof meta.citation === "string" && meta.citation) ||
      [meta.source, meta.section, meta.handbook]
        .filter((v) => typeof v === "string" && v)
        .join(" — ") ||
      "Uncited passage";
    return {
      content: String(row.content ?? ""),
      citation: String(citation),
      similarity: typeof row.similarity === "number" ? row.similarity : 0,
    };
  });
}

/**
 * Coordinate both grounding sources before report generation. Best-effort:
 * each source degrades independently so a single failure never blanks the
 * report, but every failure is surfaced in `notes` for transparency.
 */
export async function buildGroundingContext(
  query: string,
  lovableApiKey: string,
): Promise<GroundingContext> {
  const notes: string[] = [];

  const [rulesResult, passagesResult] = await Promise.allSettled([
    fetchLockedRules(),
    (async () => {
      const embedding = await embedQuery(query, lovableApiKey);
      return matchGuidelines(embedding);
    })(),
  ]);

  let lockedRules: LockedRule[] = [];
  if (rulesResult.status === "fulfilled") {
    lockedRules = rulesResult.value;
    if (lockedRules.length === 0) {
      notes.push("No curated locked rules found in lofi_guidelines for this query.");
    }
  } else {
    notes.push(`Curated rules unavailable: ${rulesResult.reason?.message ?? rulesResult.reason}`);
  }

  let passages: HandbookPassage[] = [];
  if (passagesResult.status === "fulfilled") {
    passages = passagesResult.value;
    if (passages.length === 0) {
      notes.push("No matching handbook passages returned from guideline_library.");
    }
  } else {
    notes.push(`Handbook retrieval unavailable: ${passagesResult.reason?.message ?? passagesResult.reason}`);
  }

  return { lockedRules, passages, notes };
}
