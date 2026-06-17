# Restyle Login Page to Match 90s-Anime Home Theme

Re-skin the login page so its layout and art match the attached reference and the home page's grainy, 2D, cel-shaded 90s-anime look. The login form elements inside the card stay exactly as they are — only the surrounding stylization and layout change.

## 1. New full-bleed scene illustration

Generate one wide background illustration matching the reference, rendered in the home page's stylization (flat 2D cel-shading, bold ink outlines, grainy texture, warm "iced latte" palette):
- Left: the fluffy long-haired **black cat** (cute small fangs, slight smile) resting on the wooden window sill.
- Right: the **girl with glasses + LOFI over-ear headphones**, side profile, scarf, trailing pothos/plants and desk lamp.
- Center/back: window with calm clouds + soft sky and a warm interior, leaving open space in the middle for the floating login card.
- Save `src/assets/lofi-login-scene.png`, upload via `lovable-assets`, write `.asset.json`.

## 2. Rework `src/components/LoginPage.tsx` layout

- Replace the asymmetric split-grid with a **single full-bleed background**: the new scene fills the screen (`object-cover`), with the login card floating centered over it (matching the reference composition).
- Keep the frosted-glass card styling consistent with the home theme: `backdrop-blur-lg`, golden glowing border (`--lofi-glow-border`), `--lofi-card` background, existing shadow.
- **Do not change anything inside the card**: keep the headphone badge, "Welcome back" heading/subtext, Email + Password fields, error state, and Sign in button exactly as-is.
- Keep all auth logic (`useAuth`, `handleSubmit`) untouched.
- Add a subtle scrim behind the card if needed for text contrast over the illustration; ensure mobile keeps the card readable and centered.

## 3. Verify
- `browser--view_preview` on the login view (desktop + mobile): scene matches the reference, grainy 2D home stylization, card floats centered, form unchanged and readable.

## Notes
- Frontend/presentation only; no backend or form changes.
- Reference image used for layout/art direction only — not embedded directly.
- Old `lofi-workspace.png` asset can be removed once the new scene is wired in.
