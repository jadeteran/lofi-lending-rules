import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Client-safe server-function declarations. Server-only helpers (service role
// client, token verification) live in auth.server.ts and are imported lazily
// inside handlers so they never leak into the client bundle.

/** Publishable Supabase config for the browser auth client. */
export const getPublicAuthConfig = createServerFn({ method: "GET" }).handler(
  async () => {
    const url = process.env.LOFI_SUPABASE_URL;
    const anonKey = process.env.LOFI_SUPABASE_ANON_KEY;
    if (!url || !anonKey) {
      throw new Error("Auth is not configured (missing Supabase URL / anon key).");
    }
    return { url, anonKey };
  },
);

const roleSchema = z.enum(["admin", "team"]);

export type ManagedUser = {
  id: string;
  email: string | null;
  role: string | null;
  createdAt: string | null;
  lastSignInAt: string | null;
};

/** One-time seed of the founding admin account. Safe to call repeatedly. */
export const seedAdminUser = createServerFn({ method: "POST" }).handler(async () => {
  const { getAdminSupabase } = await import("./auth.server");
  const admin = getAdminSupabase();
  const email = "jadeteran@gmail.com";

  const { data: list, error: listErr } = await admin.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listErr) throw new Error(listErr.message);
  const existing = list.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase(),
  );
  if (existing) {
    // Make sure the role metadata is set even if the user pre-existed.
    if ((existing.user_metadata?.role as string | undefined) !== "admin") {
      await admin.auth.admin.updateUserById(existing.id, {
        user_metadata: { ...existing.user_metadata, role: "admin" },
      });
    }
    return { seeded: false };
  }

  const { error } = await admin.auth.admin.createUser({
    email,
    password: "Peachie27!",
    email_confirm: true,
    user_metadata: { role: "admin" },
  });
  if (error) throw new Error(error.message);
  return { seeded: true };
});

function mapUser(u: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown> | null;
  created_at?: string | null;
  last_sign_in_at?: string | null;
}): ManagedUser {
  return {
    id: u.id,
    email: u.email ?? null,
    role: (u.user_metadata?.role as string | undefined) ?? null,
    createdAt: u.created_at ?? null,
    lastSignInAt: u.last_sign_in_at ?? null,
  };
}

/** List all users (admin only). */
export const listUsers = createServerFn({ method: "POST" })
  .inputValidator((input) => z.object({ accessToken: z.string() }).parse(input))
  .handler(async ({ data }) => {
    const { getAdminSupabase, verifyAdminCaller } = await import("./auth.server");
    await verifyAdminCaller(data.accessToken);
    const admin = getAdminSupabase();
    const { data: list, error } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (error) throw new Error(error.message);
    return {
      users: list.users
        .map(mapUser)
        .sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? "")),
    };
  });

/** Create a new user with a role (admin only). */
export const createUser = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        accessToken: z.string(),
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(72),
        role: roleSchema,
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getAdminSupabase, verifyAdminCaller } = await import("./auth.server");
    await verifyAdminCaller(data.accessToken);
    const admin = getAdminSupabase();
    const { error } = await admin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: { role: data.role },
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Update a user's role and/or password (admin only). */
export const updateUser = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        accessToken: z.string(),
        userId: z.string(),
        role: roleSchema.optional(),
        password: z.string().min(8).max(72).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { getAdminSupabase, verifyAdminCaller } = await import("./auth.server");
    await verifyAdminCaller(data.accessToken);
    const admin = getAdminSupabase();

    const attrs: Record<string, unknown> = {};
    if (data.password) attrs.password = data.password;
    if (data.role) {
      const { data: u } = await admin.auth.admin.getUserById(data.userId);
      attrs.user_metadata = { ...(u?.user?.user_metadata ?? {}), role: data.role };
    }
    const { error } = await admin.auth.admin.updateUserById(data.userId, attrs);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Delete a user (admin only). Cannot delete yourself. */
export const deleteUser = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z.object({ accessToken: z.string(), userId: z.string() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { getAdminSupabase, verifyAdminCaller } = await import("./auth.server");
    const caller = await verifyAdminCaller(data.accessToken);
    if (caller.id === data.userId) {
      throw new Error("You cannot delete your own account.");
    }
    const admin = getAdminSupabase();
    const { error } = await admin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
