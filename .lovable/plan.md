# 90s Anime Aesthetic Pivot

Purge every flat emoji icon and re-anchor the app around a single, massive 90s cel-shaded anime headphones illustration, using a hybrid icon system. Keep the iced-latte palette, just deepen contrast for readability over the new art.

## 1. Generate the anime artwork

- **Hero headphones (home background):** Generate one MASSIVE, ultra-detailed 90s cel-shaded anime illustration of vintage over-ear headphones with "LOFI" partly visible on the earcup (matching the reference image), high-contrast hand-drawn line work with grainy saturation, composed as a standalone object against a clean void. Save to `src/assets/`, upload via `lovable-assets`, reference the `.asset.json`.
- **Empty-state accent:** Generate one smaller cel-shaded anime accent (e.g. a steaming coffee mug / cassette in the same style) for the empty queue state that currently uses ☕.
- All generated as standalone objects — no tiled patterns, no busy backgrounds.

## 2. Home page background + layout (`src/routes/index.tsx`, `Shell`)

- Replace the radial-gradient background with a **flat, solid** iced-latte color (`--lofi-bg-1`).
- Layer the hero headphones illustration as a single large `background` cover image, centered/anchored, `background-repeat: no-repeat`, sized to dominate the viewport behind the content. Add a subtle solid-color scrim so form text stays razor-sharp (no patterns, no tiling).
- Content container keeps its max-width and sits above the hero.

## 3. Replace emoji — hybrid system

**Small functional controls → lucide-react line-icons** (already available):

- 🕑 Previous Scenarios → `Clock` / `History`
- ⚙️ Settings → `Settings`
- ⏏ Sign out → `LogOut`
- 📎 Upload → `Paperclip`
- ✨ Clear Slate → `Sparkles`
- ✓ saved flash → `Check`
- ✕ remove / close → `X`
- → drawer close → `ArrowRight`
- 📄 file attachment → `FileText`
- ◆ group marker → `Diamond`

**Section badges & status (card headers) → consistent lucide icons** themed with the saturated accent tokens, so they read as a cohesive hand-styled set rather than OS emoji:

- 📋 Guideline Requirements → `ClipboardList`
- 🚧 Roadblocks → `Construction`
- 📊 LTV → `BarChart3`
- 📚 Citations → `BookOpen`
- 🧭 Recommendation → `Compass`
- 🔀 Alternatives → `Shuffle`
- 📂/🗂️ Documentation → `FolderOpen`, `Briefcase`
- 🙋 / 🤝 doc buckets → `Hand`, `Handshake`
- status pills ✅/🟦/⚠️/⛔ → `CheckCircle2`, `Circle`, `AlertTriangle`, `Ban`

**Hero/brand emoji → anime art:**

- Header 🎧 and loading 🎧 → small crop / reuse of the anime headphones art (or a `Headphones` lucide mark where a tiny inline glyph is needed).
- Empty-state ☕ → the generated anime accent graphic.

## 4. Color theme tweak (`src/styles.css`)

- Keep the iced-latte tokens. Deepen contrast slightly: nudge `--lofi-ink` / `--lofi-blue-deep` darker and bump accent saturation a touch so badges and text pop against the illustration.
- Remove the body `background-image` radial patterns in favor of the flat solid canvas (the hero lives on the home Shell, not as a global tiled texture).

## 5. Login page (`src/components/LoginPage.tsx`)

- Replace the 🎧 glyph in the card with the anime `Headphones` mark / small art crop for consistency. Existing split layout and illustration stay as-is.

## Technical notes

- Icons: `import { Clock, Settings, ... } from "lucide-react"`, sized ~16–18px, colored via `currentColor` against existing accent token backgrounds. No hardcoded color classes — drive color through the existing `--lofi-*` tokens.
- Hero image referenced through an imported `.asset.json` URL; background applied via inline `style` on the `Shell` wrapper with `backgroundColor` solid + `backgroundImage` single cover, `no-repeat`.
- No new dependencies required (lucide-react ships with the template).  
  
additional change:  
  
make the new empty state accent coffee accent 15% larger