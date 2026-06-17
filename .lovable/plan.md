# Interactive "Ask the Assistant" card popovers

Make every report card in the Clean Report View clickable. Clicking a card opens a small anchored chat popover that already knows that card's label, value, and the full live report context, so the user can ask targeted questions and get AI answers.

## What the user gets
- Every metric/data card (Recommendation, Guideline Requirements, Roadblocks, LTV/Eligibility, Alternatives, Documentation) becomes clickable.
- Clicking a card highlights it with a glow/ring and opens a compact chat popover anchored beside/under it.
- The popover opens with a short auto-generated insight summary about that card, plus 3–4 suggested-question pills, a scrollable message history, and an input with a send button.
- Loading state ("thinking…") shows while the assistant responds.
- Click outside, press Escape, or click the close icon to dismiss; highlight clears.
- The assistant always answers using the current report state: active loan type, scenario text, selected version, and the full report JSON — so answers reflect whatever is currently active.

## Backend (new AI server function)
Add `askReportQuestion` to `src/lib/guidelines.functions.ts` (mirrors the existing `analyzeScenario` setup, reusing `createLovableAiGatewayProvider` and `google/gemini-3-flash-preview`):
- Input (Zod-validated): `cardId`/`cardLabel`, `cardValue` (the card's rendered text/data), `loanType`, `scenario`, `versionLabel`, the full `report` object, a `mode` of `"insight"` (auto summary on open) or `"chat"`, and prior `messages` (role/content array, capped, e.g. last ~12).
- Handler: builds a system prompt anchoring the model to the supplied report context as the source of truth, instructs concise, card-scoped answers, and calls `generateText`. For `mode: "insight"` it returns a 1–2 sentence summary; for `chat` it returns the answer to the latest user question.
- Returns a plain `{ text: string }` DTO. Surfaces gateway errors (429 rate limit / 402 credits) as readable messages.

No database or schema changes — this is stateless Q&A scoped to the in-memory report.

## Frontend
New component `src/components/ReportCardChat.tsx`:
- A reusable `CardChatPopover` plus a `useCardChat` controller (which card is open).
- Popover anchored to the active card, rendered with fixed/absolute positioning and a small arrow; auto-flips above/below depending on viewport space. Width ~340px, max-height with internal scroll for history.
- Sections: header (card label + close `X`), auto insight summary (loads via `askReportQuestion` `mode:"insight"` on open with a shimmer placeholder), message history (user right-aligned bubble using lofi tokens, assistant left as plain text), suggested-question pills (3–4, card-aware defaults like "What's the biggest risk here?", "Summarize this in one line", "What should the LO do next?", "Is this likely to get denied?"), and a textarea + send button.
- Loading: typing indicator while a request is in flight; send disabled meanwhile.
- Dismiss: outside-click listener, Escape key, and close button.
- Styling matches existing lofi design tokens (`--lofi-card`, `--lofi-cream-deep`, `--lofi-blue`, shadows) — no hardcoded colors.

Wiring in `src/routes/index.tsx`:
- Lift a single "active card" state into `StudyCorner` (only one popover open at a time).
- Make each report card accept `onOpenChat`, `isActive`, and a ref so the popover can anchor and the active card can show a ring/glow (`ring-2 ring-[var(--lofi-blue)]` + subtle shadow). Cards become buttons/clickable articles with keyboard focus support; existing inner interactive elements (version pills, etc.) keep working.
- Each card passes its own context payload (label + the text/structured data it renders) to the chat. The shared report context (loanType, scenario, selected version label, full `current.report`) is read from `StudyCorner` state at send time, so it stays in sync with the currently selected version/inputs.
- The popover calls `askReportQuestion` via `useServerFn`; insight summary fires once on open, follow-ups append to that card's local message history (kept in a map keyed by card id so switching cards preserves each conversation during the session).

## Notes / scope
- This app's "report state" is loan type + scenario + selected version + report JSON (there are no separate date/pipeline filters); the assistant context uses these real values so answers track the active selection.
- All AI calls stay server-side; `LOVABLE_API_KEY` is never exposed.
- Verify after build: click each card opens an anchored, highlighted popover; insight loads; a typed question returns an answer; pills prefill/send; outside-click/Escape/close all dismiss and clear the highlight.
