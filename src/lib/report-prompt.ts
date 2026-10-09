// Prompt for the AI report. Source of truth: docs/spec.md, sections 7 and 9.
// The model only sees industry, company size, scores, level and answers: never the contact's
// name, email or company. Every value comes from a closed list, so visitors cannot inject text.

import type { CompanySize, Industry } from "@/lib/company";
import { DIMENSION_LABELS, QUESTIONS } from "@/lib/questions";
import { DIMENSIONS, LEVEL_NAMES, type Answers, type DiagnosticScore } from "@/lib/scoring";
import type { Submission } from "@/lib/submission";

export interface ReportInput {
  industry: Industry;
  companySize: CompanySize;
  score: DiagnosticScore;
  answers: Answers;
}

export const REPORT_SYSTEM_PROMPT = `You are an AI adoption consultant for small and mid-sized businesses in Houston, Texas.
You write a short report for a business owner based on their AI readiness diagnostic.

Rules:
- The score and level are already calculated. Do not change, recalculate or contradict them.
- When you describe the current situation, use the exact meaning of the option the owner chose. Do not exaggerate or soften it. For example, "Unwritten" means rules exist but are not written down, not that there are no rules.
- Before proposing AI for a task, check whether classic automation (rules, spreadsheet formulas, scripts, workflow tools or integrations between existing systems) is enough. If it is, propose the classic automation and say so.
- Prioritize internal, measurable use cases (back office, operations, reporting) over customer-facing chatbots.
- Filter use cases by the precision they require and the cost of an error. Avoid cases where a wrong output is expensive or hard to detect, unless a person reviews every output.
- Fit the use cases to the industry, the company size and the weakest areas in the answers.
- summary: 2 to 3 sentences about where the business stands.
- Exactly 3 use cases, most important first. For each: a short title, why it fits this business, effort and risk (low, medium or high) and a concrete first step.
- nextStep: exactly 1 sentence with the single action to take this week.
- Plain English, no jargon and no hype.`;

// Picks the fields the model may see. Contact data never leaves this function.
export function reportInputFrom(submission: Submission, score: DiagnosticScore): ReportInput {
  return {
    industry: submission.industry,
    companySize: submission.companySize,
    score,
    answers: submission.answers,
  };
}

export function buildReportPrompt(input: ReportInput): string {
  const { score } = input;
  const lines = [
    `Industry: ${input.industry}`,
    `Company size: ${input.companySize} employees`,
    `Level: ${score.level} (${LEVEL_NAMES[score.level]}) out of 3`,
    `Overall score: ${score.global} / 100`,
    "",
    "Scores by area:",
    ...DIMENSIONS.map(
      (dimension) => `- ${DIMENSION_LABELS[dimension]}: ${score.dimensions[dimension]} / 100`,
    ),
    "",
    "Answers:",
  ];
  for (const dimension of DIMENSIONS) {
    lines.push(`${DIMENSION_LABELS[dimension]}:`);
    QUESTIONS[dimension].forEach((question, index) => {
      lines.push(`- ${question.text} ${question.options[input.answers[dimension][index]]}`);
    });
  }
  return lines.join("\n");
}
