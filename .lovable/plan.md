## Goal

Turn the one-shot analyzer into a living loan-file workspace. After the first analysis, the user can feed in updated context or operational overrides; the assistant re-evaluates everything against the prior report — removing invalidated roadblocks, recalculating max allowable LTV/CLTV, and updating the document checklist. Each pass becomes a numbered version, navigable with a version switcher and tracked in a chronological event timeline.

## Layout

```text
+--------------------------------------------------+------------------+
|  Header: 🎧 AI Guideline Assistant               |  EVENT TIMELINE  |
|                                                  |                  |
|  [Loan program ▾]  [context/override box]        |  • v1 created    |
|  [📎 upload]                [Analyze / Update]    |    10:02 · base  |
|                                                  |  • v2 override   |
|  Clean Report View          v1  v2 [v3]  ◄ switch|    10:08 · "rate |
|  ┌─ 📋 Guideline Requirements ─┐                 |     & term now"  |
|  ┌─ 🚧 Roadblocks ─────────────┐                 |  • v3 override   |
|  ┌─ 📊 LTV / Eligibility ──────┐  (NEW)          |    10:15 · ...   |
|  ┌─ 📂 Documentation ──────────┐                 |                  |
+--------------------------------------------------+------------------+
```

The right timeline sidebar is collapsible (so the report can go full width on smaller screens). The version switcher (v1, v2, v3…) sits at the top-right of the Clean Report View and swaps which stored version is shown — viewing an old version is read-only; submitting a new override always creates the next version.

## Behavior

1. **First run (v1):** same as today — pick a loan program, type/paste/upload a scenario, hit Analyze. Produces v1 with the now-four sections.
2. **Override / new context (v2+):** once a report exists, the submit button becomes "Update report". The textarea is repurposed as an "updated context / operational override" box. On submit, the server re-evaluates using the previous version's full report + the user's new context as authoritative.
3. **Re-evaluation rules sent to the model:** treat the new context as overriding facts; remove roadblocks the new context invalidates (e.g. cash-out → rate-and-term drops cash-out overlays), recompute max allowable LTV/CLTV thresholds for the new posture, and regenerate the documentation checklist to match. Output is the complete refreshed report, not a diff.
4. **Versioning:** each result is pushed onto a versions list with a timestamp and a short auto-label derived from the override text. The switcher shows all versions; the timeline logs each as an event.
5. **LTV section:** new fourth result card showing max LTV / CLTV thresholds and an eligibility read for the scenario.

## Technical changes

`**src/lib/guidelines.functions.ts**`

- Add `ltv: string` to the `Analysis` type and to the parsed/return shape (with a fallback default).
- Extend `InputSchema` with an optional `previousReport` object (the prior `Analysis`) and a `mode` flag (`"initial" | "override"`); keep `attachments` and `scenario` as-is.
- Update the system prompt: keep the strict raw-JSON contract but add the four keys (`guidelineRequirements`, `roadblocks`, `ltv`, `documentation`). When `previousReport` is present, include it in the user content and instruct the model to act as a re-evaluation engine — apply the new context as overriding facts, drop invalidated roadblocks, recalculate max allowable LTV/CLTV, and rebuild the doc checklist, returning the full updated report.
- Keep the existing defensive JSON parsing and the 429/402 error handling.

`**src/routes/index.tsx**`

- Replace the single `mutation.data` result with a `versions` state array (`{ id, label, createdAt, report }`) plus a `selectedVersion` index for the switcher.
- On submit: if no versions yet → `mode: "initial"`; otherwise → `mode: "override"`, passing the latest version's report as `previousReport`. Append the returned report as a new version and select it.
- Add the **version switcher** (v1…vN pills) at the top-right of the report area; selecting one shows that stored report read-only.
- Add a collapsible **Event Timeline** sidebar on the right listing each version chronologically (time + short label, "Base analysis" for v1, override snippet for the rest).
- Render the **new LTV card** (📊) between Roadblocks and Documentation, reusing the existing `ResultCard` styling with a new accent.
- Swap submit button copy between "Analyze scenario" (no versions) and "Update report" (existing versions); update the helper/placeholder copy to mention overrides.

All styling stays on the existing lofi theme tokens (`--lofi-*`), fonts, and rounded card aesthetic — no visual redesign, only the new workspace structure.

## Out of scope

No database/persistence — versions live in component state for the session (matches the current no-backend design). Can be added later if you want history to survive reloads.  
  
Revised plan but please alert if this does not work:  
  
## Goal

Turn the one-shot analyzer into a living loan-file workspace. After the first analysis, the user can feed in updated context or operational overrides; the assistant re-evaluates everything against the prior report — removing invalidated roadblocks, recalculating max allowable LTV/CLTV, and updating the document checklist. Each pass becomes a numbered version, navigable with a version switcher and tracked in a chronological event timeline.

## Layout

```text

+--------------------------------------------------+------------------+

|  Header: 🎧 AI Guideline Assistant                |  EVENT TIMELINE  |

|                                                  |                  |

|  [Loan program ▾]  [context/override box]        |  • v1 created    |

|  [📎 upload]                [Analyze / Update]    |    10:02 · base  |

|                                                  |  • v2 override   |

|  Clean Report View          v1  v2 [v3]   ◄ switch|    10:08 · "rate |

|  ┌─ 📋 Guideline Requirements ─┐                  |     & term now"  |

|  ┌─ 🚧 Roadblocks ─────────────┐                  |  • v3 override   |

|  ┌─ 📊 LTV / Eligibility ──────┐  (NEW)          |    10:15 · ...   |

|  ┌─ 📂 Documentation ──────────┐                  |                  |

+--------------------------------------------------+------------------+