## Goal
Lift the heavy dark layout into a warm "golden-hour lofi latte" theme, integrate the uploaded cozy workspace illustration as a hero element + login art, and refine cards/drawer into golden glassmorphism.

## 1. Prepare the illustration asset
- Render the uploaded PDF (`Untitled_-_June_16_2026...pdf`) to a high-res PNG (the cozy golden-hour desk scene).
- Upload it via `lovable-assets` and write the pointer to `src/assets/lofi-workspace.png.asset.json`. Reference it in code via the pointer's `.url`. No binary committed to the repo.

## 2. Color palette overhaul (`src/styles.css`)
Warm up the existing `--lofi-*` tokens to a latte/milky-espresso register pulled from the illustration:
- **Base background**: amber-tinted warm charcoal gradient (lighter & warmer than current near-black), e.g. `--lofi-bg-1/2/3` shifted toward `oklch(~0.28–0.34, hue ~65)` so it reads "warm espresso" not "black."
- **Headers/accents**: vibrant sunset gold/amber (`--lofi-blue`/`--lofi-blue-deep` retuned to the window-light gold) for primary headers.
- **Body text**: soft cream (`--lofi-ink`/`--lofi-cream`).
- **Glass**: bump `--lofi-card` translucency and add a subtle golden-hour glow — introduce `--lofi-glow` (warm gold) and a `--lofi-glow-border` so cards/inputs get a faint amber edge + soft outer glow. Keep `backdrop-filter` blur in the existing `@layer base` rule.
- Add a soft global radial "sun glow" accent at top of the page background.

## 3. Login page redesign (`src/components/LoginPage.tsx`)
- Convert to a two-column layout: `lg:grid lg:grid-cols-2`, stacked on mobile.
- **Left column**: the illustration, framed with large rounded corners (`rounded-3xl`), soft golden glow shadow, object-cover full-bleed within its panel. Hidden or shown above the card on small screens.
- **Right column**: the existing "Welcome back" glass card, vertically centered, upgraded with the new golden glow border.
- Keep all auth logic untouched.

## 4. Workspace hero image (`src/routes/index.tsx`, empty-queue block ~585–593)
- Replace the plain dashed "☕ Queue the beats…" empty state with the illustration as a floating, beautifully scaled hero graphic: rounded corners, soft golden drop shadow, gentle float, with the "Queue the beats and drop a scenario to analyze…" caption beneath/over it. Only shows when there's no active report (preserves existing conditional).

## 5. Left drawer glass refinement (`HistoryDrawer`, ~682)
- Strengthen the warm glass: keep `backdrop-blur-xl`, use the new translucent `--lofi-card` + golden glow border so it blurs beautifully over the warm canvas. Warm the overlay tint (~682/673) to amber instead of blue. Mobile full-width + desktop 400px unchanged.

## Notes / Scope
- Pure styling + one asset; no auth, server-function, data, or business-logic changes.
- Header gold accents (h1, buttons) inherit the retuned tokens automatically; minor class tweaks only where needed for the glow.
- Verify with a preview screenshot at desktop and mobile widths after build.
