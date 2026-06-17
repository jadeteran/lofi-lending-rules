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
      className="min-h-screen"
      style={{
        background: BG,
        color: "var(--lofi-ink)",
        fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-6 py-10 lg:grid-cols-2 lg:gap-12">
        {/* Left column — illustration */}
        <div className="order-1 lg:order-none">
          <div
            className="overflow-hidden rounded-3xl border"
            style={{
              borderColor: "var(--lofi-glow-border)",
              boxShadow: "var(--lofi-shadow)",
            }}
          >
            <img
              src={workspaceAsset.url}
              alt="Cozy golden-hour lofi study workspace with headphones, plants and coffee"
              className="h-48 w-full object-cover sm:h-72 lg:h-[34rem]"
            />
          </div>
        </div>

        {/* Right column — login card */}
        <div className="order-2 flex items-center justify-center lg:order-none">
      <div
        className="w-full max-w-md rounded-3xl border p-8 backdrop-blur-md sm:p-10"
        style={{
          borderColor: "var(--lofi-glow-border)",
          background: "var(--lofi-card)",
          boxShadow: "var(--lofi-shadow)",
        }}
      >
        <div className="mb-8 text-center">
          <p className="text-3xl">🎧</p>
          <h1
            className="mt-2 text-3xl font-bold tracking-tight text-[var(--lofi-blue-deep)]"
            style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
          >
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
            className="mt-2 rounded-xl bg-[var(--lofi-blue)] px-5 py-3.5 text-sm font-bold text-[var(--lofi-bg-1)] shadow-[var(--lofi-shadow)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>
      </div>
        </div>
      </div>
    </div>
  );
}
