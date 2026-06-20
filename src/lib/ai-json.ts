// Shared, resilient helpers for turning raw AI model text into validated data.
// Used by server functions that ask the model for JSON. Pure functions only —
// safe to import anywhere.

import { z, type ZodType } from "zod";

/**
 * A string field that tolerates a model returning a number/boolean instead of a
 * string (a common malformed-output pattern), but still rejects objects/arrays.
 */
export const flexString = z
  .union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()])
  .transform((v) => (v == null ? "" : String(v)));

/**
 * Extract the first balanced top-level JSON object from raw model output.
 * Strips markdown code fences and ignores braces inside string literals so we
 * don't truncate on `{` / `}` characters embedded in values.
 */
export function extractJsonObject(raw: string): string {
  let s = (raw ?? "").trim();
  if (!s) throw new Error("Model returned an empty response.");

  // Strip a leading ```json / ``` fence and a trailing ``` fence if present.
  s = s
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = s.indexOf("{");
  if (start === -1) throw new Error("Model response contained no JSON object.");

  let depth = 0;
  let inStr = false;
  let esc = false;
  for (let i = start; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (esc) esc = false;
      else if (ch === "\\") esc = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === "{") depth++;
    else if (ch === "}") {
      depth--;
      if (depth === 0) return s.slice(start, i + 1);
    }
  }

  // Unbalanced (likely truncated) — fall back to the last closing brace.
  const end = s.lastIndexOf("}");
  if (end > start) return s.slice(start, end + 1);

  throw new Error("Model response had an unterminated JSON object.");
}

/**
 * Extract, JSON.parse, and strictly validate model output against a schema.
 * Throws descriptive errors for empty / malformed / schema-invalid output so
 * callers can surface a clear message instead of a silent empty state.
 */
export function parseModelJson<T>(raw: string, schema: ZodType<T>): T {
  const jsonStr = extractJsonObject(raw);

  let data: unknown;
  try {
    data = JSON.parse(jsonStr);
  } catch (e) {
    throw new Error(
      `Model returned malformed JSON that could not be parsed: ${
        e instanceof Error ? e.message : String(e)
      }`,
    );
  }

  const result = schema.safeParse(data);
  if (!result.success) {
    const issues = result.error.issues
      .slice(0, 4)
      .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
      .join("; ");
    throw new Error(`Model output did not match the expected schema: ${issues}`);
  }
  return result.data;
}
