import { describe, expect, it } from "vitest";
import { scoreDiagnostic } from "@/lib/scoring";
import { submissionSchema, type Submission } from "@/lib/submission";

const validSubmission = () => ({
  industry: "Retail",
  companySize: "11-50",
  answers: {
    data: [3, 2, 1],
    processes: [0, 1, 2],
    tools: [3, 3, 3],
    team: [1, 1, 1],
    governance: [2, 2, 2],
  },
  contact: { name: "Jane Doe", email: "jane@example.com", company: "Acme" },
  consent: true,
});

type Mutation = (body: ReturnType<typeof validSubmission>) => unknown;

const rejects = (mutate: Mutation) => {
  const body = validSubmission();
  const result = submissionSchema.safeParse(mutate(body) ?? body);
  return !result.success;
};

describe("submissionSchema", () => {
  it("accepts a complete, valid submission", () => {
    expect(submissionSchema.safeParse(validSubmission()).success).toBe(true);
  });

  it("produces answers the scoring function accepts", () => {
    const submission: Submission = submissionSchema.parse(validSubmission());
    // data 67, processes 33, tools 100, team 33, governance 67 -> 300 / 5 = 60
    expect(scoreDiagnostic(submission.answers)).toEqual({
      dimensions: { data: 67, processes: 33, tools: 100, team: 33, governance: 67 },
      global: 60,
      level: 2,
    });
  });

  it("trims contact fields", () => {
    const body = validSubmission();
    body.contact = { name: "  Jane Doe ", email: " jane@example.com ", company: " Acme  " };
    const result = submissionSchema.parse(body);
    expect(result.contact).toEqual({ name: "Jane Doe", email: "jane@example.com", company: "Acme" });
  });

  describe("consent", () => {
    it.each([
      ["false", false],
      ["a string", "true"],
      ["missing", undefined],
    ])("rejects consent that is %s", (_, consent) => {
      expect(rejects((body) => ({ ...body, consent }))).toBe(true);
    });
  });

  describe("company data", () => {
    it("rejects an industry outside the list", () => {
      expect(rejects((body) => ({ ...body, industry: "Mining" }))).toBe(true);
    });

    it("rejects a size outside the list", () => {
      expect(rejects((body) => ({ ...body, companySize: "201-500" }))).toBe(true);
    });
  });

  describe("answers", () => {
    it.each([
      ["4", 4],
      ["-1", -1],
      ["1.5", 1.5],
      ["a string", "2"],
    ])("rejects an answer of %s", (_, value) => {
      expect(rejects((body) => ({ ...body, answers: { ...body.answers, data: [value, 0, 0] } }))).toBe(true);
    });

    it.each([
      ["2 answers", [1, 1]],
      ["4 answers", [1, 1, 1, 1]],
    ])("rejects a dimension with %s", (_, values) => {
      expect(rejects((body) => ({ ...body, answers: { ...body.answers, team: values } }))).toBe(true);
    });

    it("rejects a missing dimension", () => {
      expect(
        rejects((body) => {
          const answers: Partial<typeof body.answers> = { ...body.answers };
          delete answers.governance;
          return { ...body, answers };
        }),
      ).toBe(true);
    });

    it("rejects an unknown dimension", () => {
      expect(rejects((body) => ({ ...body, answers: { ...body.answers, finance: [1, 1, 1] } }))).toBe(true);
    });
  });

  describe("contact", () => {
    it.each([
      ["an invalid email", { email: "not-an-email" }],
      ["a blank name", { name: "   " }],
      ["a blank company", { company: "" }],
      ["a name over 200 characters", { name: "a".repeat(201) }],
      ["a company over 200 characters", { company: "a".repeat(201) }],
      ["an email over 320 characters", { email: `${"a".repeat(320)}@example.com` }],
    ])("rejects %s", (_, override) => {
      expect(rejects((body) => ({ ...body, contact: { ...body.contact, ...override } }))).toBe(true);
    });
  });

  describe("fields the browser must not set", () => {
    it.each([
      ["scores", { global: 100 }],
      ["level", 3],
      ["is_demo", true],
      ["ip_hash", "a".repeat(64)],
    ])("rejects a body that includes %s", (key, value) => {
      expect(rejects((body) => ({ ...body, [key]: value }))).toBe(true);
    });

    it("rejects unknown fields inside contact", () => {
      expect(rejects((body) => ({ ...body, contact: { ...body.contact, phone: "555" } }))).toBe(true);
    });
  });
});
