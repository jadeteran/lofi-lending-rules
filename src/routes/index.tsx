import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { analyzeScenario, LOAN_TYPES } from "@/lib/guidelines.functions";

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
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const mutation = useMutation({
    mutationFn: (vars: { loanType: string; scenario: string; images: string[] }) =>
      analyze({ data: vars }),
  });

  const canSubmit =
    loanType.trim() !== "" &&
    (scenario.trim() !== "" || images.length > 0) &&
    !mutation.isPending;

  function readFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    list.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setImages((prev) => (prev.length >= 6 ? prev : [...prev, url]));
      };
      reader.readAsDataURL(file);
    });
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.kind === "file" && item.type.startsWith("image/")) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) readFiles(files);
  }

  function removeImage(idx: number) {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    mutation.mutate({ loanType, scenario: scenario.trim(), images });
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
          onPaste={handlePaste}
          rows={5}
          placeholder="Paste or type a tough stip, describe the loan scenario, or paste/upload a screenshot… e.g. 'Borrower is self-employed with declining income year over year and underwriter wants P&L support.'"
          className="w-full resize-y rounded-2xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-4 py-3.5 text-sm font-semibold leading-relaxed text-[var(--lofi-ink)] shadow-[var(--lofi-shadow)] outline-none transition focus:border-[var(--lofi-blue)] placeholder:font-normal placeholder:text-[var(--lofi-muted)]"
        />

        {images.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {images.map((src, i) => (
              <div key={i} className="relative">
                <img
                  src={src}
                  alt={`Attachment ${i + 1}`}
                  className="h-20 w-20 rounded-xl border border-[var(--lofi-cream-deep)] object-cover shadow-[var(--lofi-shadow)]"
                />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  aria-label="Remove image"
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--lofi-blue-deep)] text-xs font-bold text-[var(--lofi-cream)] shadow-[var(--lofi-shadow)]"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) readFiles(e.target.files);
            e.target.value = "";
          }}
        />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-2xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-5 py-3 text-sm font-bold text-[var(--lofi-blue-deep)] shadow-[var(--lofi-shadow)] transition hover:-translate-y-0.5"
          >
            📎 Upload image
          </button>
          <span className="text-xs text-[var(--lofi-muted)]">
            Paste images or text directly into the box · up to 6 images
          </span>

          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-2xl bg-[var(--lofi-blue-deep)] px-7 py-3.5 text-sm font-extrabold text-[var(--lofi-cream)] shadow-[var(--lofi-shadow)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {mutation.isPending ? "Analyzing the track…" : "Analyze scenario"}
          </button>
        </div>
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
