import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { generateReport, LOAN_PROGRAMS } from "@/lib/underwriting.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lofi Lending — Mortgage Underwriting Analysis" },
      {
        name: "description",
        content:
          "Analyze complex mortgage underwriting scenarios against official government loan program guidelines.",
      },
      { property: "og:title", content: "Lofi Lending" },
      {
        property: "og:description",
        content:
          "Analyze complex mortgage underwriting scenarios against official loan program guidelines.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const generate = useServerFn(generateReport);
  const [loanProgram, setLoanProgram] = useState<(typeof LOAN_PROGRAMS)[number] | "">("");
  const [scenario, setScenario] = useState("");
  const [copied, setCopied] = useState(false);

  const mutation = useMutation({
    mutationFn: (vars: { loanProgram: (typeof LOAN_PROGRAMS)[number]; scenario: string }) =>
      generate({ data: vars }),
  });

  const result = mutation.data;
  const canSubmit = loanProgram !== "" && scenario.trim().length > 0 && !mutation.isPending;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loanProgram === "" || !scenario.trim()) return;
    setCopied(false);
    mutation.mutate({ loanProgram, scenario: scenario.trim() });
  }

  async function handleCopy() {
    if (!result?.report) return;
    await navigator.clipboard.writeText(result.report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <header className="mb-12">
          <h1 className="text-3xl font-semibold tracking-tight">Lofi Lending</h1>
          <p className="mt-2 text-neutral-500">
            Analyze complex mortgage underwriting scenarios against official loan program
            guidelines.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label htmlFor="loanProgram" className="block text-sm font-medium">
              Loan Program
            </label>
            <select
              id="loanProgram"
              value={loanProgram}
              onChange={(e) =>
                setLoanProgram(e.target.value as (typeof LOAN_PROGRAMS)[number] | "")
              }
              className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            >
              <option value="" disabled>
                Select a loan program…
              </option>
              {LOAN_PROGRAMS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label htmlFor="scenario" className="block text-sm font-medium">
              Underwriting Scenario
            </label>
            <textarea
              id="scenario"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              rows={8}
              placeholder="Describe the borrower, property, income, assets, and any underwriter conditions or roadblocks…"
              className="w-full resize-y rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm leading-relaxed focus:border-neutral-900 focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-md bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mutation.isPending ? "Analyzing…" : "Generate Report"}
          </button>
        </form>

        {(result?.error || mutation.isError) && (
          <p className="mt-8 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {result?.error ?? "Something went wrong. Please try again."}
          </p>
        )}

        {result?.report && (
          <section className="mt-12 border-t border-neutral-200 pt-10">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">
                Analysis Report
              </h2>
              <button
                onClick={handleCopy}
                className="rounded-md border border-neutral-300 px-3 py-1.5 text-xs font-medium hover:bg-neutral-50"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <article className="report-md max-w-none text-sm leading-relaxed text-neutral-800">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.report}</ReactMarkdown>
            </article>
          </section>
        )}
      </div>
    </div>
  );
}
