import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";


export const PROGRAM_FINDER = "Unsure / Program Finder" as const;

export const LOAN_TYPES = [
  "Conventional - Fannie Mae",
  "Conventional - Freddie Mac",
  "Government - FHA",
  "Government - VA",
  "HELOC / 2nd Liens",
  "Jumbo - Non-Conforming",
  "Non-QM / DSCR",
  "Private Money / Hard Money",
  PROGRAM_FINDER,
] as const;

export type Documentation = {
  borrowerTasks: string;
  collaboration: string;
  loActions: string;
};

export type AlternativeStatus = "Eligible" | "Likely Eligible" | "High Risk" | "Ineligible";

export type AlternativeProgram = {
  program: string;
  status: AlternativeStatus;
  ltvCap: string;
  benefit: string;
  vulnerability: string;
};

export type FileProfile = {
  summaryTitle: string;
  creditScore: string;
  dti: string;
  ltv: string;
  propertyState: string;
  profileGroup: string;
};

export type Analysis = {
  guidelineRequirements: string;
  roadblocks: string;
  ltv: string;
  alternatives: AlternativeProgram[];
  documentation: Documentation;
  citations: string;
  recommendedProgram: string;
  recommendation: string;
  fileProfile: FileProfile;
};

const AttachmentSchema = z.object({
  name: z.string().default("attachment"),
  mediaType: z.string().min(1),
  dataUrl: z.string().min(1),
});

const DocumentationSchema = z.object({
  borrowerTasks: z.string().default(""),
  collaboration: z.string().default(""),
  loActions: z.string().default(""),
});

const AlternativeProgramSchema = z.object({
  program: z.string().default(""),
  status: z.string().default(""),
  ltvCap: z.string().default(""),
  benefit: z.string().default(""),
  vulnerability: z.string().default(""),
});

const FileProfileSchema = z.object({
  summaryTitle: z.string().default(""),
  creditScore: z.string().default(""),
  dti: z.string().default(""),
  ltv: z.string().default(""),
  propertyState: z.string().default(""),
  profileGroup: z.string().default(""),
});

const PreviousReportSchema = z.object({
  guidelineRequirements: z.string().default(""),
  roadblocks: z.string().default(""),
  ltv: z.string().default(""),
  alternatives: z.array(AlternativeProgramSchema).default([]),
  documentation: DocumentationSchema.default({
    borrowerTasks: "",
    collaboration: "",
    loActions: "",
  }),
  citations: z.string().default(""),
  recommendedProgram: z.string().default(""),
  recommendation: z.string().default(""),
  fileProfile: FileProfileSchema.optional(),
});

const InputSchema = z
  .object({
    loanType: z.string().min(1),
    scenario: z.string().default(""),
    attachments: z.array(AttachmentSchema).max(6).default([]),
    mode: z.enum(["initial", "override"]).default("initial"),
    previousReport: PreviousReportSchema.optional(),
  })
  .refine((d) => d.scenario.trim() !== "" || d.attachments.length > 0, {
    message: "Add a scenario or attach a file.",
  });

