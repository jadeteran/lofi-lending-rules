# UnderwriterPro — Plan

A fast, minimal single-page app that maps directly to the schema's two interactive inputs and one AI action, rendering a structured "Full dashboard report."

## What the schema defines (mapped to UI)
- **Loan Program Selection** → dropdown `<select>` with exactly 7 options:
  Conventional - Fannie Mae, Conventional - Freddie Mac, Government - FHA, Government - VA, Non-QM / DSCR, Jumbo - Non-Conforming, HELOC / 2nd Liens
- **Underwriting Scenario** (`ask_user_underwriting_scenario`, type `in`, title "Underwriting Scenario") → multiline `<textarea>`
- **Analyze / Generate Report** action → calls Lovable AI with the system instruction + report template from the schema's `node_step_underwriting_report`, returns markdown
- App title/description from schema: "UnderwriterPro" / "Analyze complex mortgage underwriting scenarios against official government loan program guidelines."

## UI (clean, scannable, no clutter)
Single route `/`, black/white minimal theme (matches default theme tokens `#1a1a1a` / `#ffffff`), generous whitespace, clear section headers.

```text
 UnderwriterPro
 Analyze mortgage scenarios against loan program guidelines
 ────────────────────────────────────────────
 Loan Program        [ Select ▾ ]
 Underwriting Scenario
 [  textarea …                              ]
 [ Generate Report ]
 ────────────────────────────────────────────
 REPORT (rendered after generation)
   Executive Loan Summary
   File Core Data Matrix (Borrower / Loan Transaction)
   Portal Conditions & Status Translation
   Strategic Loan Scenario Fixes
   Copy-Paste to LO   [Copy]
```

The report renders the AI's markdown output into the dashboard sections defined in the schema's render-outputs node.

## Technical implementation
- **AI backend**: ensure `LOVABLE_API_KEY` exists, add a server-only gateway helper `src/lib/ai-gateway.server.ts`, and a `createServerFn` (`src/lib/underwriting.functions.ts`) that takes `{ loanProgram, scenario }`, validates with Zod, and calls Lovable AI (`google/gemini-3-flash-preview`) using the schema's system instruction + report framework as the prompt. Returns `{ report: string }` markdown.
- **Frontend**: `src/routes/index.tsx` — controlled `select` + `textarea`, a submit handler using `useServerFn` inside a `useMutation` (TanStack Query is already wired), loading/disabled states, and error handling for 429 (rate limit) / 402 (credits) surfaced as inline messages.
- **Markdown rendering**: lightweight render of the returned markdown (add `react-markdown`, a small dependency) so the dashboard headers/tables/bullets display cleanly. A "Copy to clipboard" button on the report.
- **Performance**: no heavy UI libraries; plain Tailwind, single component, no nested data maps. SEO head (title <60, description <160), single H1.
- **No database** (no persistence requested). The 4 reference guidebook PDFs in the schema are source material the AI reasons about via its prompt knowledge; they are not uploaded files in this project, so the report is generated from the scenario + program against the model's guideline knowledge (matching the schema's prompt design).

## Files
- `src/lib/ai-gateway.server.ts` (gateway provider helper)
- `src/lib/underwriting.functions.ts` (`generateReport` server fn)
- `src/routes/index.tsx` (full UI, replaces placeholder)
- `package.json` (+ `ai`, `@ai-sdk/openai-compatible`, `react-markdown`)

## Verification
Invoke the server function with a sample scenario, confirm a structured report returns, then screenshot the preview to check layout and whitespace.