import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { Analysis } from "@/lib/guidelines.functions";

const SaveInputSchema = z.object({
  rawScenario: z.string().default(""),
  selectedProgram: z.string().default(""),
  analysis: z.record(z.string(), z.unknown()),
});

export type HistoryItem = {
  id: string;
  rawScenario: string;
  selectedProgram: string;
  analysis: Analysis;
  updatedAt: string;
};

/**
 * Silent background autosave — never throws to the client. A rejected write
 * (e.g. RLS) resolves to { saved: false } so the workspace stays quiet.
 */
export const saveScenario = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => SaveInputSchema.parse(data))
  .handler(async ({ data }): Promise<{ saved: boolean; id: string | null }> => {
    try {
      const { saveScenarioRow } = await import("@/lib/scenarios.server");
      const res = await saveScenarioRow({
        rawScenario: data.rawScenario,
        selectedProgram: data.selectedProgram,
        analysis: data.analysis,
      });
      return { saved: !!res.id, id: res.id };
    } catch {
      return { saved: false, id: null };
    }
  });

/** Chronological history of past runs for the Recent History panel. */
export const listScenarios = createServerFn({ method: "GET" }).handler(
  async (): Promise<HistoryItem[]> => {
    try {
      const { listScenarioRows } = await import("@/lib/scenarios.server");
      const rows = await listScenarioRows(30);
      return rows
        .filter((r) => r.analysis && typeof r.analysis === "object")
        .map((r) => ({
          id: r.id,
          rawScenario: r.rawScenario,
          selectedProgram: r.selectedProgram,
          analysis: r.analysis as Analysis,
          updatedAt: r.updatedAt,
        }));
    } catch {
      return [];
    }
  },
);
