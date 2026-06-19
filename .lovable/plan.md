## Goal

Make the "Copy section" button produce output that, when pasted, looks exactly like the reference image: a condition title, a "What the Underwriter Needs:" callout, and a "Required Docs:" bullet with bold-labeled nested sub-bullets (e.g. "Rent Loss:", "Total Funds Needed:", "Critical Action:"). Also stop the translator from renaming documents — it must reuse the underwriter's exact verbiage (e.g. keep "Purchase Agreement").

## What the image format requires

```text
Hazard Insurance with Rent Loss
| What the Underwriter Needs: An updated insurance declarations page...

• Required Docs: Evidence of Insurance / Declarations Page
    • Rent Loss: Minimum 6 months coverage required
    • Hazards: Must explicitly include Wind and Hail coverage
    • Mortgagee Clause: Select Portfolio Servicing, INC.
```

The labels ("What the Underwriter Needs:", "Required Docs:", "Rent Loss:", "Critical Action:") are **bold**, items are bulleted, and important details are nested under Required Docs. Plain text alone can't carry bold/bullets, so the copy must write **rich text (HTML)** to the clipboard.

## Changes

### 1. `src/routes/index.tsx` — rewrite `copySection` (lines 164-205)

- Build an **HTML string** plus a **plain-text fallback** and write both via `navigator.clipboard.write([new ClipboardItem({ "text/html": ..., "text/plain": ... })])`, falling back to `writeText` if `ClipboardItem` is unavailable. This makes pasted output retain the formatting from the image (Word, Google Docs, email, etc.).
- Per condition, emit:
  - Condition `title` as a bold heading line.
  - A "What the Underwriter Needs:" line (bold label) using `plainEnglish`, styled as the left-bar callout.
  - A "Required Docs:" bullet (bold label). The first/primary doc from `docsToProvide` sits on the Required Docs line; remaining docs become bullets.
  - `keyDetails` rendered as **nested sub-bullets** under Required Docs. For any detail shaped like `Label: value`, the `Label:` portion is bolded (matching "Rent Loss:", "Total Funds Needed:", "Critical Action:").
- Keep excluding `original` and `reason` (unchanged from current behavior).
- Keep the existing "Copied!" feedback via `copiedSection`.

### 2. `src/lib/guidelines.functions.ts` — translator prompt (around lines 547-550)

Add an explicit instruction to the translate system prompt: when naming documents, **preserve the underwriter's exact terminology** from the source (do not substitute synonyms or "plain-English" renames — e.g. if the condition says "Purchase Agreement", call it "Purchase Agreement", not "purchase contract"). Also nudge `keyDetails` toward concise `Label: value` bullets so they render cleanly as the bold-labeled sub-bullets in the new format.

## Technical notes

- No backend/schema changes beyond the prompt wording; data shape (`title`, `plainEnglish`, `docsToProvide`, `keyDetails`) is unchanged.
- Clipboard write is frontend-only and guarded for browsers without `ClipboardItem`.
