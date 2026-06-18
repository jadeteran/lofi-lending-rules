import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import {
  Clock, Settings, LogOut, Paperclip, Sparkles, Check, X, ArrowRight,
  FileText, Diamond, ClipboardList, Construction, BarChart3, BookOpen,
  Compass, Shuffle, FolderOpen, Briefcase, Hand, Handshake, Headphones,
  CheckCircle2, Circle, AlertTriangle, Ban, type LucideIcon,
} from "lucide-react";

import { analyzeScenario, LOAN_TYPES, type Analysis, type Documentation, type AlternativeProgram, type FileProfile, type ReportChatMessage } from "@/lib/guidelines.functions";
import { saveScenario, listScenarios, type HistoryItem } from "@/lib/scenarios.functions";
import { CardChatPopover, type ActiveCard, type ReportContext } from "@/components/ReportCardChat";
import { AuthProvider, useAuth } from "@/components/AuthProvider";
import { LoginPage } from "@/components/LoginPage";
import { SettingsPanel } from "@/components/SettingsPanel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import heroHeadphones from "@/assets/anime-headphones-hero.jpg.asset.json";
import headphoneBadge from "@/assets/anime-headphone-badge.png.asset.json";
import coffeeAccent from "@/assets/anime-coffee-accent.png.asset.json";

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
          background: "var(--lofi-bg-1)",
          color: "var(--lofi-muted)",
        }}
      >
        <p className="flex animate-pulse items-center gap-2 text-sm">
          <Headphones size={16} /> Tuning in…
        </p>
      </div>
    );
  }

  if (!session) return <LoginPage />;
  return <StudyCorner />;
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative min-h-screen"
      style={{
        backgroundColor: "var(--lofi-bg-1)",
        color: "var(--lofi-ink)",
      }}
    >
      {/* Single massive standalone anime hero — no tiling, no patterns */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0"
        style={{
          backgroundColor: "var(--lofi-bg-1)",
          backgroundImage: `url(${heroHeadphones.url})`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "center 22%",
          backgroundSize: "min(90vw, 820px)",
          opacity: 0.14,
        }}
      />
      <div className="relative z-10 mx-auto max-w-5xl px-6 py-16 sm:px-10 sm:py-20">{children}</div>
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

  // Report card assistant (localized chat popover).
  const [activeCard, setActiveCard] = useState<ActiveCard | null>(null);
  const [chatHistories, setChatHistories] = useState<Record<string, ReportChatMessage[]>>({});
  const [chatInsights, setChatInsights] = useState<Record<string, string>>({});

  function openCardChat(payload: ActiveCard) {
    setActiveCard((prev) => (prev?.id === payload.id ? null : payload));
  }

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

  // Close the card assistant when the viewed version changes so its context
  // never goes stale against a different report.
  useEffect(() => {
    setActiveCard(null);
  }, [selected]);

  const reportContext: ReportContext = {
    loanType,
    scenario,
    versionLabel: current ? (current.isBase ? "Base analysis" : current.label) : "",
    report: (current?.report ?? {}) as unknown as Record<string, unknown>,
  };




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
          <Clock size={16} /> Previous Scenarios
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
              <Settings size={18} />
            </button>
          )}
          <button
            type="button"
            onClick={() => void signOut()}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-10 items-center justify-center gap-1.5 rounded-full border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-4 text-sm font-bold text-[var(--lofi-blue-deep)] shadow-[var(--lofi-shadow)] backdrop-blur-md transition hover:-translate-y-0.5"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </div>
      {showSettings && role === "admin" && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
      <header className="mb-10 text-center">
        <img
          src={headphoneBadge.url}
          alt="90s anime side-profile lofi over-ear headphones badge"
          width={96}
          height={96}
          className="mx-auto h-24 w-24 object-contain drop-shadow-[0_8px_20px_oklch(0.4_0.08_56_/_0.35)]"
        />

        <h1
          className="mt-2 text-4xl font-bold tracking-tight text-[var(--lofi-blue-deep)] sm:text-5xl"
          
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
        <Select value={loanType || undefined} onValueChange={setLoanType}>
          <SelectTrigger className="h-auto rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-4 py-3.5 text-sm font-semibold text-[var(--lofi-ink)] shadow-[var(--lofi-shadow)] outline-none transition focus:border-[var(--lofi-blue)]">
            <SelectValue placeholder="Select an option…" />
          </SelectTrigger>
          <SelectContent>
            {LOAN_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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
                    <FileText size={22} className="text-[var(--lofi-blue-deep)]" />
                    <span className="w-full truncate text-[10px] font-semibold text-[var(--lofi-muted)]">
                      {att.name}
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  aria-label="Remove attachment"
                  className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--lofi-blue-deep)] text-[var(--lofi-cream)] shadow-[var(--lofi-shadow)]"
                >
                  <X size={14} />
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
            className="flex items-center gap-2 rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] px-5 py-3 text-sm font-bold text-[var(--lofi-blue-deep)] shadow-[var(--lofi-shadow)] transition hover:-translate-y-0.5"
          >
            <Paperclip size={16} /> Upload JPEG, PNG, or PDF
          </button>
          <span className="text-xs text-[var(--lofi-muted)]">
            Paste images/text or upload JPEG, PNG, PDF · up to 6 files
          </span>

          <div className="flex items-center gap-3">
            {(hasVersions || scenario.trim() !== "" || attachments.length > 0 || loanType !== "") && (
              <button
                type="button"
                onClick={clearSlate}
                className="flex items-center gap-2 rounded-xl border border-[var(--lofi-blue-deep)]/30 bg-[var(--lofi-card)] px-5 py-3.5 text-sm font-semibold text-[var(--lofi-blue-deep)] backdrop-blur-md transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lofi-blue)] focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
              >
                <Sparkles size={16} /> Clear Slate
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
          <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[var(--lofi-blue)] text-[var(--lofi-blue-deep)]">
            <Check size={10} />
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
          <p className="flex items-center justify-center gap-2 text-lg font-bold text-[var(--lofi-blue-deep)]">
            The record skipped a beat <Headphones size={18} />
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
                    onOpenChat={openCardChat}
                    activeId={activeCard?.id ?? null}
                  />
                )}
              <ResultCard id="guideline-requirements" title="Guideline Requirements" icon={ClipboardList} text={current.report.guidelineRequirements} accent="lavender" onOpenChat={openCardChat} activeId={activeCard?.id ?? null} />
              <ResultCard id="roadblocks" title="Potential Roadblocks" icon={Construction} text={current.report.roadblocks} accent="peach" onOpenChat={openCardChat} activeId={activeCard?.id ?? null} />
              <ResultCard id="ltv" title="LTV / Eligibility" icon={BarChart3} text={current.report.ltv} accent="blue" onOpenChat={openCardChat} activeId={activeCard?.id ?? null} />
              <AlternativesCard alternatives={current.report.alternatives} onOpenChat={openCardChat} activeId={activeCard?.id ?? null} />
              <DocumentationCard documentation={current.report.documentation} onOpenChat={openCardChat} activeId={activeCard?.id ?? null} />
              <ResultCard id="citations" title="Handbook Citations & Sources" icon={BookOpen} text={current.report.citations} accent="sage" onOpenChat={openCardChat} activeId={activeCard?.id ?? null} />
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
                    className="hidden text-[var(--lofi-muted)] hover:text-[var(--lofi-blue-deep)] lg:block"
                  >
                    <X size={14} />
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

          {activeCard && (
            <CardChatPopover
              active={activeCard}
              context={reportContext}
              history={chatHistories[activeCard.id] ?? []}
              insight={chatInsights[activeCard.id] ?? null}
              onHistoryChange={(id, next) =>
                setChatHistories((prev) => ({ ...prev, [id]: next }))
              }
              onInsight={(id, text) =>
                setChatInsights((prev) => ({ ...prev, [id]: text }))
              }
              onClose={() => setActiveCard(null)}
            />
          )}
        </div>

      ) : (
        !mutation.isError && (
          <div className="mx-auto max-w-2xl py-16 text-center">
            <img
              src={coffeeAccent.url}
              alt="Cozy 90s anime coffee mug"
              width={138}
              height={138}
              loading="lazy"
              className="mx-auto h-[138px] w-[138px] object-contain drop-shadow-[0_10px_24px_oklch(0.4_0.08_56_/_0.3)]"
            />
            <p className="mt-3 text-lg font-bold text-[var(--lofi-blue-deep)]">
              &nbsp;Drop a scenario to analyze…
            </p>
          </div>
        )
      )}


      <footer className="mt-14 flex items-center justify-center gap-1.5 text-center text-xs text-[var(--lofi-muted)]">
        AI-generated guidance — always verify against your investor overlays · stay cozy
        <Sparkles size={12} />
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
        className={`fixed inset-0 z-40 bg-[oklch(0.28_0.05_60_/_0.45)] backdrop-blur-sm transition-opacity duration-300 ${
          open ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      {/* Left drawer */}
      <aside
        role="dialog"
        aria-label="Previous scenarios"
        className={`fixed inset-y-0 left-0 z-50 flex w-full flex-col border-r border-[var(--lofi-glow-border)] bg-[var(--lofi-card)] shadow-[var(--lofi-shadow)] backdrop-blur-2xl transition-transform duration-300 ease-out sm:w-[400px] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--lofi-cream-deep)] px-5 py-4">
          <h3 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-[var(--lofi-blue-deep)]">
            <Clock size={16} /> Previous Scenarios
            <span className="rounded-full bg-[var(--lofi-blue)] px-2 py-0.5 text-[10px] text-[var(--lofi-blue-deep)]">
              {items.length}
            </span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] text-[var(--lofi-blue-deep)] shadow-[var(--lofi-shadow)] transition hover:-translate-y-0.5"
          >
            <ArrowRight size={16} />
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
                    <Sparkles size={13} /> Similar Team Scenarios
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
          <Diamond size={10} aria-hidden />
          {group}
        </span>
      )}
    </button>
  );
}



