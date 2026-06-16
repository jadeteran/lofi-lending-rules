# AI Guideline Assistant

Replace the external Supabase-backed guideline list with an interactive AI assistant that analyzes loan scenarios. Keep the exact lofi theme, layout shell, and alphabetical Loan Program dropdown.

## What changes

### 1. Backend AI server function (`src/lib/guidelines.functions.ts`)
- Remove the Supabase query (`getGuidelines`) and the `Guideline` type/`@supabase/supabase-js` import.
- Keep `LOAN_TYPES` (the fixed 8-item list, already alphabetical by category).
- Add a new `analyzeScenario` `createServerFn({ method: "POST" })` that:
  - Validates input `{ loanType: string, scenario: string }`.
  - Calls **Lovable AI** (`google/gemini-3-flash-preview`) via the AI SDK + Lovable AI Gateway helper, reading `LOVABLE_API_KEY` inside the handler.
  - Uses structured output (`Output.object`) to return three sections:
    - `guidelineRequirements` — standard guideline requirements for that program.
    - `roadblocks` — potential roadblocks/red flags.
    - `documentation` — documents to request from the borrower to clear it.
  - System prompt frames the model as a senior mortgage underwriting assistant for the selected loan program.
- Add the Lovable AI Gateway provider helper at `src/lib/ai-gateway.server.ts`.
- Ensure `LOVABLE_API_KEY` is provisioned (auto-created if missing).

### 2. Frontend rewrite (`src/routes/index.tsx`)
- Drop the loader/`useSuspenseQuery` data fetch and the search-filter card grid.
- Keep `Shell`, the lofi gradient, Nunito font, and header (retitle to "AI Guideline Assistant" while keeping the cozy tone).
- Keep the alphabetical Loan Program `<select>` (from `LOAN_TYPES`).
- Add a multiline scenario input bar ("Paste a tough stip or describe the loan scenario…") + a Submit button.
- On submit, call `analyzeScenario` via `useServerFn` inside a `useMutation` (loading state on the button, disabled while pending).
- Render the AI response as three themed cards reusing the existing card styling: **Guideline Requirements**, **Potential Roadblocks**, **Documentation to Request**.
- Empty/idle state keeps the relaxed placeholder vibe ("Queue the beats and drop a scenario to analyze…"); error state reuses the existing "record skipped a beat" styling and surfaces rate-limit/credit messages.

### 3. Cleanup
- The Supabase secrets (`LOFI_SUPABASE_URL`, `LOFI_SUPABASE_ANON_KEY`) are no longer used by the main view; leave them in place (harmless) unless you want them removed.

## Technical notes
- AI runs server-side only; `LOVABLE_API_KEY` never reaches the browser.
- Uses the AI SDK structured-output `Output` API with a small schema (3 string fields) to stay within model limits.
- No database, no GitHub JSON, no manual guideline management — output is generated on demand.