export const analyzeScenario = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<Analysis> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured. Missing LOVABLE_API_KEY.");

    const gateway = createLovableAiGatewayProvider(key);

    const isOverride = data.mode === "override" && !!data.previousReport;
    const isProgramFinder = data.loanType === PROGRAM_FINDER;

    // ---- Hybrid grounding: curated locked rules (#3) + handbook RAG (#1) ----
    const groundingQuery = `${data.loanType}\n\n${data.scenario.trim()}`.trim();
    const { buildGroundingContext } = await import("@/lib/guidelines.server");
    const grounding = await buildGroundingContext(groundingQuery, key);

    const lockedRulesBlock = grounding.lockedRules.length
      ? grounding.lockedRules
          .map((r, i) => `[Rule ${i + 1}] ${JSON.stringify(r)}`)
          .join("\n")
      : "(none returned)";

    const passagesBlock = grounding.passages.length
      ? grounding.passages
          .map(
            (p, i) =>
              `[Passage ${i + 1}] (similarity ${p.similarity.toFixed(3)}) CITATION: ${p.citation}\n${p.content}`,
          )
          .join("\n\n")
      : "(none returned)";

    const groundingNotes = grounding.notes.length ? grounding.notes.join(" ") : "";

    const system = `You are a senior mortgage underwriting and re-evaluation engine. You must respond with raw JSON matching the exact requested keys: guidelineRequirements, roadblocks, ltv, alternatives, documentation, citations, recommendedProgram, recommendation, and fileProfile. Do not wrap the response in markdown code blocks like \`\`\`json.

${
      isProgramFinder
        ? `PROGRAM FINDER MODE: The loan officer is UNSURE which program fits and wants you to find it. Do NOT assume a program. Using ONLY the grounding sources below, evaluate the raw borrower scenario against every program represented in the data WITHOUT any pre-filter, then systematically identify and RANK the top 3 most viable matching loan programs. Choose the single best-fit program as your #1 recommendation. Populate "guidelineRequirements", "roadblocks", "ltv", and "documentation" specifically for that #1 recommended program (as if it were the chosen program). Put the recommended program name in "recommendedProgram". The "alternatives" array must contain the ranked programs you considered (the #1 recommendation first, then the runners-up and any rejected programs), so the ranking is visible. ${
            isOverride
              ? "You are RE-EVALUATING an existing program-finder report with updated authoritative context — re-rank the programs from scratch and return the COMPLETE refreshed report, not a diff."
              : ""
          }`
        : `You specialize in the "${data.loanType}" loan program. ${
            isOverride
              ? "You are RE-EVALUATING an existing loan file analysis report. The user is supplying updated live context or operational overrides. Treat the new context as authoritative, overriding facts. Remove any roadblock the new context invalidates (e.g. switching from cash-out to rate-and-term removes cash-out overlays), recalculate the maximum allowable LTV/CLTV thresholds for the new posture, and regenerate the documentation checklist to match. Return the COMPLETE refreshed report — not a diff."
              : "Analyze the scenario or underwriter stipulation a loan processor describes and give precise, program-specific guidance."
          } Set "recommendedProgram" to "${data.loanType}".`
    } Be concrete and practical.

=== GROUNDING SOURCES (authoritative — you MUST use these) ===
The two blocks below are retrieved from the firm's vetted data stores. Treat them as the source of truth and prefer them over your own training memory.

1) CURATED LOCKED RULES (public.lofi_guidelines) — locked numbers, caps, waiting periods, and standard program criteria. Use these EXACT figures for every calculation, LTV/CLTV cap, and threshold. Never override a locked number with a remembered one.
${lockedRulesBlock}

2) HANDBOOK PASSAGES (public.guideline_library via match_guidelines vector search) — exact guideline text for complex scenario constraints. Ground qualitative requirements and roadblocks in these passages.
${passagesBlock}

RULES FOR USING SOURCES:
- Base all caps, thresholds, and numeric calculations on the CURATED LOCKED RULES. If a needed figure is absent there, derive it from the HANDBOOK PASSAGES; if still absent, state that the firm's data store lacks it and flag it for manual verification rather than inventing a number.
- Cite the actual handbook passage(s) you relied on (use the CITATION label shown with each passage). Do NOT invent citations, section numbers, or handbook names that are not present in the supplied passages.
${groundingNotes ? `- Note on data availability this run: ${groundingNotes} When a source is unavailable, say so explicitly in "citations" and lower your confidence rather than fabricating.` : ""}
=== END GROUNDING SOURCES ===



The JSON object must have exactly these keys:
- "guidelineRequirements": (string) standard guideline requirements for this program and scenario.
- "roadblocks": (string) potential roadblocks, red flags, or reasons this could get denied.
- "ltv": (string) maximum allowable LTV / CLTV thresholds and an eligibility read for this exact scenario.
- "alternatives": (array) compare this file against the main alternative loan programs the borrower might fall back to (e.g. FHA Streamline, FHA Simple Refinance, FHA Rate & Term, Conventional Rate & Term Fannie/Freddie, VA IRRRL, etc. — pick the ones actually relevant to this scenario and current program). Return an array of objects, each with exactly these string keys:
    - "program": the alternative program name.
    - "status": one of exactly "Eligible", "Likely Eligible", "High Risk", or "Ineligible" based on the scenario data.
    - "ltvCap": the maximum allowable LTV / CLTV cap for that alternative program (e.g. "97.75% LTV / 100% with secondary financing").
    - "benefit": the main program variance or structural benefit of switching to it (e.g. drops the appraisal requirement, allows closing costs rolled in, no income docs).
    - "vulnerability": the Vulnerability Risk Factor. For any program marked "Ineligible" or "High Risk", explicitly explain why the loan is vulnerable under those guidelines (e.g. specific 30-day mortgage lates disqualifying a standard FHA/Conventional refi, tight DTI overlays, appraisal shortfalls capping LTV). For Eligible programs, set this to "- No material risk flagged.".
  Return 3–5 relevant programs. Base every status and cap strictly on the scenario data; never fabricate facts.
- "documentation": (object) the documents to request, split into operational buckets for the Loan Officer. It must be an object with exactly these three string keys:
    - "borrowerTasks": items ONLY the borrower must produce or provide (e.g. their own bank statements, paystubs, letters of explanation).
    - "collaboration": items the borrower must help obtain or sign together with the LO (e.g. signing the final URLA/HUD forms, subordination agreements, updated HOI declarations needing the borrower's insurer).
    - "loActions": pure LO / internal broker actions handled internally (e.g. revised worksheets, rate lock confirmation, internal recalculations).
- "citations": (string) the actual handbook citations and locked-rule references you relied on, as "- " bullet lines. Each bullet should pair a specific claim/number with its source, e.g. "- Max base loan amount $177,570 — per lofi_guidelines FHA Streamline rule" or "- 210-day seasoning requirement — FHA Handbook 4000.1 II.A.8.d (retrieved passage)". Use ONLY the CITATION labels supplied in the GROUNDING SOURCES; if a source was unavailable this run, say so here. Never fabricate section numbers.
- "recommendedProgram": (string) the single best-fit program name. ${isProgramFinder ? 'In Program Finder mode this is your #1 ranked program.' : `Set this to "${data.loanType}".`}
- "recommendation": (string) ${isProgramFinder ? 'a summary, as "- " bullet lines, explaining WHY the #1 recommended program wins over the rejected/runner-up alternatives — reference the specific scenario facts and locked rules that make it the best fit and that disqualify or weaken the others (e.g. "- FHA Streamline wins: no appraisal needed and borrower has 0x30 mortgage history, while Conventional R&T is capped by the 95% LTV on the current value").' : 'a brief "- " bullet summary of why this chosen program fits the scenario. If not applicable, set to "- N/A — program was specified by the loan officer.".'}
- "fileProfile": (object) a structured catalog header extracted from the scenario for clustering and scannability. It must be an object with exactly these six string keys:
    - "summaryTitle": a crisp, bold headline string tracking the file profile, formatted as "<Program> <Purpose> — <FICO> FICO | <DTI>% DTI | <ST>" (e.g. "FHA Purchase — 620 FICO | 56% DTI | TX"). Use the recommended program and the actual scenario figures; omit a token only if genuinely unknown.
    - "creditScore": the representative/qualifying FICO credit score as a plain number string (e.g. "620"). If a range, use the qualifying (middle/lower) score. Use "—" if absent.
    - "dti": the debt-to-income ratio as a percentage string (e.g. "56%"). Use the back-end DTI when available. Use "—" if absent.
    - "ltv": the loan-to-value (or CLTV) ratio for THIS file as a percentage string (e.g. "96.5%"). Use "—" if absent.
    - "propertyState": the 2-letter US state abbreviation for the subject property (e.g. "TX"). Use "—" if absent.
    - "profileGroup": a logical classification tier clustering this file by manufacturing similarity and eligibility. Evaluate the file conditions (program, purpose, FICO bands, DTI, LTV, state, underwriting path) and assign a concise descriptive tier label, e.g. "Texas High-DTI Cash-Out" or "FHA Sub-620 Manual Underwrite". Be consistent so similar files cluster under the same group.

The string values (guidelineRequirements, roadblocks, ltv, citations, recommendation) and each of the three documentation bucket values must be a single string using "- " bullet lines separated by newlines. If a documentation bucket has no items, set it to "- None for this scenario.". Output nothing outside the JSON object.

CRITICAL — documentation specificity (do NOT use generic document templates). Mine the scenario, loan application data, and any attached files for concrete details and inject them into every documentation bullet:
1. Assets & Income: Never write a bare "bank statements" or "paystubs". Always attach the exact timeline constraint, e.g. "Most recent 30 consecutive days of paystubs" or "Last 2 full months of bank statements, all pages included". Tie cash-to-close, reserves, or seasoning amounts to the specific dollar figures when present.
2. Letters of Explanation (LOX): When an LOX is needed for credit inquiries or asset seasoning, explicitly name the specific creditor, inquiry date, deposit amount, or asset source from the file, e.g. "Provide signed LOX for the 05/14/2026 credit inquiry from Chase Bank".
3. Third-Party Items (HOI / Title / Payoffs): Name the actual entities from the application data — insurer/agent name, lender/mortgagee, full property address, loan/HELOC item numbers, and any active deadlines, e.g. "Contact State Farm agent to update Mortgagee Clause to Ameritrust Mortgage Corporation for 15459 Heather Ridge Trail".
Only state a detail if it appears in the provided context; never fabricate names, dates, or amounts. If a needed specific is genuinely absent, request it explicitly (e.g. "Confirm the exact credit inquiry date and creditor for the required LOX").`;

    try {
      const textPart = `Loan Program: ${data.loanType}\n\n${
        isOverride
          ? `PREVIOUS REPORT (to re-evaluate):\n${JSON.stringify(data.previousReport, null, 2)}\n\nUPDATED CONTEXT / OPERATIONAL OVERRIDE (authoritative):\n${
              data.scenario.trim() ||
              "(See attached file(s) — extract the override details from them.)"
            }`
          : `Scenario / Stipulation:\n${
              data.scenario.trim() ||
              "(See attached file(s) — extract the relevant stipulation or scenario details from them.)"
            }`
      }`;

      const content: Array<
        | { type: "text"; text: string }
        | { type: "image"; image: string }
        | { type: "file"; data: string; mediaType: string }
      > = [{ type: "text", text: textPart }];
      for (const att of data.attachments) {
        if (att.mediaType.startsWith("image/")) {
          content.push({ type: "image", image: att.dataUrl });
        } else {
          content.push({ type: "file", data: att.dataUrl, mediaType: att.mediaType });
        }
      }

      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        messages: [{ role: "user", content }],
      });

      const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      const jsonStr = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;

      const parsed = JSON.parse(jsonStr) as Partial<Analysis>;
      const doc = parsed.documentation;
      const fp = parsed.fileProfile as Partial<FileProfile> | undefined;
      const recommended =
        parsed.recommendedProgram?.trim() || (isProgramFinder ? "" : data.loanType);
      const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "");
      return {
        guidelineRequirements: parsed.guidelineRequirements ?? "No requirements returned.",
        roadblocks: parsed.roadblocks ?? "No roadblocks returned.",
        ltv: parsed.ltv ?? "No LTV thresholds returned.",
        alternatives: Array.isArray(parsed.alternatives)
          ? parsed.alternatives.map((a) => {
              const allowed: AlternativeStatus[] = ["Eligible", "Likely Eligible", "High Risk", "Ineligible"];
              const status = allowed.includes(a?.status as AlternativeStatus)
                ? (a!.status as AlternativeStatus)
                : "High Risk";
              return {
                program: a?.program?.trim() || "Unnamed program",
                status,
                ltvCap: a?.ltvCap?.trim() || "—",
                benefit: a?.benefit?.trim() || "—",
                vulnerability: a?.vulnerability?.trim() || "- No material risk flagged.",
              };
            })
          : [],
        documentation: {
          borrowerTasks: doc?.borrowerTasks?.trim() || "- None for this scenario.",
          collaboration: doc?.collaboration?.trim() || "- None for this scenario.",
          loActions: doc?.loActions?.trim() || "- None for this scenario.",
        },
        citations:
          parsed.citations?.trim() ||
          (groundingNotes
            ? `- Grounding sources limited this run: ${groundingNotes}`
            : "- No handbook citations returned for this scenario."),
        recommendedProgram: recommended,
        recommendation:
          parsed.recommendation?.trim() ||
          (isProgramFinder
            ? "- No program recommendation could be derived from the available data."
            : "- N/A — program was specified by the loan officer."),
        fileProfile: {
          summaryTitle:
            clean(fp?.summaryTitle) ||
            [recommended || data.loanType, clean(fp?.creditScore) && `${clean(fp?.creditScore)} FICO`, clean(fp?.dti) && `${clean(fp?.dti)} DTI`, clean(fp?.propertyState)]
              .filter(Boolean)
              .join(" · ") ||
            "Saved scenario",
          creditScore: clean(fp?.creditScore) || "—",
          dti: clean(fp?.dti) || "—",
          ltv: clean(fp?.ltv) || "—",
          propertyState: clean(fp?.propertyState) || "—",
          profileGroup: clean(fp?.profileGroup) || "Unclassified",
        },
      };
    } catch (err) {
      const e = err as { statusCode?: number; message?: string };
      if (e?.statusCode === 429) {
        throw new Error("The studio is busy — too many requests. Take a sip and try again shortly.");
      }
      if (e?.statusCode === 402) {
        throw new Error("AI credits are exhausted. Add credits in Settings → Workspace → Usage.");
      }
      throw new Error(e?.message || "Failed to analyze the scenario.");
    }
  });

