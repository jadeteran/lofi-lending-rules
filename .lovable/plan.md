# Replace home page header icon

Swap the square hero-headphones image at the top of the home page (`src/routes/index.tsx`, the `<img>` inside `<header>`) for a new icon: a circular, side-profile single earpiece based on the existing 90s anime hero headphones, with a fully transparent background so it sits flush on the latte canvas.

## Steps

1. **Generate the new icon asset**
  - Use the existing anime headphones hero (`anime-headphones-hero.jpg`) plus the uploaded reference (the round "LOFI" earpiece) as art direction.
  - Produce a single circular ear-cup viewed in side profile (just the earpiece, no headband), matching the 90s cel-shaded, grainy, saturated style.
  - Transparent PNG background so the icon is flush with the page background.
  - Save to `src/assets/anime-earpiece-icon.png`, upload via `lovable-assets`, write the `.asset.json` pointer.
2. **Show a preview**
  - After generating, share the rendered icon so you can approve it before it goes live.
3. **Wire it into the header**
  - Update the `<img>` at `src/routes/index.tsx` lines ~335-341: point `src` to the new earpiece asset, keep the 96×96 sizing and `object-contain`, update `alt`. Drop shadow stays (works fine with a transparent PNG).

## Notes

- No layout, copy, or color changes — only the header icon swaps.
- The current full hero background image (`Shell` background, line ~86) is left untouched.  
  
additional note: the headphones are tilted in the reference, i would like it centered on the new icon