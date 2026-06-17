# Light Iced-Latte Redesign

Three coordinated changes: clean up the dashboard, redesign the login, and reskin the whole app with Helvetica typography and a bright, calming palette.

## 1. Dashboard cleanup (`src/routes/index.tsx`)
- Remove the floating illustration block in the empty-queue state (lines ~588–602): drop the `<img>`, its wrapper `<div>`, the `lofiFloat` animation, and the `workspaceAsset` import.
- Keep a clean, minimal empty state: just the ☕ mark and the "Queue the beats and drop a scenario to analyze…" caption, centered above the input workspace.
- Leave the scenario input box and processing logic untouched.

## 2. Immersive login (`src/components/LoginPage.tsx`)
- Replace the two-column grid with a single full-screen container that uses the `lofi-workspace` illustration as an edge-to-edge, `object-cover` background covering the whole viewport.
- Add a subtle warm overlay tint over the image so the card stays readable.
- Center one floating login card on top of the image: `backdrop-blur-md`, highly translucent warm-tinted background, thin glowing border that blends into the golden-hour light. Keep all existing auth fields and logic.

## 3. Helvetica typography (app-wide)
- In `src/styles.css`, set the base font stack on `body` to `"Helvetica Neue", Helvetica, Arial, sans-serif` and apply it to headings, inputs, buttons, badges, and cards.
- Replace the inline `'Space Grotesk'` and `'JetBrains Mono'` `fontFamily` styles in `src/routes/index.tsx` (lines 52, 69, 321, 416) and `src/components/LoginPage.tsx` (lines 34, 69) with the Helvetica stack.
- Keep a monospace font ONLY for technical readouts (section citations / raw rules) where it already aids legibility.
- Tune `font-weight` and `letter-spacing` slightly for a clean, polished, highly readable look.

## 4. Iced-latte color theme (`src/styles.css`)
Rework the `--lofi-*` tokens from dark golden-hour to a light, bright, sunlit register:
- **Base background**: creamy oat-milk ivory (`#FDFBF7`-equivalent in oklch), replacing the dark amber canvas; soften the radial glows to faint warm tints.
- **Cards / inputs**: crisp white or highly translucent glass with warm sand-toned borders (`#EAE3D2`).
- **Accent / coffee**: iced-latte espresso (`#C4A484` / `#8B5A2B`) for primary action borders, focus rings, selection highlights, and the sign-in button.
- **Plant green**: muted sage / eucalyptus (`#8FBC8F` / `#A9DFBF`) for match badges, handbook citations, and low-profile active markers.
- **Text**: deep espresso brown/charcoal (not pitch black) for primary text; muted warm brown for secondary.
- Update `--lofi-shadow` / glow tokens to soft, light-friendly shadows.
- Apply consistently across the workspace, the left history sidebar drawer, the processing forms, and the login glass card.

## Technical notes
- All colors stay as `oklch` semantic tokens in `src/styles.css`; no hardcoded color utilities in components.
- No changes to auth, server functions, data, or business logic.
- Verify in the preview at desktop and mobile widths after implementation.

## Files to edit
- `src/styles.css` — palette tokens, Helvetica base font, glow/shadow tokens
- `src/components/LoginPage.tsx` — full-bleed background + floating glass card + Helvetica
- `src/routes/index.tsx` — remove hero illustration, swap inline fonts to Helvetica
