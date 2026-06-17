## Goal

Replace the current cropped earpiece icon with a freshly **generated** circular badge: a sharp, detailed 90s cel-shaded anime illustration of a **complete side profile of over-ear headphones**, with the word **"lofi"** kept horizontal, centered, and facing the viewer. The image is created and previewed before it's wired into the app.

## Step 1 — Generate the new icon (create, not crop)

Use `imagegen` (premium quality, transparent background) to produce a brand-new icon:
- Circular badge composition, transparent PNG so it sits flush on the latte canvas.
- A complete side-profile of over-ear headphones (full headband + ear cup), 90s cel-shaded anime style: bold ink outlines, flat cel shading, high contrast, saturated grainy texture.
- "lofi" wordmark rendered perfectly horizontal and centered (not following the curve), facing the user, balanced within the circular frame.
- Iced-latte palette (warm cream + deep blue accents) to match the existing theme.
- Save to `src/assets/anime-headphone-badge.png`, then upload via `lovable-assets` and write the `.asset.json` pointer.

**Show the rendered result for approval before wiring it in.**

## Step 2 — Wire the icon into small-scale app icons

Once approved, point these at the new asset:
- **Home header logo** (`src/routes/index.tsx`, the `<img>` at ~line 337) — swap `earpieceIcon` → new badge, keep 96×96 / `object-contain`.
- **Login page small badge** (`src/components/LoginPage.tsx`, ~line 55) — swap the small circular `workspaceAsset` thumbnail to the new badge for consistency (the large left-side illustration stays as-is).

## Step 3 — Verify

Confirm the icon renders crisp at small sizes (transparent edges, legible "lofi", clean circular framing) and matches the iced-latte theme.

## Notes / scope

- Frontend-only: image generation + `<img src>` swaps. No layout, copy, color-theme, or backend changes.
- The "Previous Scenarios" / history toggle uses a Lucide `Clock` glyph (text button), not an image badge — left unchanged unless you'd prefer that button also adopt the new badge.

### Technical details
- New asset: `src/assets/anime-headphone-badge.png` + `.asset.json` pointer via `lovable-assets create`.
- Old `anime-earpiece-icon.png.asset.json` can be removed once no longer referenced.
