// Generates the AI report. Source of truth: docs/spec.md, section 7; decisions in docs/adr/0004-ai-report.md.
// The model is injected so tests use a mock and never call a real provider.
// Throws on any failure (provider error, timeout, invalid JSON or output that does not validate);
// the caller turns that into report = null.

import { generateText, Output, type LanguageModel } from "ai";
import { reportModelSchema, reportSchema, type Report } from "@/lib/report";
import { REPORT_SYSTEM_PROMPT, buildReportPrompt, type ReportInput } from "@/lib/report-prompt";

export const REPORT_TIMEOUT_MS = 15_000;

export async function generateReport(input: ReportInput, model: LanguageModel): Promise<Report> {
  const { output } = await generateText({
    model,
    instructions: REPORT_SYSTEM_PROMPT,
    prompt: buildReportPrompt(input),
    output: Output.object({ schema: reportModelSchema }),
    timeout: REPORT_TIMEOUT_MS,
    maxRetries: 0,
  });
  // The model schema has no length limits (OpenAI strict mode); the full schema adds them.
  return reportSchema.parse(output);
}
