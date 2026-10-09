import "server-only";
import { openai } from "@ai-sdk/openai";
import { generateReport } from "@/lib/server/generate-report";
import type { ReportGenerator } from "@/lib/server/submit-diagnostic";

// Model verified on developers.openai.com on 09/10/2026: Structured outputs supported,
// Responses API enabled. See docs/adr/0004-ai-report.md.
export const REPORT_MODEL_ID = "gpt-5.4-mini";

// Report generator backed by OpenAI through the Vercel AI SDK (Responses API, strict schema).
// Returns null without OPENAI_API_KEY, so diagnostics are still saved without a report.
// The "server-only" import makes the build fail if this module reaches the browser.
export function createOpenAIReportGenerator(): ReportGenerator | null {
  if (!process.env.OPENAI_API_KEY) return null;
  const model = openai(REPORT_MODEL_ID);
  return (input) => generateReport(input, model);
}