// ---------------------------------------------------------------------------
// Handbook guideline upload (Admin Config). Admin-only: verifies the caller's
// access token before ingesting files into the guideline library.
// ---------------------------------------------------------------------------

const UploadFileSchema = z.object({
  name: z.string().min(1),
  mediaType: z.string().default("application/octet-stream"),
  dataUrl: z.string().min(1),
});

const UploadInputSchema = z.object({
  accessToken: z.string().min(1),
  files: z.array(UploadFileSchema).min(1).max(10),
});

export type UploadGuidelinesResult = {
  results: { fileName: string; chunks: number; supersededRows: number }[];
  totalChunks: number;
  totalSuperseded: number;
};

export const uploadGuidelines = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => UploadInputSchema.parse(data))
  .handler(async ({ data }): Promise<UploadGuidelinesResult> => {
    const { verifyAdminCaller } = await import("@/lib/auth.server");
    await verifyAdminCaller(data.accessToken);

    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured. Missing LOVABLE_API_KEY.");

    const { ingestHandbookFile } = await import("@/lib/guidelines.server");

    const results: { fileName: string; chunks: number; supersededRows: number }[] = [];
    for (const file of data.files) {
      const r = await ingestHandbookFile(file, key);
      results.push(r);
    }
    const totalChunks = results.reduce((sum, r) => sum + r.chunks, 0);
    const totalSuperseded = results.reduce((sum, r) => sum + r.supersededRows, 0);
    return { results, totalChunks, totalSuperseded };
  });