const CARD_INTERACTIVE =
  "cursor-pointer transition hover:-translate-y-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--lofi-blue)]";

function activeRing(isActive: boolean) {
  return isActive
    ? "ring-2 ring-[var(--lofi-blue)] shadow-[0_0_0_5px_oklch(0.7_0.1_230_/_0.18)]"
    : "";
}

function cardClickProps(
  payload: { id: string; label: string; value: string },
  onOpenChat: (p: ActiveCard) => void,
) {
  return {
    role: "button" as const,
    tabIndex: 0,
    "aria-label": `Ask the assistant about ${payload.label}`,
    onClick: (e: React.MouseEvent<HTMLElement>) =>
      onOpenChat({ ...payload, anchorEl: e.currentTarget }),
    onKeyDown: (e: React.KeyboardEvent<HTMLElement>) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onOpenChat({ ...payload, anchorEl: e.currentTarget });
      }
    },
  };
}

function RecommendationCard({
  program,
  recommendation,
  onOpenChat,
  activeId,
}: {
  program: string;
  recommendation: string;
  onOpenChat: (p: ActiveCard) => void;
  activeId: string | null;
}) {
  const id = "recommendation";
  return (
    <article
      {...cardClickProps(
        { id, label: "Top Recommendation", value: `${program ? `Program: ${program}\n` : ""}${recommendation}` },
        onOpenChat,
      )}
      className={`flex flex-col rounded-xl border-2 p-7 shadow-[var(--lofi-shadow)] ${CARD_INTERACTIVE} ${activeRing(activeId === id)}`}
      style={{
        borderColor: "var(--lofi-blue)",
        background:
          "linear-gradient(150deg, var(--lofi-card) 0%, var(--lofi-blue) 220%)",
      }}
    >

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-[var(--lofi-blue-deep)]"
          style={{ backgroundColor: "var(--lofi-blue)" }}
        >
          <Compass size={14} /> Program Finder — Top Recommendation
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
  id,
  title,
  icon: Icon,
  text,
  accent,
  onOpenChat,
  activeId,
}: {
  id: string;
  title: string;
  icon: LucideIcon;
  text: string;
  accent: "lavender" | "peach" | "sage" | "blue";
  onOpenChat: (p: ActiveCard) => void;
  activeId: string | null;
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
    <article
      {...cardClickProps({ id, label: title, value: text }, onOpenChat)}
      className={`flex flex-col rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] p-7 shadow-[var(--lofi-shadow)] ${CARD_INTERACTIVE} ${activeRing(activeId === id)}`}
    >

      <div className="mb-3 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-[var(--lofi-blue-deep)]"
          style={{ backgroundColor: accentVar }}
        >
          <Icon size={14} /> {title}
        </span>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed text-[var(--lofi-ink)]">
        {text}
      </p>
    </article>
  );
}

