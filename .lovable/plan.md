## Login page layout refactor (`src/components/LoginPage.tsx`)

Match the reference photo's proportions and fill — **format only**. No element, text, field, or color changes.

### Changes

1. **Asymmetry flip — left wider, right skinnier.** Change the grid from `lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]` to a layout where the left image column is the larger one and the right panel is narrower (e.g. `lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]`).

2. **Left side: full-bleed, no borders/frame.** Remove the centering padding (`p-6 lg:p-10`), the `max-w-md`, the `rounded-3xl`, and the `shadow`. Make the illustration fill its entire column edge-to-edge: `h-full w-full object-cover` inside a full-height container, so it reads like the reference's borderless left fill.

3. **Right side: skinnier solid-color panel.** Keep the existing solid `var(--lofi-bg-2)` background behind the card (unchanged color). The card and all its contents (🎧, "Welcome back", email, password, error, Sign in button) stay exactly as they are now.

### Untouched
- All existing colors / CSS tokens (`src/styles.css` not edited)
- All form fields, labels, button, auth logic, and the frosted-glass card styling itself
- The uploaded image is reference only — not embedded
