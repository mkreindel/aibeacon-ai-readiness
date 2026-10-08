import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DIMENSION_LABELS, QUESTIONS } from "@/lib/questions";
import { DIMENSIONS } from "@/lib/scoring";

const allQuestions = DIMENSIONS.flatMap((dimension) => QUESTIONS[dimension]);

// Reads "N. Question? (opt0 / opt1 / opt2 / opt3)" lines from section 6 of the spec.
function questionsFromSpec() {
  const spec = readFileSync(new URL("../../docs/spec.md", import.meta.url), "utf8");
  const section = spec.split("## 6.")[1].split("\n## ")[0];
  // Question text ends at its "?"; some questions contain parentheses themselves.
  return [...section.matchAll(/^(\d+)\. (.+\?) \((.+)\)$/gm)].map(([, number, text, options]) => ({
    id: `q${number}`,
    text,
    options: options.split(" / "),
  }));
}

describe("question bank", () => {
  it("has 15 questions, 3 per dimension", () => {
    expect(allQuestions).toHaveLength(15);
    for (const dimension of DIMENSIONS) {
      expect(QUESTIONS[dimension]).toHaveLength(3);
    }
  });

  it("numbers questions q1 to q15 in dimension order", () => {
    expect(allQuestions.map((question) => question.id)).toEqual(
      Array.from({ length: 15 }, (_, index) => `q${index + 1}`),
    );
  });

  it("gives every question 4 non-empty options, one per value 0 to 3", () => {
    for (const question of allQuestions) {
      expect(question.options).toHaveLength(4);
      for (const option of question.options) {
        expect(option.trim()).not.toBe("");
      }
    }
  });

  it("has a label for every dimension", () => {
    expect(Object.keys(DIMENSION_LABELS).sort()).toEqual([...DIMENSIONS].sort());
  });

  it("matches the questions and options in docs/spec.md section 6", () => {
    expect(allQuestions).toEqual(questionsFromSpec());
  });
});
