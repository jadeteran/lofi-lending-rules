import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";


export const LOAN_TYPES = [
  "Conventional - Fannie Mae",
  "Conventional - Freddie Mac",
  "Government - FHA",
  "Government - VA",
  "HELOC / 2nd Liens",
  "Jumbo - Non-Conforming",
  "Non-QM / DSCR",
  "Private Money / Hard Money",
] as const;

export type Analysis = {
  guidelineRequirements: string;
  roadblocks: string;
  documentation: string;
};

const InputSchema = z.object({
  loanType: z.string().min(1),
  scenario: z.string().min(1),
});

export const analyzeScenario = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }): Promise<Analysis> => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured. Missing LOVABLE_API_KEY.");

    const gateway = createLovableAiGatewayProvider(key);

    const system = `You are a senior mortgage underwriting assistant specializing in the "${data.loanType}" loan program. Analyze the scenario or underwriter stipulation a loan processor describes and give precise, program-specific guidance. Be concrete and practical.

Respond with ONLY a valid JSON object (no markdown fences, no extra text) with exactly these string keys:
- "guidelineRequirements": standard guideline requirements for this program and scenario.
- "roadblocks": potential roadblocks, red flags, or reasons this could get denied.
- "documentation": exact documentation to request from the borrower to clear this.

Each value should be a single string using "- " bullet lines separated by newlines.`;

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system,
        prompt: `Loan Program: ${data.loanType}\n\nScenario / Stipulation:\n${data.scenario}`,
      });

      const cleaned = text.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      const jsonStr = start !== -1 && end !== -1 ? cleaned.slice(start, end + 1) : cleaned;

      const parsed = JSON.parse(jsonStr) as Partial<Analysis>;
      return {
        guidelineRequirements: parsed.guidelineRequirements ?? "No requirements returned.",
        roadblocks: parsed.roadblocks ?? "No roadblocks returned.",
        documentation: parsed.documentation ?? "No documentation returned.",
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
