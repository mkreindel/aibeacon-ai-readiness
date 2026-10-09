// Shape of the AI report. Source of truth: docs/spec.md, section 7.
// Sentence counts are asked for in the prompt; the schema only caps lengths, because counting
// sentences with a regex would reject valid text (for example "e.g." or "U.S.").
// Objects are strict: the model cannot add a score, a level or any other field.
//
// Two schemas, see docs/adr/0004-ai-report.md:
// - reportModelSchema goes to the model. OpenAI strict mode rejects unsupported JSON Schema
//   keywords, and string minLength/maxLength are not listed as supported, so it has no lengths.
// - reportSchema validates the model's output afterwards and adds the length limits.

import { z } from "zod";

export const REPORT_LIMITS = {
  summary: 600,
  nextStep: 250,
  title: 100,
  why: 400,
  firstStep: 250,
} as const;

const text = (max: number) => z.string().min(1).max(max);
const rating = z.enum(["low", "medium", "high"]);

const modelUseCaseSchema = z.strictObject({
  title: z.string(),
  why: z.string(),
  effort: rating,
  risk: rating,
  firstStep: z.string(),
});

export const reportModelSchema = z.strictObject({
  summary: z.string(),
  useCases: z.array(modelUseCaseSchema).length(3),
  nextStep: z.string(),
});

export const useCaseSchema = z.strictObject({
  title: text(REPORT_LIMITS.title),
  why: text(REPORT_LIMITS.why),
  effort: rating,
  risk: rating,
  firstStep: text(REPORT_LIMITS.firstStep),
});

export const reportSchema = z.strictObject({
  summary: text(REPORT_LIMITS.summary),
  useCases: z.array(useCaseSchema).length(3),
  nextStep: text(REPORT_LIMITS.nextStep),
});

export type Report = z.infer<typeof reportSchema>;
export type UseCase = z.infer<typeof useCaseSchema>;