// ---------------------------------------------------------------------------
// Report card assistant: localized Q&A scoped to a specific report card, with
// full live report context (loan type, scenario, selected version, report).
// Stateless — message history is supplied by the client each call.
// ---------------------------------------------------------------------------

const ChatMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1),
});

const AskInputSchema = z.object({
  cardLabel: z.string().min(1),
  cardValue: z.string().default(""),
  loanType: z.string().default(""),
  scenario: z.string().default(""),
  versionLabel: z.string().default(""),
  report: z.record(z.string(), z.unknown()).default({}),
  mode: z.enum(["insight", "chat"]).default("chat"),
  messages: z.array(ChatMessageSchema).max(12).default([]),
  // When true (condition cards), the assistant also watches for the user
  // re-assigning the responsible department and persists that for the future.
  captureResponsibility: z.boolean().default(false),
});

export type ReportChatMessage = z.infer<typeof ChatMessageSchema>;

export const askReportQuestion = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => AskInputSchema.parse(data))
  .handler(async ({ data }): Promise<{ text: string; learnedResponsibility?: string }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured. Missing LOVABLE_API_KEY.");

    const gateway = createLovableAiGatewayProvider(key);

    const reportJson = (() => {
      try {
        return JSON.stringify(data.report, null, 2);
      } catch {
        return "{}";
      }
    })();

    const system = `You are a concise mortgage underwriting assistant embedded inside a loan analysis report. The loan officer clicked the "${data.cardLabel}" card and is asking about it.

Answer ONLY from the report context provided below — it is the source of truth and reflects the user's current loan type, scenario, and selected report version. If something is not in the context, say so briefly and suggest verifying against investor overlays. Never invent figures, citations, or program rules.

Keep answers tight and practical (2–5 sentences, or short bullet lines). Plain text only — no markdown headers or code fences. Focus on the "${data.cardLabel}" card, but you may reference other parts of the report when relevant.

=== ACTIVE REPORT CONTEXT ===
Loan type: ${data.loanType || "(unspecified)"}
Scenario: ${data.scenario || "(none provided)"}
Report version: ${data.versionLabel || "(current)"}

FOCUSED CARD — ${data.cardLabel}:
${data.cardValue || "(no rendered value)"}

FULL REPORT JSON:
${reportJson}
=== END CONTEXT ===${
      data.captureResponsibility
        ? `\n\nDEPARTMENT RE-ASSIGNMENT: This is a loan condition. If the user states or implies that this condition is a DIFFERENT department's responsibility (LO, Processor, Borrower, Title, or Closing), confirm it briefly in your reply, then on the VERY LAST line output a tag exactly like [[RESPONSIBILITY: <one of LO|Processor|Borrower|Title|Closing>]]. Only emit the tag when the user is clearly re-assigning responsibility; never emit it otherwise.`
        : ""
    }`;

    const messages =
      data.mode === "insight"
        ? [
            {
              role: "user" as const,
              content: `In 1–2 sentences, give a sharp insight summary of the "${data.cardLabel}" card for this exact scenario — the single most important takeaway a loan officer should know. No preamble.`,
            },
          ]
        : data.messages.map((m) => ({ role: m.role, content: m.content }));

    if (messages.length === 0) {
      throw new Error("No question provided.");
    }

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        messages,
      });

      let reply = text.trim() || "I couldn't generate a response — try rephrasing.";
      let learnedResponsibility: string | undefined;

      if (data.captureResponsibility) {
        const m = reply.match(/\[\[\s*RESPONSIBILITY:\s*([^\]]+?)\s*\]\]/i);
        if (m) {
          reply = reply.replace(m[0], "").trim();
          const { normalizeResponsibility, writeDeptRule } = await import("@/lib/dept-rules.server");
          const resp = normalizeResponsibility(m[1]);
          learnedResponsibility = resp;
          try {
            await writeDeptRule({
              title: data.cardLabel,
              keywords: "",
              responsibility: resp,
              updatedAt: new Date().toISOString(),
            });
          } catch {
            // best-effort; never break the chat reply
          }
        }
      }

      return { text: reply, learnedResponsibility };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429")) {
        throw new Error("The assistant is rate-limited right now. Please try again in a moment.");
      }
      if (msg.includes("402")) {
        throw new Error("AI credits are exhausted. Add credits in Settings → Workspace → Usage.");
      }
      throw new Error(`Assistant error: ${msg.slice(0, 200)}`);
    }
  });

// ---------------------------------------------------------------------------
// Plain-English condition translator. Takes raw underwriting conditions (often
// dense lender/UW jargon) and returns clear, actionable plain-English cards.
// ---------------------------------------------------------------------------

const TranslateInputSchema = z
  .object({
    conditions: z.string().default(""),
    loanType: z.string().default(""),
    attachments: z.array(AttachmentSchema).max(6).default([]),
  })
  .refine((d) => d.conditions.trim() !== "" || d.attachments.length > 0, {
    message: "Paste the conditions or attach a screenshot to translate.",
  });

export const RESPONSIBILITIES = ["LO", "Processor", "Borrower", "Title", "Closing", "Other"] as const;
export type Responsibility = (typeof RESPONSIBILITIES)[number];

export type TranslatedCondition = {
  title: string;
  original: string;
  plainEnglish: string;
  reason: string;
  docsToProvide: string;
  keyDetails: string;
  responsibility: Responsibility;
};

const TranslatedConditionSchema = z.object({
  title: z.string().default(""),
  original: z.string().default(""),
  plainEnglish: z.string().default(""),
  reason: z.string().default(""),
  docsToProvide: z.string().default(""),
  keyDetails: z.string().default(""),
  responsibility: z.string().default(""),
});

export const translateConditions = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => TranslateInputSchema.parse(data))
  .handler(async ({ data }): Promise<{ conditions: TranslatedCondition[] }> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured. Missing LOVABLE_API_KEY.");

    const gateway = createLovableAiGatewayProvider(key);

    // Load learned responsibility overrides so re-categorizations the user made
    // via chat carry forward to future translations.
    const { readDeptRules } = await import("@/lib/dept-rules.server");
    const learnedRules = await readDeptRules();
    const learnedBlock = learnedRules.length
      ? learnedRules
          .map((r) => `- A condition like "${r.title}"${r.keywords ? ` (keywords: ${r.keywords})` : ""} → ${r.responsibility}`)
          .join("\n")
      : "(none yet)";

    const system = `You are a mortgage underwriting translator. A loan officer or borrower provides raw underwriting/lender CONDITIONS — either pasted as text or as a SCREENSHOT/IMAGE/PDF — often dense jargon, abbreviations, and boilerplate they do NOT understand — and you explain each one in clear plain English, tell them exactly which documents to provide, surface the important specifics, and assign which department is responsible for satisfying it.

