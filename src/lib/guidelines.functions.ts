import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { generateText, Output } from "ai";
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

    const system = `You are a senior mortgage underwriting assistant specializing in the "${data.loanType}" loan program. Analyze the scenario or underwriter stipulation a loan processor describes and give precise, program-specific guidance. Be concrete and practical. Use short markdown bullet lists in each field.`;

    try {
      const { output } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        output: Output.object({
          schema: z.object({
            guidelineRequirements: z
              .string()
              .describe("Standard guideline requirements for this program and scenario."),
            roadblocks: z
              .string()
              .describe("Potential roadblocks, red flags, or reasons this could get denied."),
            documentation: z
              .string()
              .describe("Exact documentation to request from the borrower to clear this."),
          }),
        }),
        system,
        prompt: `Loan Program: ${data.loanType}\n\nScenario / Stipulation:\n${data.scenario}`,
      });

      return output as Analysis;
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
