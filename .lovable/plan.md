# Reinforce structured JSON output in `analyzeScenario`

The current handler already uses `generateText` + manual JSON parsing (the crashing `Output.object` schema path was removed earlier). The remaining hardening is to make the system prompt explicit so the model never wraps output in markdown or adds filler.

## Change (`src/lib/guidelines.functions.ts`)

- Replace the system prompt's lead-in so it begins with the exact required sentence:
  > "You are a senior mortgage underwriting assistant. You must respond with raw JSON matching the exact requested keys: guidelineRequirements, roadblocks, and documentation. Do not wrap the response in markdown code blocks like ```json."
- Keep the loan-program specialization line and the per-key descriptions (guidelineRequirements, roadblocks, documentation) so the three camelCase keys match the parser/return shape exactly.
- Keep the existing robust parsing: strip any stray code fences, slice from first `{` to last `}`, `JSON.parse`, and fall back to safe defaults per key — this already guards against malformed output and prevents the line-67 crash.

## Result

No schema-validation runtime crash; the model is strongly steered to emit raw JSON with exactly `guidelineRequirements`, `roadblocks`, and `documentation`, and parsing stays defensive if it ever deviates.  
  
The plan is excellent. Please proceed with reinforcing the structured JSON output in `src/lib/guidelines.functions.ts` exactly as outlined. Ensure the system prompt lead-in matches the new strict rule boundaries and let me know when the build succeeds!