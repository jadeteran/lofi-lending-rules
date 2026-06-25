## Goal

Resolve the high (and related medium) severity advisories flagged against `@tanstack/react-start@1.167.50`. The root cause is the bundled `undici` HTTP client (pulled in transitively via `@tanstack/start-server-core`) plus an advisory against the TanStack Start server core itself.

## Current state

- `@tanstack/react-start`: `^1.167.50` (latest is `1.168.26`)
- `@tanstack/react-router`: `^1.168.25` (latest is `1.170.16`)
- `@tanstack/router-plugin`: `^1.167.28` (latest is `1.168.18`)
- Transitive `undici`: `7.24.8`

## Approach

1. **Bump the TanStack packages** to their latest patched releases so the advisory against `@tanstack/start-server-core` (server-function request deserialization, GHSA-9m65-766c-r333) is picked up:
   - `@tanstack/react-start` → latest
   - `@tanstack/react-router` → latest
   - `@tanstack/router-plugin` → latest
   (Keep them on compatible minor versions so the Vite plugin and runtime stay aligned.)

2. **Force a patched `undici`** for the remaining undici advisories. Since `undici` is transitive, add a `package.json` `overrides` entry pinning `undici` to the latest patched release, then reinstall so the lockfile dedupes to the safe version.

3. **Verify**: reinstall, confirm `undici` resolves to the patched version everywhere (`node_modules` tree), run the dependency scan again, and confirm the dev server / build still boots (the auto-run build check covers compilation).

## Technical notes

- Updates are minor/patch within `1.x`, so no API breakage is expected, but TanStack Start, Router, and the Router plugin must move together to avoid version-skew errors in route-tree generation.
- If a TanStack bump alone already pulls a clean `undici`, the `overrides` entry becomes a harmless belt-and-suspenders guarantee; if not, it's what actually closes the undici advisories.
- After the fix lands, mark the `vulnerable_dependencies_high` (and `vulnerable_dependencies_medium`) findings as fixed.

## Risk

Low. All changes are dependency version bumps with no source-code changes. The main thing to watch is that the app still builds and the dev server starts after the TanStack version alignment.
