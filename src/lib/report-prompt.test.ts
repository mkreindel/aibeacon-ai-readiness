import { describe, expect, it } from "vitest";
import { QUESTIONS } from "@/lib/questions";
import {
  REPORT_SYSTEM_PROMPT,
  buildReportPrompt,
  reportInputFrom,
} from "@/lib/report-prompt";
import { DIMENSIONS, scoreDiagnostic } from "@/lib/scoring";
import type { Submission } from "@/lib/submission";

const answers: Submission["answers"] = {
  data: [3, 2, 1],
  processes: [2, 2, 2],
  tools: [1, 1, 0],
  team: [2, 3, 2],
  governance: [0, 1, 1],
};

// Contact values that would never appear in a prompt by chance.
const submission: Submission = {
  industry: "Manufacturing",
  companySize: "51-200",
  answers,
  contact: {
    name: "zz-name-7781",
    email: "zz-email-7781@example.com",
    company: "zz-company-7781",
  },
  consent: true,
};

const score = scoreDiagnostic(answers);

describe("reportInputFrom", () => {
  it("keeps only industry, size, score and answers", () => {
    const input = reportInputFrom(submission, score);
    expect(Object.keys(input).sort()).toEqual(["answers", "companySize", "industry", "score"]);
    expect(input).toEqual({ industry: "Manufacturing", companySize: "51-200", score, answers });
  });
});

describe("buildReportPrompt", () => {
  const prompt = buildReportPrompt(reportInputFrom(submission, score));

  it("never includes the contact's name, email or company", () => {
    const sent = REPORT_SYSTEM_PROMPT + prompt;
    expect(sent).not.toContain("zz-name-7781");
    expect(sent).not.toContain("zz-email-7781");
    expect(sent).not.toContain("zz-company-7781");
    expect(sent).not.toContain("7781");
  });

  it("includes industry, size, level and every score", () => {
    expect(prompt).toContain("Industry: Manufacturing");
    expect(prompt).toContain("Company size: 51-200 employees");
    expect(prompt).toContain(`Level: ${score.level}`);
    expect(prompt).toContain(`Overall score: ${score.global} / 100`);
    expect(prompt).toContain(`Data: ${score.dimensions.data} / 100`);
    expect(prompt).toContain(`Governance: ${score.dimensions.governance} / 100`);
  });

  it("includes every question with the option the visitor chose", () => {
    for (const dimension of DIMENSIONS) {
      QUESTIONS[dimension].forEach((question, index) => {
        const chosen = question.options[answers[dimension][index]];
        expect(prompt).toContain(`${question.text} ${chosen}`);
      });
    }
  });
});

describe("REPORT_SYSTEM_PROMPT", () => {
  it("applies the spec's criteria", () => {
    expect(REPORT_SYSTEM_PROMPT).toMatch(/classic automation/i);
    expect(REPORT_SYSTEM_PROMPT).toMatch(/internal, measurable/i);
    expect(REPORT_SYSTEM_PROMPT).toMatch(/customer-facing chatbots/i);
    expect(REPORT_SYSTEM_PROMPT).toMatch(/precision/i);
    expect(REPORT_SYSTEM_PROMPT).toMatch(/cost of an error/i);
  });

  it("asks to describe each answer with the exact meaning of the chosen option", () => {
    expect(REPORT_SYSTEM_PROMPT).toMatch(/exact meaning of the option/i);
    expect(REPORT_SYSTEM_PROMPT).toMatch(/do not exaggerate or soften/i);
    expect(REPORT_SYSTEM_PROMPT).toMatch(/"Unwritten" means rules exist but are not written down, not that there are no rules/);
  });

  it("forbids changing the score or level", () => {
    expect(REPORT_SYSTEM_PROMPT).toMatch(/do not change, recalculate or contradict/i);
  });

  it("asks for the sentence counts and exactly 3 use cases", () => {
    expect(REPORT_SYSTEM_PROMPT).toMatch(/summary: 2 to 3 sentences/i);
    expect(REPORT_SYSTEM_PROMPT).toMatch(/nextStep: exactly 1 sentence/i);
    expect(REPORT_SYSTEM_PROMPT).toMatch(/exactly 3 use cases/i);
  });
});
