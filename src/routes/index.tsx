import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { analyzeScenario, LOAN_TYPES, type Analysis, type Documentation, type AlternativeProgram, type FileProfile } from "@/lib/guidelines.functions";
import { saveScenario, listScenarios, type HistoryItem } from "@/lib/scenarios.functions";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { LoginPage } from "@/components/LoginPage";
import { SettingsPanel } from "@/components/SettingsPanel";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AI Guideline Assistant — Lofi Lending" },
      {
        name: "description",
        content:
          "A calm AI study corner for loan officers. Drop in a tough stip or loan scenario and get instant guideline requirements, roadblocks, LTV thresholds, and the docs to request.",
      },
      { property: "og:title", content: "AI Guideline Assistant" },
      {
        property: "og:description",
        content:
          "Analyze and re-evaluate loan scenarios with an AI underwriting assistant — version every override in a relaxed lofi study space.",
      },
    ],
  }),
  component: AppRoot,
});

function AppRoot() {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
}

function AuthGate() {
  const { loading, session } = useAuth();

  if (loading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center"
        style={{
          background:
            "radial-gradient(1200px 600px at 50% -10%, var(--lofi-bg-2) 0%, var(--lofi-bg-1) 45%, var(--lofi-bg-3) 100%)",
          color: "var(--lofi-muted)",
          fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <p className="animate-pulse text-sm">🎧 Tuning in…</p>
      </div>
    );
  }

  if (!session) return <LoginPage />;
  return <StudyCorner />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="min-h-screen"
      style={{
        fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
        background:
          "radial-gradient(1200px 600px at 50% -10%, var(--lofi-bg-2) 0%, var(--lofi-bg-1) 45%, var(--lofi-bg-3) 100%)",
        color: "var(--lofi-ink)",
      }}
    >
      <div className="mx-auto max-w-5xl px-6 py-16 sm:px-10 sm:py-20">{children}</div>
    </div>
  );
}

type Attachment = { name: string; mediaType: string; dataUrl: string };

type Version = {
  id: number;
  label: string;
  createdAt: number;
  report: Analysis;
  isBase: boolean;
};

const ACCEPTED = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];

function shortLabel(text: string) {
  const clean = text.trim().replace(/\s+/g, " ");
  if (!clean) return "Context update";
  return clean.length > 48 ? `${clean.slice(0, 48)}…` : clean;
}

