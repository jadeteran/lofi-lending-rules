import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Send, X, Sparkles, MessageCircle } from "lucide-react";

import { askReportQuestion, type ReportChatMessage } from "@/lib/guidelines.functions";

export type ActiveCard = {
  id: string;
  label: string;
  value: string;
  anchorEl: HTMLElement | null;
};

export type ReportContext = {
  loanType: string;
  scenario: string;
  versionLabel: string;
  report: Record<string, unknown>;
};

const GENERIC_SUGGESTIONS = [
  "Summarize this in one line",
  "What's the biggest risk here?",
  "What should the LO do next?",
  "Is this likely to get denied?",
];

function suggestionsFor(label: string): string[] {
  const l = label.toLowerCase();
  if (l.includes("roadblock"))
    return [
      "What's the single biggest blocker?",
      "How do we clear these?",
      "Which roadblock is a hard denial?",
      "What docs resolve these?",
    ];
  if (l.includes("ltv") || l.includes("eligibility"))
    return [
      "What's the max LTV here?",
      "Is this scenario eligible?",
      "What lowers the LTV cap?",
      "How close are we to the limit?",
    ];
  if (l.includes("alternative"))
    return [
      "Which alternative is strongest?",
      "Why is one ineligible?",
      "Best fallback program?",
      "Compare the top two",
    ];
  if (l.includes("documentation"))
    return [
      "What's the priority doc to request?",
      "What can the borrower start now?",
      "Anything the LO must do first?",
      "Which docs unblock approval?",
    ];
  if (l.includes("guideline"))
    return [
      "What's the key requirement?",
      "Any overlay to watch?",
      "Summarize in plain terms",
      "What trips most files up?",
    ];
  if (l.includes("recommendation") || l.includes("program"))
    return [
      "Why this program?",
      "What's the runner-up?",
      "Biggest weakness of this pick?",
      "Summarize the rationale",
    ];
  return GENERIC_SUGGESTIONS;
}

type Pos = { top: number; left: number; placement: "top" | "bottom" };

const PW = 348;
const GAP = 10;
const MARGIN = 12;

function computePos(el: HTMLElement): Pos {
  const r = el.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const spaceBelow = vh - r.bottom;
  const placement: "top" | "bottom" = spaceBelow < 360 && r.top > 360 ? "top" : "bottom";

  let left = r.left;
  if (left + PW + MARGIN > vw) left = vw - PW - MARGIN;
  if (left < MARGIN) left = MARGIN;

  const top = placement === "bottom" ? r.bottom + GAP : Math.max(MARGIN, r.top - GAP);
  return { top, left, placement };
}