If the conditions are supplied as an image or file, first read/OCR all the condition text from it, then translate every condition you find.

Respond with raw JSON only (no markdown fences). The JSON must be an object with a single key "conditions" whose value is an array. Split the source into individual conditions (one object per distinct condition/stipulation). Each array item is an object with exactly these string keys:
- "title": a short 3-7 word label naming the condition (e.g. "Most Recent Pay Stubs").
- "original": the original condition text, lightly cleaned up but faithful to the source wording.
- "plainEnglish": a clear 1-3 sentence plain-English explanation of what the underwriter is actually asking for. No jargon.
- "reason": 1-2 sentences explaining the GENERAL reason the underwriter asks for this document/condition (e.g. "Lenders verify recent income to confirm you can afford the payment", "Bank statements confirm the down-payment funds are yours and properly sourced"). Keep it educational and easy to understand.
- "docsToProvide": "- " bullet lines listing exactly which document(s) the borrower/LO must provide to satisfy this condition. CRITICAL — when naming a document, REUSE THE UNDERWRITER'S EXACT TERMINOLOGY from the source condition. Do not rename, paraphrase, or substitute synonyms for document names (e.g. if the underwriter says "Purchase Agreement", call it "Purchase Agreement", never "purchase contract" or "sales contract"; if they say "Declarations Page", keep "Declarations Page"). Matching their verbiage minimizes confusion.
- "keyDetails": "- " bullet lines calling out the IMPORTANT specifics and requirements for those documents. Whenever possible, format each bullet as "Label: value" (e.g. "- Rent Loss: Minimum 6 months coverage required", "- Total Funds Needed: $68,621.09", "- Mortgagee Clause: Select Portfolio Servicing, INC.", "- Critical Action: Must be fully executed—signed and dated"). Include exact date ranges or recency ("most recent 30 consecutive days", "last 2 months, all pages"), property addresses, creditor names, lender/mortgagee names, account or loan numbers, dollar amounts, signatures required, and any deadlines. Keep the underwriter's exact wording for any named documents here too. Pull these specifics from the source whenever present. If a needed specific is not in the source, state what the borrower should confirm (e.g. "- Confirm the exact creditor and inquiry date for the required letter of explanation"). Set to "- No special requirements noted." only if there genuinely are none.
- "responsibility": which party is responsible for clearing this condition. Use EXACTLY one of: "LO" (Loan Officer originator tasks), "Processor" (processor/internal file-build tasks), "Borrower" (items only the borrower can produce/sign), "Title" (title/escrow company items), "Closing" (closer/funder/settlement items). Use "Other" only if none fit.

