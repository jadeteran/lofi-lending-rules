# Split "Documentation to Request" into operational buckets

Right now the report's fourth card shows a single flat list of documents. We'll restructure it so the Loan Officer sees the same items grouped into three clear action lanes, both in the AI output and in the on-screen card.

## The three buckets

1. **Borrower Tasks** — things only the borrower must produce/provide.
2. **Borrower & LO Collaboration** — items the borrower must help obtain or sign, coordinated with the LO.
3. **LO / Internal Broker Actions** — work the LO/broker handles internally.

Using the sample loan file, the items map like this (the AI will do this dynamically per scenario; this is the reference behavior):

```text
1) Borrower Tasks
   - Complete bank statements (all pages) covering finalized cash-to-close

2) Borrower & LO Collaboration
   - Updated HOI Declarations Page + Invoice (correct loss payee, address/zip)
   - Executed Subordination Agreement for the HELOC (Schedule B, Item #6)
   - Fully executed Final URLA (1003) and Form HUD-92900-A

3) LO / Internal Broker Actions
   - Revised FHA Streamline Worksheet (base loan amount ≤ $177,570)
   - Evidence of rate lock confirmation
```

## Backend — `src/lib/guidelines.functions.ts`

- Change the `Analysis` type so `documentation` is a structured object instead of a string:
  - `documentation: { borrowerTasks: string; collaboration: string; loActions: string }`
- Update `PreviousReportSchema` to match the new shape (so re-evaluation/override passes the structured doc buckets back in).
- Update the system prompt's `documentation` instruction to require a JSON object with exactly those three keys, each a `"- "` bulleted string. Add guidance defining each bucket:
  - borrowerTasks = items only the borrower provides
  - collaboration = items the borrower must help obtain or sign, jointly with the LO
  - loActions = internal LO/broker actions
- Update the response normalization/fallbacks to return the three keys (defaulting each to a "none" line).

## Frontend — `src/routes/index.tsx`

- Update the `documentation` rendering: replace the single `ResultCard` for documentation with one card that shows three labeled sub-sections (Borrower Tasks / Borrower & LO Collaboration / LO & Internal Actions), each rendering its bulleted string. Keep the existing `sage` accent and lofi styling.
- The other three cards (Guidelines, Roadblocks, LTV) stay unchanged.
- Versioning, timeline, and override flow keep working since they just pass `report` through.

## Technical notes

- This changes the JSON contract between the model and UI; both files must ship together so the structured `documentation` object renders correctly.
- No database/persistence changes — versions remain in component state.
- Styling stays on existing lofi tokens; only new sub-section structure inside the documentation card.