import { useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import workspaceAsset from "@/assets/lofi-workspace.png.asset.json";

const FONT = '"Helvetica Neue", Helvetica, Arial, sans-serif';

export function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await signIn(email.trim(), password);
    if (error) {
      setError("Those credentials didn't match. Try again.");
      setBusy(false);
    }
    // On success the auth listener swaps this view out for the workspace.
  }

  return (
    <div
      className="grid min-h-screen w-full grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)]"
      style={{ color: "var(--lofi-ink)", background: "var(--lofi-bg-1)", fontFamily: FONT }}
    >
      {/* Left: full-bleed illustration */}
      <div className="relative min-h-[40vh] lg:min-h-screen">
        <img
          src={workspaceAsset.url}
          alt="Cozy golden-hour lofi study workspace with headphones, plants and coffee"
          className="absolute inset-0 h-full w-full object-cover"
        />
      </div>

      {/* Right: skinnier solid latte panel with floating frosted glass card */}
      <div
        className="flex min-h-screen items-center justify-center px-6 py-12"
        style={{ background: "var(--lofi-bg-2)" }}
      >
        <div
          className="w-full max-w-md rounded-3xl border p-8 backdrop-blur-lg sm:p-10"
          style={{
            borderColor: "var(--lofi-glow-border)",
            background: "var(--lofi-card)",
            boxShadow: "var(--lofi-shadow), inset 0 1px 0 oklch(1 0 0 / 0.4)",
          }}
        >
          <div className="mb-8 text-center">
            <p className="text-3xl">🎧</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-[var(--lofi-blue-deep)]">
              Welcome back
            </h1>
            <p className="mx-auto mt-3 max-w-xs text-sm leading-relaxed text-[var(--lofi-muted)]">
              Sign in to queue the beats and drop a scenario to analyze.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--lofi-muted)]">
                Email
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@studio.com"
                className="rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-4 py-3 text-sm font-semibold text-[var(--lofi-ink)] outline-none transition focus:border-[var(--lofi-blue)] focus:ring-2 focus:ring-[var(--lofi-blue)]/40 placeholder:font-normal placeholder:text-[var(--lofi-muted)]"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-[var(--lofi-muted)]">
                Password
              </span>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-4 py-3 text-sm font-semibold text-[var(--lofi-ink)] outline-none transition focus:border-[var(--lofi-blue)] focus:ring-2 focus:ring-[var(--lofi-blue)]/40 placeholder:font-normal placeholder:text-[var(--lofi-muted)]"
              />
            </label>

            {error && (
              <p className="rounded-xl border border-[var(--lofi-peach)]/40 bg-[var(--lofi-peach)]/10 px-4 py-2.5 text-sm font-semibold text-[var(--lofi-peach)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="mt-2 rounded-xl bg-[var(--lofi-blue)] px-5 py-3.5 text-sm font-bold text-[var(--lofi-cream)] shadow-[var(--lofi-shadow)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