LEARNED RESPONSIBILITY OVERRIDES (the user previously corrected these — they are AUTHORITATIVE; if a condition matches one of these by meaning, you MUST assign that responsibility):
${learnedBlock}

${data.loanType ? `The loan program is "${data.loanType}" — keep explanations relevant to it.` : "No loan program was selected; give general, program-agnostic guidance."}
Only state details present in the source; never invent figures, names, or dates. Output nothing outside the JSON object.`;

    try {
      const textPart = data.conditions.trim()
        ? `Conditions to translate:\n\n${data.conditions.trim()}`
        : "The conditions are in the attached screenshot/file(s). Read all the condition text from them and translate every condition you find.";

      const content: Array<
        | { type: "text"; text: string }
        | { type: "image"; image: string }
        | { type: "file"; data: string; mediaType: string }
      > = [{ type: "text", text: textPart }];
      for (const att of data.attachments) {
        if (att.mediaType.startsWith("image/")) {
          content.push({ type: "image", image: att.dataUrl });
        } else {
          content.push({ type: "file", data: att.dataUrl, mediaType: att.mediaType });
        }
      }

      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        messages: [{ role: "user", content }],
      });

      const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      const jsonStr = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;

      const parsed = JSON.parse(jsonStr) as { conditions?: unknown[] };
      const { normalizeResponsibility } = await import("@/lib/dept-rules.server");
      const conditions: TranslatedCondition[] = Array.isArray(parsed.conditions)
        ? parsed.conditions.map((c) => {
            const v = TranslatedConditionSchema.parse(c ?? {});
            return {
              title: v.title.trim() || "Condition",
              original: v.original.trim() || "—",
              plainEnglish: v.plainEnglish.trim() || "No translation returned.",
              reason: v.reason.trim() || "The underwriter needs this to verify the loan file.",
              docsToProvide: v.docsToProvide.trim() || "- Confirm the required document with your underwriter.",
              keyDetails: v.keyDetails.trim() || "- No special requirements noted.",
              responsibility: normalizeResponsibility(v.responsibility),
            };
          })
        : [];

      if (conditions.length === 0) {
        throw new Error("No conditions could be parsed from that text.");
      }
      return { conditions };
    } catch (err) {
      const e = err as { statusCode?: number; message?: string };
      if (e?.statusCode === 429) {
        throw new Error("The studio is busy — too many requests. Take a sip and try again shortly.");
      }
      if (e?.statusCode === 402) {
        throw new Error("AI credits are exhausted. Add credits in Settings → Workspace → Usage.");
      }
      throw new Error(e?.message || "Failed to translate the conditions.");
    }
  });
