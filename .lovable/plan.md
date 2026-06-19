## Goal
Add a "Copy section" button to each department group header (Borrower, Loan Processor, LO, Title, Closing, etc.) on the Condition Translation report. Clicking it copies every condition in that section to the clipboard, including **only** the plain-English condition, documents to provide, and important details — excluding the original condition and the "why they ask for this" reason.

## Changes (all in `src/routes/index.tsx`)

1. **Add a copy helper** inside the translations section that, given a department's filtered `items`, builds a plain-text string. For each condition it includes:
   - The condition title
   - Plain English (`plainEnglish`)
   - Documents to Provide (`docsToProvide`)
   - Important Details & Requirements (`keyDetails`)
   
   It will **omit** `original` and `reason`. Conditions are separated by a blank line / divider so the pasted list reads cleanly by section.

2. **Add a "Copy section" button** next to each department header (around lines 652–663, beside the department badge and count). On click it writes the built text via `navigator.clipboard.writeText(...)` and shows brief "Copied!" feedback (local `copiedSection` state keyed by department).

## Example copied output for "Borrower"
```text
LLC Formation and Operating Documents

Plain English:
The lender needs the official paperwork that created your business...

Documents to Provide:
- Articles of Organization
- Signed and Dated Operating Agreement

Important Details & Requirements:
- Entity Name: Big Jay Rentals LLC
- Requirement: Documents must be fully signed and dated...

────────────
(next condition...)
```

No backend or server-function changes are needed — this is purely a frontend/clipboard feature.