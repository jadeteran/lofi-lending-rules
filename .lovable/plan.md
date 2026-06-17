# Left History Drawer + Smart Scenario Matching

Migrate the inline "Recent History" panel into a sliding left-anchored drawer that doubles as an intelligent scenario index. All work stays in the frontend (`src/routes/index.tsx`) — no schema or backend changes needed, since `listScenarios` already returns the metrics we need (`profileGroup`, `propertyState`, `creditScore`, `dti`, `ltv`).

## 1. Drawer shell
- Replace the inline `<RecentHistory>` block (currently rendered at line ~441) with a new `HistoryDrawer` component rendered as a fixed overlay.
- Slide-in animation from the LEFT edge using `transform: translateX(...)` + `transition`.
  - Desktop: fixed panel `w-[400px]`, glassmorphism (`bg-[var(--lofi-card)]`, `backdrop-blur`, border, lofi shadow).
  - Mobile: `w-full` full-screen panel for clean phone legibility.
- A dimmed click-dismiss overlay behind the panel (click closes the drawer).
- Replace the existing `showHistory` boolean's role with a new `drawerOpen` state (default closed).

## 2. Toggle button
- Add a clock toggle button labeled "🕑 Previous Scenarios" near the top-left of the workspace header (the row currently at line ~273, which is right-aligned — restructure to a left/right split so the toggle sits top-left and the settings/sign-out stay top-right).
- Clicking it toggles `drawerOpen`. Styled to match the lofi glassmorphism pill aesthetic.

## 3. Smart "Similar Team Scenarios" (Top 5)
- When an active report exists on screen (`current`), derive the active profile from `current.report.fileProfile` (FICO/DTI/LTV/state/profile_group).
- Compute a client-side similarity score across the already-fetched history list and pick the top 5:
  - +strong match: same `profileGroup`
  - +match: same `propertyState`
  - +match: FICO within ~20 pts band; DTI within ~5 pts band
- Render these under a clearly titled "Similar Team Scenarios" section at the top of the drawer. Below it, an "All Recent History" section lists the remaining items chronologically.
- When no active report exists, the drawer shows only the chronological history.

## 4. Reload interaction (full hydration)
- Update `loadFromHistory` so clicking a card restores the complete past run:
  - `setScenario(item.rawScenario)` so the original text input rehydrates (currently it is cleared — fix this),
  - `setLoanType(item.selectedProgram)` for the dropdown,
  - rebuild the report version from `item.analysis` and select it,
  - reset `lastProgram` and scroll to top.
- Close the drawer after a pick so the reloaded report is fully visible.

## 5. Mobile close
- Add a prominent close control (right-aligned ✕/→ arrow) inside the drawer header so it tucks away instantly.
- Overlay click also dismisses.

## Technical notes
- Reuse the existing card markup (headline + metric badges + profile_group tag) from the current `RecentHistory` for each scenario card inside the drawer.
- Keep `historyQuery` as-is; similarity is computed over `historyQuery.data`.
- Body scroll-lock while the drawer is open on mobile (optional, via a class).
- No changes to server functions, Supabase, or the analysis flow.
