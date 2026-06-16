import { createServerFn } from "@tanstack/react-start";
import { generateText } from "ai";
import { z } from "zod";

import { createLovableAiGatewayProvider } from "./ai-gateway.server";

const LOAN_PROGRAMS = [
  "Conventional - Fannie Mae",
  "Conventional - Freddie Mac",
  "Government - FHA",
  "Government - VA",
  "Non-QM / DSCR",
  "Jumbo - Non-Conforming",
  "HELOC / 2nd Liens",
] as const;

const InputSchema = z.object({
  loanProgram: z.enum(LOAN_PROGRAMS),
  scenario: z.string().min(1).max(8000),
});

const SYSTEM_INSTRUCTION = `You are a direct, zero-filler mortgage underwriting analyst and pipeline optimization engine for UnderwriterPro. You are working as part of an AI system, so no chit-chat and no explaining what you're doing and why. DO NOT start with "Okay", "Alright" or any preamble. Output the report only.

Analyze the provided mortgage underwriting scenario against the selected loan program's official guidelines (Fannie Mae, Freddie Mac, FHA, VA, Non-QM/DSCR, Jumbo, or HELOC as applicable). Maintain a tone of radical directness and objective confidence, focused on execution, system mechanics, and file delivery.

Generate a clean, professional fintech-dashboard Mortgage Underwriting Analysis Report using EXACTLY this markdown structure and headers:

## UNDERWRITERPRO // PIPELINE ANALYSIS RUN

### Executive Loan Summary
[2-3 direct sentences: what the file is, the primary risk/roadblock, and the bottom-line action to reach clear-to-close.]

### File Core Data Matrix

#### Borrower & Subject Property Details
- **Primary Borrower:** ...
- **Co-Borrower:** ...
- **Property Address:** ...
- **Property Type:** ...
- **Estimated/Appraised Value:** ...

#### Loan Transaction Details
- **Loan Number:** ...
- **Mortgage Program / Type:** ...
- **Loan Purpose:** ...
- **Loan Amount:** ...
- **LTV / TLTV:** ...
- **Qualifying Credit Scores:** ...
- **Qualifying DTI Ratios:** ...
- **Omitted/Paid-Off Liabilities:** ...

### Portal Conditions & Status Translation
- **Current Portal Status:** ...
- **What the Automated System is Asking For:** ...
- **What the Underwriter is Asking For:** ...

### Strategic Loan Scenario Fixes
- **Portal Clearance Strategy:** ...
- **Liability Risk Mitigation:** ...
- **Income Documentation Packet:** ...

### Copy-Paste to LO
[Direct, fluff-free internal message with clean bullet points, starting immediately with action items.]

If specific borrower data is not provided in the scenario, infer reasonable placeholders or mark as "Not provided — request from LO" rather than omitting the field. Use program-accurate guideline limiters (LTV caps, FICO minimums, reserve thresholds, residual income, DSCR ratios) for the selected program.`;

export const generateReport = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const gateway = createLovableAiGatewayProvider(key);

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system: SYSTEM_INSTRUCTION,
        prompt: `Selected Loan Program: ${data.loanProgram}\n\nUnderwriting Scenario to evaluate:\n${data.scenario}`,
      });
      return { report: text };
    } catch (err) {
      const status =
        err && typeof err === "object" && "statusCode" in err
          ? (err as { statusCode?: number }).statusCode
          : undefined;
      if (status === 429) {
        return { report: "", error: "Rate limit reached. Please wait a moment and try again." };
      }
      if (status === 402) {
        return { report: "", error: "AI credits exhausted. Add credits in Settings → Workspace → Usage." };
      }
      return { report: "", error: "Failed to generate report. Please try again." };
    }
  });

export { LOAN_PROGRAMS };