export function CardChatPopover({
  active,
  context,
  history,
  insight,
  onHistoryChange,
  onInsight,
  onClose,
}: {
  active: ActiveCard;
  context: ReportContext;
  history: ReportChatMessage[];
  insight: string | null;
  onHistoryChange: (id: string, next: ReportChatMessage[]) => void;
  onInsight: (id: string, text: string) => void;
  onClose: () => void;
}) {
  const ask = useServerFn(askReportQuestion);
  const popRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [insightLoading, setInsightLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Position + keep anchored on scroll/resize.
  useLayoutEffect(() => {
    if (!active.anchorEl) return;
    const update = () => setPos(computePos(active.anchorEl as HTMLElement));
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [active.anchorEl, active.id]);

  // Dismiss: outside click + Escape.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (popRef.current?.contains(e.target as Node)) return;
      if (active.anchorEl?.contains(e.target as Node)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [active.anchorEl, onClose]);

  // Auto-load insight summary once per card.
  useEffect(() => {
    if (insight !== null) return;
    let cancelled = false;
    setInsightLoading(true);
    ask({
      data: {
        cardLabel: active.label,
        cardValue: active.value,
        loanType: context.loanType,
        scenario: context.scenario,
        versionLabel: context.versionLabel,
        report: context.report,
        mode: "insight",
        messages: [],
      },
    })
      .then((res) => {
        if (!cancelled) onInsight(active.id, res.text);
      })
      .catch((e) => {
        if (!cancelled) onInsight(active.id, e instanceof Error ? e.message : "Couldn't load insight.");
      })
      .finally(() => {
        if (!cancelled) setInsightLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active.id]);

  // Focus input on open.
  useEffect(() => {
    const t = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(t);
  }, [active.id]);

  // Scroll history to bottom on new message.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [history, busy]);

  const send = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || busy) return;
      setError(null);
      const nextHistory: ReportChatMessage[] = [...history, { role: "user", content: q }];
      onHistoryChange(active.id, nextHistory);
      setInput("");
      setBusy(true);
      try {
        const res = await ask({
          data: {
            cardLabel: active.label,
            cardValue: active.value,
            loanType: context.loanType,
            scenario: context.scenario,
            versionLabel: context.versionLabel,
            report: context.report,
            mode: "chat",
            messages: nextHistory.slice(-12),
          },
        });
        onHistoryChange(active.id, [...nextHistory, { role: "assistant", content: res.text }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
        onHistoryChange(active.id, nextHistory);
      } finally {
        setBusy(false);
      }
    },
    [active, busy, context, history, ask, onHistoryChange],
  );

  if (!pos) return null;

  const suggestions = suggestionsFor(active.label);

  return (
    <div
      ref={popRef}
      role="dialog"
      aria-label={`Ask the assistant about ${active.label}`}
      className="fixed z-[60] flex max-h-[78vh] flex-col overflow-hidden rounded-2xl border border-[var(--lofi-blue)] bg-[var(--lofi-card)] shadow-[0_18px_50px_oklch(0.4_0.08_56_/_0.28)] backdrop-blur-xl"
      style={{
        top: pos.top,
        left: pos.left,
        width: PW,
        transform: pos.placement === "top" ? "translateY(-100%)" : undefined,
        fontFamily: "'Space Grotesk', ui-sans-serif, system-ui, sans-serif",
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 border-b border-[var(--lofi-cream-deep)] px-4 py-3">
        <span className="flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-[var(--lofi-blue-deep)]">
          <MessageCircle size={14} /> {active.label}
        </span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close assistant"
          className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--lofi-muted)] transition hover:bg-[var(--lofi-cream-deep)] hover:text-[var(--lofi-blue-deep)]"
        >
          <X size={15} />
        </button>
      </div>

      {/* Scrollable body */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3">
        {/* Insight summary */}
        <div className="mb-3 rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-bg-1)] p-3">
          <p className="mb-1 flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[var(--lofi-blue-deep)]">
            <Sparkles size={11} /> Quick insight
          </p>
          {insightLoading || insight === null ? (
            <div className="flex flex-col gap-1.5">
              <span className="h-2.5 w-full animate-pulse rounded bg-[var(--lofi-cream-deep)]" />
              <span className="h-2.5 w-2/3 animate-pulse rounded bg-[var(--lofi-cream-deep)]" />
            </div>
          ) : (
            <p className="text-xs leading-relaxed text-[var(--lofi-ink)]">{insight}</p>
          )}
        </div>

        {/* Message history */}
        <div className="flex flex-col gap-2.5">
          {history.map((m, i) => (
            <div
              key={i}
              className={m.role === "user" ? "flex justify-end" : "flex justify-start"}
            >
              {m.role === "user" ? (
                <span className="max-w-[85%] whitespace-pre-line rounded-2xl rounded-br-sm bg-[var(--lofi-blue-deep)] px-3 py-2 text-xs font-semibold leading-relaxed text-[var(--lofi-cream)]">
                  {m.content}
                </span>
              ) : (
                <span className="max-w-[92%] whitespace-pre-line text-xs leading-relaxed text-[var(--lofi-ink)]">
                  {m.content}
                </span>
              )}
            </div>
          ))}
          {busy && (
            <div className="flex justify-start">
              <span className="flex items-center gap-1 rounded-full bg-[var(--lofi-bg-1)] px-3 py-1.5">
                <Dot /> <Dot delay={0.15} /> <Dot delay={0.3} />
              </span>
            </div>
          )}
        </div>

        {error && (
          <p className="mt-2 rounded-lg bg-[var(--lofi-peach)]/40 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--lofi-blue-deep)]">
            {error}
          </p>
        )}
      </div>

      {/* Suggested questions */}
      <div className="flex flex-wrap gap-1.5 border-t border-[var(--lofi-cream-deep)] px-3 pt-2.5">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            disabled={busy}
            onClick={() => void send(s)}
            className="rounded-full border border-[var(--lofi-cream-deep)] bg-[var(--lofi-bg-1)] px-2.5 py-1 text-[11px] font-semibold text-[var(--lofi-blue-deep)] transition hover:-translate-y-0.5 hover:border-[var(--lofi-blue)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        className="flex items-end gap-2 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          void send(input);
        }}
      >
        <textarea
          ref={inputRef}
          rows={1}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send(input);
            }
          }}
          placeholder="Ask a follow-up…"
          className="max-h-24 min-h-[38px] flex-1 resize-none rounded-xl border border-[var(--lofi-cream-deep)] bg-[var(--lofi-bg-1)] px-3 py-2 text-xs font-semibold text-[var(--lofi-ink)] outline-none transition focus:border-[var(--lofi-blue)] placeholder:font-normal placeholder:text-[var(--lofi-muted)]"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          aria-label="Send"
          className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl bg-[var(--lofi-blue-deep)] text-[var(--lofi-cream)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={15} />
        </button>
      </form>
    </div>
  );
}

function Dot({ delay = 0 }: { delay?: number }) {
  return (
    <span
      className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--lofi-blue-deep)]"
      style={{ animationDelay: `${delay}s` }}
    />
  );
}
