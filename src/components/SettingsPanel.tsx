import { useEffect, useRef, useState } from "react";
import { X, BookOpen, Loader2, CheckCircle2, UploadCloud } from "lucide-react";

import { useAuth } from "@/components/AuthProvider";
import {
  listUsers,
  createUser,
  updateUser,
  deleteUser,
  type ManagedUser,
} from "@/lib/auth.functions";
import { uploadGuidelines } from "@/lib/guidelines.functions";

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file."));
    reader.readAsDataURL(file);
  });
}

const inputCls =
  "rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-3 py-2.5 text-sm font-semibold text-[var(--lofi-ink)] outline-none transition focus:border-[var(--lofi-blue)] focus:ring-2 focus:ring-[var(--lofi-blue)]/40 placeholder:font-normal placeholder:text-[var(--lofi-muted)]";

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const { accessToken, user } = useAuth();
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // New-user form
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"admin" | "team">("team");

  async function refresh() {
    if (!accessToken) return;
    setLoading(true);
    setError(null);
    try {
      const res = await listUsers({ data: { accessToken } });
      setUsers(res.users);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    setBusy(true);
    setError(null);
    try {
      await createUser({ data: { accessToken, email: email.trim(), password, role } });
      setEmail("");
      setPassword("");
      setRole("team");
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create user.");
    } finally {
      setBusy(false);
    }
  }

  async function handleRoleChange(u: ManagedUser, nextRole: "admin" | "team") {
    if (!accessToken) return;
    setError(null);
    try {
      await updateUser({ data: { accessToken, userId: u.id, role: nextRole } });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update role.");
    }
  }

  async function handleResetPassword(u: ManagedUser) {
    if (!accessToken) return;
    const next = window.prompt(`New password for ${u.email}? (min 8 chars)`);
    if (!next) return;
    setError(null);
    try {
      await updateUser({ data: { accessToken, userId: u.id, password: next } });
      window.alert("Password updated.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to reset password.");
    }
  }

  async function handleDelete(u: ManagedUser) {
    if (!accessToken) return;
    if (!window.confirm(`Delete ${u.email}? This cannot be undone.`)) return;
    setError(null);
    try {
      await deleteUser({ data: { accessToken, userId: u.id } });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete user.");
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto px-4 py-10"
      style={{
        background: "oklch(0.12 0.04 50 / 0.6)",
        fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
      }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl border p-6 backdrop-blur-md sm:p-8"
        style={{
          borderColor: "var(--lofi-cream-deep)",
          background: "var(--lofi-card)",
          boxShadow: "var(--lofi-shadow)",
          color: "var(--lofi-ink)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <h2
            className="text-2xl font-bold text-[var(--lofi-blue-deep)]"
            style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
          >
            Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close settings"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--lofi-cream-deep)] text-[var(--lofi-muted)] transition hover:text-[var(--lofi-ink)]"
          >
            <X size={15} />
          </button>
        </div>

        {error && (
          <p className="mb-4 rounded-xl border border-[var(--lofi-peach)]/40 bg-[var(--lofi-peach)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--lofi-peach)]">
            {error}
          </p>
        )}

        {/* Users & Roles */}
        <section className="mb-8">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--lofi-muted)]">
            Users &amp; Roles
          </h3>

          <form
            onSubmit={handleCreate}
            className="mb-5 grid grid-cols-1 gap-3 rounded-2xl border border-[var(--lofi-cream-deep)] p-4 sm:grid-cols-[1fr_1fr_auto_auto]"
          >
            <input
              type="email"
              required
              placeholder="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputCls}
            />
            <input
              type="text"
              required
              minLength={8}
              placeholder="password (min 8)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputCls}
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as "admin" | "team")}
              className={inputCls}
            >
              <option value="team">team</option>
              <option value="admin">admin</option>
            </select>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-[var(--lofi-blue)] px-4 py-2.5 text-sm font-bold text-[var(--lofi-bg-1)] transition hover:-translate-y-0.5 disabled:opacity-60"
            >
              {busy ? "Adding…" : "Add user"}
            </button>
          </form>

          {loading ? (
            <p className="text-sm text-[var(--lofi-muted)]">Loading users…</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {users.map((u) => (
                <li
                  key={u.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--lofi-cream-deep)] px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[var(--lofi-ink)]">
                      {u.email}
                      {u.id === user?.id && (
                        <span className="ml-2 text-xs font-normal text-[var(--lofi-muted)]">
                          (you)
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={u.role === "admin" ? "admin" : "team"}
                      onChange={(e) =>
                        handleRoleChange(u, e.target.value as "admin" | "team")
                      }
                      className={inputCls + " !py-1.5"}
                    >
                      <option value="team">team</option>
                      <option value="admin">admin</option>
                    </select>
                    <button
                      type="button"
                      onClick={() => handleResetPassword(u)}
                      className="rounded-lg border border-[var(--lofi-cream-deep)] px-3 py-1.5 text-xs font-bold text-[var(--lofi-blue-deep)] transition hover:-translate-y-0.5"
                    >
                      Reset pw
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(u)}
                      disabled={u.id === user?.id}
                      className="rounded-lg border border-[var(--lofi-peach)]/40 px-3 py-1.5 text-xs font-bold text-[var(--lofi-peach)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Delete
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Admin Config */}
        <section>
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-[var(--lofi-muted)]">
            Admin Config
          </h3>
          <div className="rounded-2xl border border-dashed border-[var(--lofi-cream-deep)] p-6 text-center">
            <BookOpen size={26} className="mx-auto text-[var(--lofi-blue-deep)]" />
            <p className="mt-2 text-sm font-semibold text-[var(--lofi-ink)]">
              Handbook guideline upload
            </p>
            <p className="mt-1 text-xs text-[var(--lofi-muted)]">
              Coming soon — upload handbook guidelines directly to tune the assistant.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
