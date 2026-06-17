import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import {
  analyzeScenario,
  LOAN_TYPES,
  type Analysis,
} from "@/lib/guidelines.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Guideline Assistant — Lofi Lending" },
      {
        name: "description",
        content:
          "A calm AI study corner for loan officers. Drop in a tough stip or loan scenario and get instant guideline requirements, roadblocks, and the docs to request.",
      },
      { property: "og:title", content: "AI Guideline Assistant" },
      {
        property: "og:description",
        content:
          "Analyze loan scenarios instantly with an AI underwriting assistant in a relaxed lofi study space.",
      },
    ],
  }),
  component: StudyCorner,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: "'Nunito', ui-sans-serif, system-ui, sans-serif",
        background:
          "linear-gradient(160deg, var(--lofi-cream) 0%, var(--lofi-lavender) 55%, var(--lofi-cream-deep) 100%)",
        color: "var(--lofi-ink)",
      }}
    >
      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10 sm:py-20">{children}</div>
    </div>
  );
}

function StudyCorner() {
  const analyze = useServerFn(analyzeScenario);
  const [loanType, setLoanType] = useState("");
  const [scenario, setScenario] = useState("");

  const mutation = useMutation({
    mutationFn: (vars: { loanType: string; scenario: string }) =>
      analyze({ data: vars }),
  });

  const canSubmit = loanType.trim() !== "" && scenario.trim() !== "" && !mutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({ loanType, scenario: scenario.trim() });
  }

  const result = mutation.data;

  return (
    <Shell>
      <header className="mb-10 text-center">
        <p className="text-3xl">🎧</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[var(--lofi-blue-deep)] sm:text-5xl">
          AI Guideline Assistant
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[var(--lofi-muted)]">
          Queue the lofi beats, pick a loan program, and drop in a real-world scenario
          or a tough underwriter stip. The assistant maps the guideline requirements,
          roadblocks, and exactly what to request from your borrower.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mb-10 flex flex-col gap-4">
        <select
          value={loanType}
          onChange={(e) => setLoanType(e.target.value)}
          className="rounded-2xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-4 py-3.5 text-sm font-semibold text-[var(--lofi-ink)] shadow-[var(--lofi-shadow)] outline-none transition focus:border-[var(--lofi-blue)]"
        >
          <option value="">Select a loan program…</option>
          {LOAN_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>

        <textarea
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          rows={5}
          placeholder="Paste a tough stip or describe the loan scenario… e.g. 'Borrower is self-employed with declining income year over year and underwriter wants P&L support.'"
          className="w-full resize-y rounded-2xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-4 py-3.5 text-sm font-semibold leading-relaxed text-[var(--lofi-ink)] shadow-[var(--lofi-shadow)] outline-none transition focus:border-[var(--lofi-blue)] placeholder:font-normal placeholder:text-[var(--lofi-muted)]"
        />

        <button
          type="submit"
          disabled={!canSubmit}
          className="self-end rounded-2xl bg-[var(--lofi-blue-deep)] px-7 py-3.5 text-sm font-extrabold text-[var(--lofi-cream)] shadow-[var(--lofi-shadow)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
        >
          {mutation.isPending ? "Analyzing the track…" : "Analyze scenario"}
        </button>
      </form>

      {mutation.isError ? (
        <div className="rounded-3xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] p-10 text-center shadow-[var(--lofi-shadow)]">
          <p className="text-lg font-bold text-[var(--lofi-blue-deep)]">
            The record skipped a beat 🎧
          </p>
          <p className="mt-2 text-sm text-[var(--lofi-muted)]">
            {(mutation.error as Error).message}
          </p>
        </div>
      ) : result ? (
        <div className="grid grid-cols-1 gap-6">
          <ResultCard title="Guideline Requirements" emoji="📋" text={result.guidelineRequirements} accent="lavender" />
          <ResultCard title="Potential Roadblocks" emoji="🚧" text={result.roadblocks} accent="peach" />
          <ResultCard title="Documentation to Request" emoji="📂" text={result.documentation} accent="sage" />
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)]/70 px-8 py-16 text-center">
          <p className="text-3xl">☕</p>
          <p className="mt-3 text-lg font-bold text-[var(--lofi-blue-deep)]">
            Queue the beats and drop a scenario to analyze…
          </p>
        </div>
      )}

      <footer className="mt-14 text-center text-xs text-[var(--lofi-muted)]">
        AI-generated guidance — always verify against your investor overlays · stay cozy ✨
      </footer>
    </Shell>
  );
}

function ResultCard({
  title,
  emoji,
  text,
  accent,
}: {
  title: string;
  emoji: string;
  text: string;
  accent: "lavender" | "peach" | "sage";
}) {
  const accentVar =
    accent === "lavender"
      ? "var(--lofi-lavender)"
      : accent === "peach"
        ? "var(--lofi-peach)"
        : "var(--lofi-sage)";

  return (
    <article className="flex flex-col rounded-3xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] p-7 shadow-[var(--lofi-shadow)]">
      <div className="mb-3 flex items-center gap-2">
        <span
          className="rounded-full px-3 py-1 text-xs font-bold text-[var(--lofi-blue-deep)]"
          style={{ backgroundColor: accentVar }}
        >
          {emoji} {title}
        </span>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--lofi-ink)]">
        {text}
      </p>
    </article>
  );
}