function timeOf(ts: number) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StudyCorner() {
  const { role, signOut } = useAuth();
  const [showSettings, setShowSettings] = useState(false);
  const analyze = useServerFn(analyzeScenario);
  const saveFn = useServerFn(saveScenario);
  const listFn = useServerFn(listScenarios);
  const [loanType, setLoanType] = useState<string>("");
  const [scenario, setScenario] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [selected, setSelected] = useState(0);
  const [showTimeline, setShowTimeline] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const [lastProgram, setLastProgram] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const nextId = useRef(1);

  const hasVersions = versions.length > 0;
  // Once a report exists, any new context or a changed program means there's
  // pending work to recalculate.
  const isDirty =
    hasVersions &&
    (scenario.trim() !== "" || attachments.length > 0 || loanType !== lastProgram);

  const historyQuery = useQuery({
    queryKey: ["scenario-history"],
    queryFn: () => listFn(),
    staleTime: 30_000,
  });

  // Briefly flash the "Saved" indicator, then fade it out.
  useEffect(() => {
    if (!savedFlash) return;
    const t = setTimeout(() => setSavedFlash(false), 2600);
    return () => clearTimeout(t);
  }, [savedFlash]);

  const mutation = useMutation({
    mutationFn: (vars: {
      loanType: string;
      scenario: string;
      attachments: Attachment[];
      mode: "initial" | "override";
      previousReport?: Analysis;
    }) => analyze({ data: vars }),
    onSuccess: (report, vars) => {
      setVersions((prev) => {
        const id = nextId.current++;
        const isBase = prev.length === 0;
        const next: Version = {
          id,
          label: isBase ? "Base analysis" : shortLabel(vars.scenario),
          createdAt: Date.now(),
          report,
          isBase,
        };
        const updated = [...prev, next];
        setSelected(updated.length - 1);
        return updated;
      });
      // Silent background autosave — never blocks or interrupts the flow.
      void saveFn({
        data: {
          rawScenario: vars.scenario,
          selectedProgram: vars.loanType,
          analysis: report as unknown as Record<string, unknown>,
        },
      })
        .then((res) => {
          if (res?.saved) {
            setSavedFlash(true);
            historyQuery.refetch();
          }
        })
        .catch(() => {});
      setScenario("");
      setAttachments([]);
      setLastProgram(vars.loanType);
    },
  });

  function loadFromHistory(item: HistoryItem) {
    nextId.current = 1;
    setLoanType(item.selectedProgram);
    setScenario(item.rawScenario);
    setAttachments([]);
    setVersions([
      {
        id: nextId.current++,
        label: "Base analysis",
        createdAt: item.updatedAt ? new Date(item.updatedAt).getTime() : Date.now(),
        report: item.analysis,
        isBase: true,
      },
    ]);
    setSelected(0);
    setLastProgram(item.selectedProgram);
    setDrawerOpen(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function clearSlate() {
    nextId.current = 1;
    setScenario("");
    setAttachments([]);
    setLoanType("");
    setVersions([]);
    setSelected(0);
    setLastProgram(null);
    mutation.reset();
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }




  const canSubmit =
    loanType.trim() !== "" &&
    (scenario.trim() !== "" || attachments.length > 0) &&
    !mutation.isPending;

  function readFiles(files: FileList | File[]) {
    const list = Array.from(files).filter((f) => ACCEPTED.includes(f.type));
    list.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const url = reader.result as string;
        setAttachments((prev) =>
          prev.length >= 6
            ? prev
            : [...prev, { name: file.name, mediaType: file.type, dataUrl: url }],
        );
      };
      reader.readAsDataURL(file);
    });
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (const item of items) {
      if (item.kind === "file" && ACCEPTED.includes(item.type)) {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
    if (files.length > 0) readFiles(files);
  }

  function removeAttachment(idx: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    const mode: "initial" | "override" = hasVersions ? "override" : "initial";
    mutation.mutate({
      loanType,
      scenario: scenario.trim(),
      attachments,
      mode,
      previousReport: hasVersions ? versions[versions.length - 1].report : undefined,
    });
  }

  const current = versions[selected];
  const isLatest = selected === versions.length - 1;

  return (
    <Shell>
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open previous scenarios"
          title="Previous Scenarios"
          className="flex h-10 items-center justify-center gap-2 rounded-full border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-4 text-sm font-bold text-[var(--lofi-blue-deep)] shadow-[var(--lofi-shadow)] backdrop-blur-md transition hover:-translate-y-0.5"
        >
          🕑 Previous Scenarios
          {(historyQuery.data?.length ?? 0) > 0 && (
            <span className="rounded-full bg-[var(--lofi-blue)] px-2 py-0.5 text-[10px] text-[var(--lofi-blue-deep)]">
              {historyQuery.data?.length}
            </span>
          )}
        </button>
        <div className="flex items-center gap-2">
          {role === "admin" && (
            <button
              type="button"
              onClick={() => setShowSettings(true)}
              aria-label="Open settings"
              title="Settings"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] text-lg shadow-[var(--lofi-shadow)] backdrop-blur-md transition hover:-translate-y-0.5"
            >
              ⚙️
            </button>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-4 text-sm font-bold text-[var(--lofi-blue-deep)] shadow-[var(--lofi-shadow)] backdrop-blur-md transition hover:-translate-y-0.5"
          >
            ⏏ Sign out
          </button>
        </div>
      </div>
      {showSettings && role === "admin" && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
      <header className="mb-10 text-center">
        <p className="text-3xl">🎧</p>

        <h1
          className="mt-2 text-4xl font-bold tracking-tight text-[var(--lofi-blue-deep)] sm:text-5xl"
          style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace" }}
        >
          AI Guideline Assistant
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[var(--lofi-muted)]">
          Pick a loan program and drop in a scenario for the base read. Then feed
          live context or operational overrides — the assistant re-evaluates the file,
          drops stale roadblocks, recalculates LTV, and versions every pass.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="mb-10 flex flex-col gap-4">
        <select
          value={loanType}
          onChange={(e) => setLoanType(e.target.value)}
          className="rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-4 py-3.5 text-sm font-semibold text-[var(--lofi-ink)] shadow-[var(--lofi-shadow)] outline-none transition focus:border-[var(--lofi-blue)]"
        >
          <option value="" disabled>
            Select an option…
          </option>
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
          placeholder={
            hasVersions
              ? "Add updated context or an operational override… e.g. 'Borrower switched from cash-out to rate-and-term; appraisal came in at $640k.'"
              : "Paste or type a tough stip, describe the loan scenario, or paste/upload a screenshot… e.g. 'Borrower is self-employed with declining income year over year and underwriter wants P&L support.'"
          }
          className="w-full resize-y rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-4 py-3.5 text-sm font-semibold leading-relaxed text-[var(--lofi-ink)] shadow-[var(--lofi-shadow)] outline-none transition focus:border-[var(--lofi-blue)] placeholder:font-normal placeholder:text-[var(--lofi-muted)]"
        />

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {attachments.map((att, i) => (
              <div key={i} className="relative">
                {att.mediaType.startsWith("image/") ? (
                  <img
                    src={att.dataUrl}
                    alt={att.name}
                    className="h-20 w-20 rounded-xl border border-[var(--lofi-cream-deep)] object-cover shadow-[var(--lofi-shadow)]"
                  />
                ) : (
                  <div className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] p-1 text-center shadow-[var(--lofi-shadow)]">
                    <span className="text-2xl">📄</span>
                    <span className="w-full truncate text-[10px] font-semibold text-[var(--lofi-muted)]">
                      {att.name}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  aria-label="Remove attachment"
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
          accept="image/jpeg,image/png,application/pdf"
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
            className="rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-5 py-3 text-sm font-bold text-[var(--lofi-blue-deep)] shadow-[var(--lofi-shadow)] transition hover:-translate-y-0.5"
          >
            📎 Upload JPEG, PNG, or PDF
          </button>
          <span className="text-xs text-[var(--lofi-muted)]">
            Paste images/text or upload JPEG, PNG, PDF · up to 6 files
          </span>

          <div className="flex items-center gap-3" style={{ fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif" }}>
            {(hasVersions || scenario.trim() !== "" || attachments.length > 0 || loanType !== "") && (
              <button
                type="button"
                onClick={clearSlate}
                className="rounded-xl border border-[var(--lofi-cream)]/30 bg-[var(--lofi-cream)]/5 px-5 py-3.5 text-sm font-semibold text-[var(--lofi-cream)] backdrop-blur-md transition hover:-translate-y-0.5 hover:bg-[var(--lofi-cream)]/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lofi-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                ✨ Clear Slate
              </button>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="rounded-xl border border-[var(--lofi-blue)]/40 bg-[var(--lofi-blue-deep)]/90 px-7 py-3.5 text-sm font-bold text-[var(--lofi-cream)] backdrop-blur-md shadow-[var(--lofi-shadow)] transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lofi-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
            >
              {mutation.isPending
                ? isDirty
                  ? "Recalculating…"
                  : "Analyzing the track…"
                : isDirty
                  ? "Update Analysis"
                  : "Analyze Scenario"}
            </button>
          </div>

        </div>
      </form>

      <div className="mb-8 -mt-6 flex h-5 items-center justify-end">
        <span
          aria-live="polite"
          className={`flex items-center gap-1.5 text-xs font-semibold text-[var(--lofi-blue-deep)] transition-opacity duration-500 ${
            savedFlash ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--lofi-blue)] text-[10px] text-[var(--lofi-blue-deep)]">
            ✓
          </span>
          All changes saved to history
        </span>
      </div>

      <HistoryDrawer
        items={historyQuery.data ?? []}
        open={drawerOpen}
        activeProfile={current?.report?.fileProfile ?? null}
        onClose={() => setDrawerOpen(false)}
        onPick={loadFromHistory}
      />


      {mutation.isError && (
        <div className="mb-6 rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] p-6 text-center shadow-[var(--lofi-shadow)]">
          <p className="text-lg font-bold text-[var(--lofi-blue-deep)]">
            The record skipped a beat 🎧
          </p>
          <p className="mt-2 text-sm text-[var(--lofi-muted)]">
            {(mutation.error as Error).message}
          </p>
        </div>
      )}

      {current ? (
        <div className="flex flex-col gap-6 lg:flex-row">
          <section className="min-w-0 flex-1">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-extrabold text-[var(--lofi-blue-deep)]">
                  Clean Report View
                </h2>
                <p className="text-xs text-[var(--lofi-muted)]">
                  {current.isBase ? "Base analysis" : current.label} ·{" "}
                  {timeOf(current.createdAt)}
                  {!isLatest && " · viewing older version (read-only)"}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {versions.map((v, i) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelected(i)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-bold shadow-[var(--lofi-shadow)] transition ${
                      i === selected
                        ? "bg-[var(--lofi-blue-deep)] text-[var(--lofi-cream)]"
                        : "border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] text-[var(--lofi-blue-deep)] hover:-translate-y-0.5"
                    }`}
                  >
                    v{i + 1}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowTimeline((s) => !s)}
                  className="rounded-full border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-3.5 py-1.5 text-xs font-bold text-[var(--lofi-blue-deep)] shadow-[var(--lofi-shadow)] transition hover:-translate-y-0.5 lg:hidden"
                >
                  {showTimeline ? "Hide timeline" : "Show timeline"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {current.report.recommendation &&
                current.report.recommendation.trim() !==
                  "- N/A — program was specified by the loan officer." && (
                  <RecommendationCard
                    program={current.report.recommendedProgram}
                    recommendation={current.report.recommendation}
                  />
                )}
              <ResultCard title="Guideline Requirements" emoji="📋" text={current.report.guidelineRequirements} accent="lavender" />
              <ResultCard title="Potential Roadblocks" emoji="🚧" text={current.report.roadblocks} accent="peach" />
              <ResultCard title="LTV / Eligibility" emoji="📊" text={current.report.ltv} accent="blue" />
              <AlternativesCard alternatives={current.report.alternatives} />
              <DocumentationCard documentation={current.report.documentation} />
              <ResultCard title="Handbook Citations & Sources" emoji="📚" text={current.report.citations} accent="sage" />
            </div>
          </section>

          {showTimeline && (
            <aside className="lg:w-72 lg:shrink-0">
              <div className="rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] p-5 shadow-[var(--lofi-shadow)] lg:sticky lg:top-8">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-[var(--lofi-blue-deep)]">
                    Event Timeline
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowTimeline(false)}
                    aria-label="Collapse timeline"
                    className="hidden text-xs font-bold text-[var(--lofi-muted)] hover:text-[var(--lofi-blue-deep)] lg:block"
                  >
                    ✕
                  </button>
                </div>
                <ol className="flex flex-col gap-4">
                  {versions.map((v, i) => (
                    <li key={v.id} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <span
                          className={`mt-0.5 h-2.5 w-2.5 rounded-full ${
                            i === selected
                              ? "bg-[var(--lofi-blue-deep)]"
                              : "bg-[var(--lofi-cream-deep)]"
                          }`}
                        />
                        {i < versions.length - 1 && (
                          <span className="mt-1 w-px flex-1 bg-[var(--lofi-cream-deep)]" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelected(i)}
                        className="-mt-1 flex-1 text-left"
                      >
                        <p className="text-xs font-bold text-[var(--lofi-blue-deep)]">
                          v{i + 1} · {v.isBase ? "created" : "override applied"}
                        </p>
                        <p className="text-[11px] text-[var(--lofi-muted)]">
                          {timeOf(v.createdAt)} · {v.isBase ? "base" : v.label}
                        </p>
                      </button>
                    </li>
                  ))}
                </ol>
              </div>
            </aside>
          )}
        </div>
      ) : (
        !mutation.isError && (
          <div className="rounded-xl border border-dashed border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)]/70 px-8 py-16 text-center">
            <p className="text-3xl">☕</p>
            <p className="mt-3 text-lg font-bold text-[var(--lofi-blue-deep)]">
              Queue the beats and drop a scenario to analyze…
            </p>
          </div>
        )
      )}

      <footer className="mt-14 text-center text-xs text-[var(--lofi-muted)]">
        AI-generated guidance — always verify against your investor overlays · stay cozy ✨
      </footer>
    </Shell>
  );
}

function whenOf(iso: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function num(v: string | undefined) {
  if (!v) return null;
  const n = parseInt(String(v).replace(/[^\d]/g, ""), 10);
  return Number.isNaN(n) ? null : n;
}

/** Lightweight client-side similarity score between an active profile and a saved item. */
function similarityScore(active: FileProfile, item: HistoryItem) {
  const fp = item.analysis?.fileProfile;
  const group = item.profileGroup || fp?.profileGroup || "";
  const state = item.propertyState || fp?.propertyState || "";
  const fico = num(item.creditScore || fp?.creditScore);
  const dti = num(item.dti || fp?.dti);

  let score = 0;
  if (group && group !== "Unclassified" && group === active.profileGroup) score += 5;
  if (state && state !== "—" && state === active.propertyState) score += 2;

  const aFico = num(active.creditScore);
  if (fico !== null && aFico !== null && Math.abs(fico - aFico) <= 20) score += 2;

  const aDti = num(active.dti);
  if (dti !== null && aDti !== null && Math.abs(dti - aDti) <= 5) score += 2;

  return score;
}

function HistoryDrawer({
  items,
  open,
  activeProfile,
  onClose,
  onPick,
}: {
  items: HistoryItem[];
  open: boolean;
  activeProfile: FileProfile | null;
  onClose: () => void;
  onPick: (item: HistoryItem) => void;
}) {
  const similar = activeProfile
    ? items
        .map((item) => ({ item, score: similarityScore(activeProfile, item) }))
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 5)
        .map((s) => s.item)
    : [];

  const similarIds = new Set(similar.map((i) => i.id));
  const rest = items.filter((i) => !similarIds.has(i.id));

  return (
    <>
      {/* Dim click-dismiss overlay */}
      <div
        onClick={onClose}
        aria-hidden={!open}
        className={`fixed inset-0 z-40 bg-[var(--lofi-blue-deep)]/30 backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Left drawer */}
      <aside
        role="dialog"
        aria-label="Previous scenarios"
        className={`fixed inset-y-0 left-0 z-50 flex w-full flex-col border-r border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)]/95 shadow-[var(--lofi-shadow)] backdrop-blur-xl transition-transform duration-300 ease-out sm:w-[400px] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--lofi-cream-deep)] px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[var(--lofi-blue-deep)]">
            🕑 Previous Scenarios
            <span className="rounded-full bg-[var(--lofi-blue)] px-2 py-0.5 text-[10px] text-[var(--lofi-blue-deep)]">
              {items.length}
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] text-base font-bold text-[var(--lofi-blue-deep)] shadow-[var(--lofi-shadow)] transition hover:-translate-y-0.5"
          >
            →
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {items.length === 0 ? (
            <p className="mt-10 text-center text-sm text-[var(--lofi-muted)]">
              No saved scenarios yet. Analyze a file and it lands here.
            </p>
          ) : (
            <div className="flex flex-col gap-6">
              {similar.length > 0 && (
                <section>
                  <h4 className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[var(--lofi-blue-deep)]">
                    ✨ Similar Team Scenarios
                  </h4>
                  <ul className="flex flex-col gap-2">
                    {similar.map((item) => (
                      <li key={item.id}>
                        <HistoryCard item={item} onPick={onPick} highlight />
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <section>
                <h4 className="mb-3 flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-wider text-[var(--lofi-muted)]">
                  {similar.length > 0 ? "All Recent History" : "Recent History"}
                </h4>
                <ul className="flex flex-col gap-2">
                  {rest.map((item) => (
                    <li key={item.id}>
                      <HistoryCard item={item} onPick={onPick} />
                    </li>
                  ))}
                </ul>
              </section>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}

function HistoryCard({
  item,
  onPick,
  highlight,
}: {
  item: HistoryItem;
  onPick: (item: HistoryItem) => void;
  highlight?: boolean;
}) {
  const fp = item.analysis?.fileProfile;
  const headline =
    item.summaryTitle ||
    fp?.summaryTitle ||
    item.analysis?.recommendedProgram ||
    item.rawScenario.trim().replace(/\s+/g, " ").slice(0, 70) ||
    "Saved scenario";
  const fico = item.creditScore || fp?.creditScore || "";
  const dti = item.dti || fp?.dti || "";
  const ltv = item.ltv || fp?.ltv || "";
  const state = item.propertyState || fp?.propertyState || "";
  const group = item.profileGroup || fp?.profileGroup || "";
  const badges = [
    fico && fico !== "—" && { k: "FICO", v: fico },
    dti && dti !== "—" && { k: "DTI", v: dti },
    ltv && ltv !== "—" && { k: "LTV", v: ltv },
    state && state !== "—" && { k: "ST", v: state },
  ].filter(Boolean) as { k: string; v: string }[];

  return (
    <button
      type="button"
      onClick={() => onPick(item)}
      className={`group flex w-full flex-col gap-2 rounded-xl border px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-[var(--lofi-blue)] hover:bg-[var(--lofi-blue)]/10 ${
        highlight
          ? "border-[var(--lofi-blue)]/50 bg-[var(--lofi-blue)]/10"
          : "border-[var(--lofi-cream-deep)]/60 bg-[var(--lofi-bg)]/40"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex-1 text-sm font-extrabold leading-snug text-[var(--lofi-ink)]">
          {headline}
        </span>
        <span className="shrink-0 text-[11px] text-[var(--lofi-muted)]">
          {whenOf(item.updatedAt)}
        </span>
      </div>
      {badges.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          {badges.map((b) => (
            <span
              key={b.k}
              className="inline-flex items-center gap-1 rounded-md border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-2 py-0.5 text-[10px] font-bold text-[var(--lofi-blue-deep)]"
            >
              <span className="text-[var(--lofi-muted)]">{b.k}</span>
              {b.v}
            </span>
          ))}
        </div>
      )}
      {group && group !== "Unclassified" && (
        <span className="inline-flex w-fit items-center gap-1 rounded-full bg-[var(--lofi-blue)]/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--lofi-blue-deep)]">
          <span aria-hidden>◆</span>
          {group}
        </span>
      )}
    </button>
  );
}



function RecommendationCard({
  program,
  recommendation,
}: {
  program: string;
  recommendation: string;
}) {
  return (
    <article
      className="flex flex-col rounded-xl border-2 p-7 shadow-[var(--lofi-shadow)]"
      style={{
        borderColor: "var(--lofi-blue)",
        background:
          "linear-gradient(150deg, var(--lofi-card) 0%, var(--lofi-blue) 220%)",
      }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className="rounded-full px-3 py-1 text-xs font-bold text-[var(--lofi-blue-deep)]"
          style={{ backgroundColor: "var(--lofi-blue)" }}
        >
          🧭 Program Finder — Top Recommendation
        </span>
        {program && (
          <span className="rounded-full bg-[var(--lofi-card)] px-3 py-1 text-sm font-extrabold text-[var(--lofi-blue-deep)] shadow-[var(--lofi-shadow)]">
            {program}
          </span>
        )}
      </div>
      <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-[var(--lofi-blue-deep)]">
        Why this program wins
      </p>
      <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--lofi-ink)]">
        {recommendation}
      </p>
    </article>
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
  accent: "lavender" | "peach" | "sage" | "blue";
}) {
  const accentVar =
    accent === "lavender"
      ? "var(--lofi-lavender)"
      : accent === "peach"
        ? "var(--lofi-peach)"
        : accent === "blue"
          ? "var(--lofi-blue)"
          : "var(--lofi-sage)";

  return (
    <article className="flex flex-col rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] p-7 shadow-[var(--lofi-shadow)]">
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

function DocumentationCard({ documentation }: { documentation: Documentation }) {
  const buckets: { title: string; emoji: string; text: string }[] = [
    { title: "Borrower Tasks", emoji: "🙋", text: documentation.borrowerTasks },
    { title: "Borrower & LO Collaboration", emoji: "🤝", text: documentation.collaboration },
    { title: "LO / Internal Broker Actions", emoji: "🗂️", text: documentation.loActions },
  ];

  return (
    <article className="flex flex-col rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] p-7 shadow-[var(--lofi-shadow)]">
      <div className="mb-4 flex items-center gap-2">
        <span
          className="rounded-full px-3 py-1 text-xs font-bold text-[var(--lofi-blue-deep)]"
          style={{ backgroundColor: "var(--lofi-sage)" }}
        >
          📂 Documentation to Request
        </span>
      </div>
      <div className="flex flex-col gap-5">
        {buckets.map((b) => (
          <div key={b.title}>
            <p className="mb-1.5 text-xs font-extrabold uppercase tracking-wider text-[var(--lofi-blue-deep)]">
              {b.emoji} {b.title}
            </p>
            <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--lofi-ink)]">
              {b.text}
            </p>
          </div>
        ))}
      </div>
    </article>
  );
}

function statusStyle(status: AlternativeProgram["status"]) {
  switch (status) {
    case "Eligible":
      return { bg: "var(--lofi-sage)", label: "✅ Eligible" };
    case "Likely Eligible":
      return { bg: "var(--lofi-blue)", label: "🟦 Likely Eligible" };
    case "High Risk":
      return { bg: "var(--lofi-peach)", label: "⚠️ High Risk" };
    default:
      return { bg: "var(--lofi-cream-deep)", label: "⛔ Ineligible" };
  }
}

function AlternativesCard({ alternatives }: { alternatives: AlternativeProgram[] }) {
  return (
    <article className="flex flex-col rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] p-7 shadow-[var(--lofi-shadow)]">
      <div className="mb-4 flex items-center gap-2">
        <span
          className="rounded-full px-3 py-1 text-xs font-bold text-[var(--lofi-blue-deep)]"
          style={{ backgroundColor: "var(--lofi-lavender)" }}
        >
          🔀 Alternative Loan Programs
        </span>
      </div>
      {alternatives.length === 0 ? (
        <p className="text-sm leading-relaxed text-[var(--lofi-muted)]">
          No alternative programs evaluated for this scenario yet.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {alternatives.map((a, i) => {
            const s = statusStyle(a.status);
            const risky = a.status === "High Risk" || a.status === "Ineligible";
            return (
              <div
                key={`${a.program}-${i}`}
                className="rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)]/60 p-4"
              >
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-extrabold text-[var(--lofi-blue-deep)]">
                    {a.program}
                  </p>
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-bold text-[var(--lofi-blue-deep)]"
                    style={{ backgroundColor: s.bg }}
                  >
                    {s.label}
                  </span>
                </div>
                <dl className="flex flex-col gap-1.5 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 text-xs font-bold uppercase tracking-wider text-[var(--lofi-muted)]">
                      LTV / CLTV
                    </dt>
                    <dd className="text-[var(--lofi-ink)]">{a.ltvCap}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-28 shrink-0 text-xs font-bold uppercase tracking-wider text-[var(--lofi-muted)]">
                      Benefit
                    </dt>
                    <dd className="text-[var(--lofi-ink)]">{a.benefit}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt
                      className="w-28 shrink-0 text-xs font-bold uppercase tracking-wider"
                      style={{ color: risky ? "var(--lofi-blue-deep)" : "var(--lofi-muted)" }}
                    >
                      Risk Factor
                    </dt>
                    <dd
                      className="whitespace-pre-line"
                      style={{ color: risky ? "var(--lofi-blue-deep)" : "var(--lofi-ink)", fontWeight: risky ? 600 : 400 }}
                    >
                      {a.vulnerability}
                    </dd>
                  </div>
                </dl>
              </div>
            );
          })}
        </div>
      )}
    </article>
  );
}
