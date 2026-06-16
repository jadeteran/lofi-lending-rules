import { createFileRoute } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";

import {
  getGuidelines,
  LOAN_TYPES,
  type Guideline,
} from "@/lib/guidelines.functions";

const guidelinesQuery = queryOptions({
  queryKey: ["lofi-guidelines"],
  queryFn: () => getGuidelines(),
  staleTime: 30_000,
});

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Cozy Guideline Study Corner — Lofi Lending" },
      {
        name: "description",
        content:
          "A calm study corner to search and filter mortgage guidelines by loan type. Relax, sip your coffee, and find your stips.",
      },
      { property: "og:title", content: "Cozy Guideline Study Corner" },
      {
        property: "og:description",
        content: "Search and filter lending guidelines in a relaxed lofi study space.",
      },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(guidelinesQuery),
  component: StudyCorner,
  errorComponent: ({ error }) => (
    <Shell>
      <div className="rounded-3xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] p-10 text-center shadow-[var(--lofi-shadow)]">
        <p className="text-lg font-bold text-[var(--lofi-blue-deep)]">
          The record skipped a beat 🎧
        </p>
        <p className="mt-2 text-sm text-[var(--lofi-muted)]">{error.message}</p>
      </div>
    </Shell>
  ),
  notFoundComponent: () => (
    <Shell>
      <p className="text-center text-[var(--lofi-muted)]">Nothing here yet.</p>
    </Shell>
  ),
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
  const { data: guidelines } = useSuspenseQuery(guidelinesQuery);
  const [search, setSearch] = useState("");
  const [loanType, setLoanType] = useState("");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return guidelines.filter((g) => {
      if (loanType && g.loan_type !== loanType) return false;
      if (!q) return true;
      const haystack = `${g.rule_name ?? ""} ${g.guideline_text ?? ""}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [guidelines, search, loanType]);

  return (
    <Shell>
      <header className="mb-10 text-center">
        <p className="text-3xl">🎧</p>
        <h1 className="mt-2 text-4xl font-extrabold tracking-tight text-[var(--lofi-blue-deep)] sm:text-5xl">
          Cozy Guideline Study Corner
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[var(--lofi-muted)]">
          Take a breath, queue the lofi beats, and gently sift through your lending
          guidelines. Everything here is pulled live and verified.
        </p>
      </header>

      <div className="mb-10 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--lofi-muted)]">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search rule names and guideline text…"
            className="w-full rounded-2xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] py-3.5 pl-11 pr-4 text-sm font-semibold text-[var(--lofi-ink)] shadow-[var(--lofi-shadow)] outline-none transition focus:border-[var(--lofi-blue)] placeholder:font-normal placeholder:text-[var(--lofi-muted)]"
          />
        </div>
        <select
          value={loanType}
          onChange={(e) => setLoanType(e.target.value)}
          className="rounded-2xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-4 py-3.5 text-sm font-semibold text-[var(--lofi-ink)] shadow-[var(--lofi-shadow)] outline-none transition focus:border-[var(--lofi-blue)] sm:w-72"
        >
          <option value="">All loan types</option>
          {LOAN_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)]/70 px-8 py-16 text-center">
          <p className="text-3xl">☕</p>
          <p className="mt-3 text-lg font-bold text-[var(--lofi-blue-deep)]">
            No stips found... keep sipping your coffee.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {filtered.map((g) => (
            <GuidelineCard key={g.id} guideline={g} />
          ))}
        </div>
      )}

      <footer className="mt-14 text-center text-xs text-[var(--lofi-muted)]">
        {filtered.length} of {guidelines.length} guidelines · stay cozy ✨
      </footer>
    </Shell>
  );
}

function GuidelineCard({ guideline }: { guideline: Guideline }) {
  return (
    <article className="flex flex-col rounded-3xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] p-7 shadow-[var(--lofi-shadow)] transition hover:-translate-y-0.5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {guideline.loan_type && (
          <span className="rounded-full bg-[var(--lofi-lavender)] px-3 py-1 text-xs font-bold text-[var(--lofi-blue-deep)]">
            {guideline.loan_type}
          </span>
        )}
        {guideline.category && (
          <span className="rounded-full bg-[var(--lofi-peach)] px-3 py-1 text-xs font-semibold text-[var(--lofi-ink)]">
            {guideline.category}
          </span>
        )}
      </div>

      <h2 className="text-lg font-extrabold leading-snug text-[var(--lofi-blue-deep)]">
        {guideline.rule_name ?? "Untitled rule"}
      </h2>

      <p className="mt-3 flex-1 whitespace-pre-line text-sm leading-relaxed text-[var(--lofi-ink)]">
        {guideline.guideline_text ?? "No guideline text provided."}
      </p>

      <p className="mt-6 border-t border-[var(--lofi-cream-deep)] pt-3 text-[0.7rem] font-medium italic text-[var(--lofi-muted)]">
        Source Track Checked: ID #{guideline.id}
      </p>
    </article>
  );
}
