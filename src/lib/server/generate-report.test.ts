import { MockLanguageModelV4 } from "ai/test";
import { describe, expect, it } from "vitest";
import { REPORT_SYSTEM_PROMPT, type ReportInput } from "@/lib/report-prompt";
import { REPORT_TIMEOUT_MS, generateReport } from "@/lib/server/generate-report";
import { scoreDiagnostic, type Answers } from "@/lib/scoring";

const answers: Answers = {
  data: [2, 2, 1],
  processes: [1, 2, 1],
  tools: [1, 0, 1],
  team: [2, 1, 1],
  governance: [1, 1, 0],
};

const input: ReportInput = {
  industry: "Retail",
  companySize: "11-50",
  score: scoreDiagnostic(answers),
  answers,
};

const useCase = {
  title: "Automate weekly sales report",
  why: "Sales are copied by hand from the register into a spreadsheet each week.",
  effort: "low",
  risk: "low",
  firstStep: "Export one week of register data and list the totals you copy by hand.",
};

const validReport = {
  summary: "Your team already uses some tools. The biggest gains are in repetitive reporting.",
  useCases: [useCase, { ...useCase, effort: "medium" }, { ...useCase, risk: "medium" }],
  nextStep: "Time how long the weekly sales report takes today.",
};

function modelReturning(text: string) {
  return new MockLanguageModelV4({
    doGenerate: async () => ({
      content: [{ type: "text", text }],
      finishReason: { unified: "stop", raw: undefined },
      usage: {
        inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
        outputTokens: { total: 20, text: 20, reasoning: undefined },
      },
      warnings: [],
    }),
  });
}

describe("generateReport", () => {
  it("returns the report when the model output validates", async () => {
    const model = modelReturning(JSON.stringify(validReport));
    await expect(generateReport(input, model)).resolves.toEqual(validReport);
  });

  it("sends the system prompt and the diagnostic, with a JSON schema", async () => {
    const model = modelReturning(JSON.stringify(validReport));
    await generateReport(input, model);

    const call = model.doGenerateCalls[0];
    const sent = JSON.stringify(call.prompt);
    expect(sent).toContain("Industry: Retail");
    expect(sent).toContain(JSON.stringify(REPORT_SYSTEM_PROMPT).slice(1, 60));
    expect(call.responseFormat?.type).toBe("json");
  });

  it("sends the model a JSON schema without string length limits", async () => {
    const model = modelReturning(JSON.stringify(validReport));
    await generateReport(input, model);

    const format = model.doGenerateCalls[0].responseFormat;
    const schema = JSON.stringify(format?.type === "json" ? format.schema : undefined);
    expect(schema).toContain('"minItems":3');
    expect(schema).toContain('"maxItems":3');
    expect(schema).not.toContain("maxLength");
    expect(schema).not.toContain("minLength");
  });

  it("uses a 15 second timeout", () => {
    expect(REPORT_TIMEOUT_MS).toBe(15_000);
  });

  it("rejects when the model returns invalid JSON", async () => {
    await expect(generateReport(input, modelReturning("not json"))).rejects.toThrow();
  });

  it("rejects when the output has the wrong number of use cases", async () => {
    const twoUseCases = { ...validReport, useCases: [useCase, useCase] };
    await expect(
      generateReport(input, modelReturning(JSON.stringify(twoUseCases))),
    ).rejects.toThrow();
  });

  it("rejects when the output passes the model schema but breaks a length limit", async () => {
    const longSummary = { ...validReport, summary: "a".repeat(601) };
    await expect(
      generateReport(input, modelReturning(JSON.stringify(longSummary))),
    ).rejects.toThrow();
  });

  it("rejects when the model call fails", async () => {
    const model = new MockLanguageModelV4({
      doGenerate: async () => {
        throw new Error("network down");
      },
    });
    await expect(generateReport(input, model)).rejects.toThrow();
    expect(model.doGenerateCalls).toHaveLength(1); // no retries
  });
});