function DocumentationCard({
  documentation,
  onOpenChat,
  activeId,
}: {
  documentation: Documentation;
  onOpenChat: (p: ActiveCard) => void;
  activeId: string | null;
}) {
  const buckets: { title: string; icon: LucideIcon; text: string }[] = [
    { title: "Borrower Tasks", icon: Hand, text: documentation.borrowerTasks },
    { title: "Borrower & LO Collaboration", icon: Handshake, text: documentation.collaboration },
    { title: "LO / Internal Broker Actions", icon: Briefcase, text: documentation.loActions },
  ];
  const id = "documentation";
  const value = buckets.map((b) => `${b.title}:\n${b.text}`).join("\n\n");

  return (
    <article
      {...cardClickProps({ id, label: "Documentation to Request", value }, onOpenChat)}
      className={`flex flex-col rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] p-7 shadow-[var(--lofi-shadow)] ${CARD_INTERACTIVE} ${activeRing(activeId === id)}`}
    >

      <div className="mb-4 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-[var(--lofi-blue-deep)]"
          style={{ backgroundColor: "var(--lofi-sage)" }}
        >
          <FolderOpen size={14} /> Documentation to Request
        </span>
      </div>
      <div className="flex flex-col gap-5">
        {buckets.map((b) => (
          <div key={b.title}>
            <p className="mb-1.5 flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[var(--lofi-blue-deep)]">
              <b.icon size={13} /> {b.title}
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
      return { bg: "var(--lofi-sage)", label: "Eligible", icon: CheckCircle2 };
    case "Likely Eligible":
      return { bg: "var(--lofi-blue)", label: "Likely Eligible", icon: Circle };
    case "High Risk":
      return { bg: "var(--lofi-peach)", label: "High Risk", icon: AlertTriangle };
    default:
      return { bg: "var(--lofi-cream-deep)", label: "Ineligible", icon: Ban };
  }
}

function AlternativesCard({
  alternatives,
  onOpenChat,
  activeId,
}: {
  alternatives: AlternativeProgram[];
  onOpenChat: (p: ActiveCard) => void;
  activeId: string | null;
}) {
  const id = "alternatives";
  const value =
    alternatives.length === 0
      ? "No alternative programs evaluated yet."
      : alternatives
          .map(
            (a) =>
              `${a.program} — ${a.status}\nLTV/CLTV: ${a.ltvCap}\nBenefit: ${a.benefit}\nRisk: ${a.vulnerability}`,
          )
          .join("\n\n");
  return (
    <article
      {...cardClickProps({ id, label: "Alternative Loan Programs", value }, onOpenChat)}
      className={`flex flex-col rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-card)] p-7 shadow-[var(--lofi-shadow)] ${CARD_INTERACTIVE} ${activeRing(activeId === id)}`}
    >

      <div className="mb-4 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-[var(--lofi-blue-deep)]"
          style={{ backgroundColor: "var(--lofi-lavender)" }}
        >
          <Shuffle size={14} /> Alternative Loan Programs
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
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold text-[var(--lofi-blue-deep)]"
                    style={{ backgroundColor: s.bg }}
                  >
                    <s.icon size={12} /> {s.label}
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
