# Cozy Guideline Study Corner

Build a calm, lofi-girl-themed interface that reads live from your existing `lofi_guidelines` Supabase table, with instant keyword search, a loan-type filter, citation cards, and a relaxed empty state.

## Connecting your existing Supabase

This Lovable project currently has no backend wired in, so first I'll connect to your existing Supabase project. You'll be asked to securely paste two values (I'll request them; you find them in your Supabase project under Settings → API):

- **Project URL** (e.g. `https://xxxx.supabase.co`)
- **Publishable / anon public key** (the public one, safe for the browser)

For instant client-side search/filtering to work, the `lofi_guidelines` table needs a Row-Level Security policy allowing public read (`SELECT TO anon`). If you'd rather not expose it to anon, tell me and I'll route reads through an authenticated path instead.

## What gets built

```text
┌──────────────────────────────────────────────┐
│   🎧 Cozy Guideline Study Corner              │
│   relaxed subtitle                            │
│                                               │
│  [ 🔍 search rule_name + guideline_text ]     │
│  [ Loan Type ▾ ]                              │
│                                               │
│  ┌── card ──┐  ┌── card ──┐                   │
│  │ rule_name│  │ rule_name│                   │
│  │ category │  │ category │                   │
│  │ text…    │  │ text…    │                   │
│  │ Source   │  │ Source   │                   │
│  │ Track #id│  │ Track #id│                   │
│  └──────────┘  └──────────┘                   │
└──────────────────────────────────────────────┘
```

1. **Aesthetic** — Soft pastel theme: deep blues, warm creams, gentle anime study-vibe accents. Wide padding, legible rounded font, soft shadows, calm spacing. Theme tokens added to `src/styles.css`.
2. **Search bar** — Filters across `rule_name` and `guideline_text` (case-insensitive), updating instantly as you type.
3. **Loan Type dropdown** — Fixed list in your order: Conventional - Fannie Mae, Conventional - Freddie Mac, Government - FHA, Government - VA, HELOC / 2nd Liens, Jumbo - Non-Conforming, Non-QM / DSCR, Private Money / Hard Money. Plus an "All loan types" option.
4. **Live query** — Reads directly from `lofi_guidelines`; results refresh instantly on type/toggle. Picks up cron-updated rows on load/refetch.
5. **Guideline cards** — Each row shows `rule_name`, a `category` pill, `guideline_text`, and a subtle tiny footer: `Source Track Checked: ID #[id]`.
6. **Empty state** — Relaxed note: "No stips found... keep sipping your coffee."

## Technical details

- **Supabase client**: add `@supabase/supabase-js`; create `src/integrations/supabase/client.ts` reading `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY`. Secrets stored via the secrets tool (both `VITE_` client vars).
- **Data fetch**: A `createServerFn` (`src/lib/guidelines.functions.ts`) using a server publishable client to `select id, loan_type, category, rule_name, guideline_text from lofi_guidelines`, fetched via TanStack Query in the route loader (`ensureQueryData`) + `useSuspenseQuery`. Search and loan-type filtering done client-side over the fetched rows for instant feedback (no per-keystroke round-trips). Route gets `errorComponent` + `notFoundComponent`.
- **UI**: rewrite `src/routes/index.tsx` as the Study Corner (replacing the underwriting form), with the search input + select as controlled `useState`, and a memoized filtered list. Lightweight, no heavy libs.
- **Cleanup**: the old underwriting report files (`underwriting.functions.ts`, `ai-gateway.server.ts`, related markdown styles) are left in place unless you want them removed.

Confirm and I'll connect Supabase and build it.  
  
ADDTIONAL NOTES:  
  
The plan looks absolutely flawless. Please go ahead and connect my existing Supabase project. 

Regarding the Row-Level Security (RLS) question: Yes, please go ahead and route the reads through the public read policy (SELECT TO anon) since this is my own internal desktop processing toolkit. 

I am ready to paste the Project URL and Publishable / anon public key as soon as you request them. Let's build the Cozy Guideline Study Corner!