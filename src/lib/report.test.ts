import { describe, expect, it } from "vitest";
import { z } from "zod";
import { REPORT_LIMITS, reportModelSchema, reportSchema } from "@/lib/report";

const useCase = {
  title: "Automate invoice data entry",
  why: "Invoices are typed by hand today, which is slow and error-prone.",
  effort: "low",
  risk: "low",
  firstStep: "List the invoice fields your team types every week.",
};

const valid = {
  summary: "You have solid data habits. Your next gains come from automating repetitive office work.",
  useCases: [useCase, { ...useCase, effort: "medium" }, { ...useCase, risk: "high" }],
  nextStep: "Pick one weekly task and time how long it takes today.",
};

describe("reportSchema", () => {
  it("accepts a report with summary, exactly 3 use cases and a next step", () => {
    expect(reportSchema.parse(valid)).toEqual(valid);
  });

  it.each([2, 4])("rejects %i use cases", (count) => {
    const useCases = Array.from({ length: count }, () => useCase);
    expect(reportSchema.safeParse({ ...valid, useCases }).success).toBe(false);
  });

  it.each([
    ["effort", "very low"],
    ["risk", "none"],
  ])("rejects an unknown %s value", (field, value) => {
    const useCases = [{ ...useCase, [field]: value }, useCase, useCase];
    expect(reportSchema.safeParse({ ...valid, useCases }).success).toBe(false);
  });

  it.each(["summary", "nextStep"] as const)("rejects an empty %s", (field) => {
    expect(reportSchema.safeParse({ ...valid, [field]: "" }).success).toBe(false);
  });

  it.each(["title", "why", "firstStep"] as const)("rejects an empty use case %s", (field) => {
    const useCases = [{ ...useCase, [field]: "" }, useCase, useCase];
    expect(reportSchema.safeParse({ ...valid, useCases }).success).toBe(false);
  });

  it("caps the summary at 600 characters and the next step at 250", () => {
    expect(REPORT_LIMITS.summary).toBe(600);
    expect(REPORT_LIMITS.nextStep).toBe(250);
    expect(reportSchema.safeParse({ ...valid, summary: "a".repeat(600) }).success).toBe(true);
    expect(reportSchema.safeParse({ ...valid, summary: "a".repeat(601) }).success).toBe(false);
    expect(reportSchema.safeParse({ ...valid, nextStep: "a".repeat(250) }).success).toBe(true);
    expect(reportSchema.safeParse({ ...valid, nextStep: "a".repeat(251) }).success).toBe(false);
  });

  it("rejects extra fields, so the model cannot add a score or level", () => {
    expect(reportSchema.safeParse({ ...valid, level: 3 }).success).toBe(false);
    const useCases = [{ ...useCase, score: 90 }, useCase, useCase];
    expect(reportSchema.safeParse({ ...valid, useCases }).success).toBe(false);
  });

  it("rejects a missing field", () => {
    const withoutNextStep: Partial<typeof valid> = { ...valid };
    delete withoutNextStep.nextStep;
    expect(reportSchema.safeParse(withoutNextStep).success).toBe(false);
  });
});

describe("reportModelSchema (sent to the model)", () => {
  it("accepts a valid report", () => {
    expect(reportModelSchema.parse(valid)).toEqual(valid);
  });

  it("has no string length limits, which OpenAI strict mode does not support", () => {
    const jsonSchema = JSON.stringify(z.toJSONSchema(reportModelSchema));
    expect(jsonSchema).not.toContain("maxLength");
    expect(jsonSchema).not.toContain("minLength");
    expect(reportModelSchema.safeParse({ ...valid, summary: "a".repeat(601) }).success).toBe(true);
  });

  it("still requires exactly 3 use cases, closed ratings and no extra fields", () => {
    const jsonSchema = JSON.stringify(z.toJSONSchema(reportModelSchema));
    expect(jsonSchema).toContain('"minItems":3');
    expect(jsonSchema).toContain('"maxItems":3');
    expect(reportModelSchema.safeParse({ ...valid, useCases: [useCase, useCase] }).success).toBe(false);
    const badRating = [{ ...useCase, risk: "none" }, useCase, useCase];
    expect(reportModelSchema.safeParse({ ...valid, useCases: badRating }).success).toBe(false);
    expect(reportModelSchema.safeParse({ ...valid, level: 3 }).success).toBe(false);
  });
});
