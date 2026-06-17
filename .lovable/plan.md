# Authentication Gate + Admin User Management

Lock the whole workspace behind a login wall, persist sessions across refreshes, and give the admin a Settings panel (gear icon, top-right) to manage users and roles. Team logins are created from that panel — there is no separate team password to provide up front.

## How auth works in this project

This app uses a **custom Supabase setup** (server-only secrets `LOFI_SUPABASE_URL` / `LOFI_SUPABASE_ANON_KEY`), not the standard Lovable Cloud integration. There is currently no browser-side Supabase client. Two things are needed to support login + user management:

1. The browser needs the Supabase URL + anon key to run `signInWithPassword()` and persist the session. These are publishable values, exposed safely via a small server function.
2. Creating / editing / deleting users requires the **Supabase service-role key**, which is not yet configured. A new secret `LOFI_SUPABASE_SERVICE_ROLE_KEY` must be added (I'll request it during the build).

## What gets built

### 1. Browser auth client + config

- New `src/lib/auth.functions.ts` with `getPublicAuthConfig()` returning `{ url, anonKey }` from server env.
- New `src/lib/supabase-browser.ts` — lazily creates a singleton browser Supabase client (`persistSession: true`, `autoRefreshToken: true`) once the config is fetched.

### 2. Auth provider + route guard

- New `src/components/AuthProvider.tsx`: fetches config, creates the client, reads the current session, and subscribes to `onAuthStateChange` for clean persistence across refreshes. Exposes `{ session, user, role, signIn, signOut, loading }` via context.
- `role` is read from `user.user_metadata.role` (`'admin'` or `'team'`).
- Wrap the workspace: while loading, show a calm lofi spinner; if no session, render the **Login Page**; if authenticated, render the workspace.

### 3. Login Page (lofi retro styling)

- A centered glassmorphism card matching the warm amber/cream palette: email + password inputs, warm amber focus rings, a "Sign in" button, inline error on bad credentials, and the lofi gradient background.

### 4. Role-based workspace

- `role === 'admin'`: full workspace + Recent History + a **gear icon** (top-right) opening the admin **Settings panel**.
- `role === 'team'`: full workspace + Recent History, but **no gear icon / no Settings access**.

### 5. Settings panel (admin only) — gear icon, top-right

An overlay panel (kept in-app rather than a separate URL since auth is client-side) with:

- **Users & Roles**: list existing users, create a user (email, password, role = admin/team), edit a user's role or reset password, and delete a user. All backed by service-role server functions that first verify the caller is an authenticated admin.
- **Admin Config (handbook upload)**: a clearly-labeled "coming soon" section reserved for uploading handbook guidelines, per the original request.

### 6. Seed the admin account

- A one-time guarded server function creates `jadeteran@gmail.com` (password `Peachie27!`, `user_metadata.role = 'admin'`, email pre-confirmed) if it doesn't already exist, so you can log in immediately.

## Technical notes

- `src/lib/auth.server.ts`: service-role client + a `verifyAdminCaller(accessToken)` helper. Every admin server function (list/create/update/delete users) receives the caller's access token, validates it with `auth.getUser(token)`, and rejects non-admins — these are public endpoints on the published site, so the role check is mandatory.
- Admin user operations use the Supabase Auth Admin API (`auth.admin.listUsers / createUser / updateUserById / deleteUserById`).
- Session lives in `localStorage` via the browser client; a single `onAuthStateChange` listener keeps React state in sync on refresh and across tabs.
- Requires adding the `LOFI_SUPABASE_SERVICE_ROLE_KEY` secret (requested during build).

## Files

- Add: `src/lib/auth.functions.ts`, `src/lib/auth.server.ts`, `src/lib/supabase-browser.ts`, `src/components/AuthProvider.tsx`, `src/components/LoginPage.tsx`, `src/components/SettingsPanel.tsx`
- Edit: `src/routes/index.tsx` (wrap in auth gate, add gear icon + role gating)  
  
add sign out feature and put the sign out button to the right of the gear icon