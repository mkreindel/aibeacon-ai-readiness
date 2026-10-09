import { describe, expect, it, vi } from "vitest";
import {
  getDiagnostic,
  isDiagnosticId,
  LIST_LIMIT,
  listDiagnostics,
  type DiagnosticsReader,
} from "@/lib/admin/diagnostics";

const ID = "3f1c2a9e-1b2c-4d3e-8f40-123456789abc";

const scores = {
  dimensions: { data: 100, processes: 67, tools: 33, team: 0, governance: 56 },
  global: 51,
};

const fullRow = {
  id: ID,
  created_at: "2026-10-08T15:30:00+00:00",
  company: "Bayou Freight Co",
  contact_name: "Alex Rivera",
  email: "alex@example.com",
  industry: "Transportation & logistics",
  company_size: "11-50",
  answers: {
    data: [3, 3, 3],
    processes: [2, 2, 2],
    tools: [1, 1, 1],
    team: [0, 0, 0],
    governance: [2, 2, 1],
  },
  scores,
  level: 2,
  report: null as unknown,
  is_demo: true,
};

const useCase = {
  title: "Route planning from delivery spreadsheets",
  why: "Dispatchers plan routes by hand every morning.",
  effort: "medium",
  risk: "low",
  firstStep: "Export one week of delivery addresses.",
};

const report = {
  summary: "Your data is solid. Your team is the area to strengthen first.",
  useCases: [useCase, useCase, useCase],
  nextStep: "Pick one dispatcher to pilot a route planning tool.",
};

function reader(overrides: Partial<DiagnosticsReader> = {}): DiagnosticsReader {
  return {
    list: vi.fn(async () => [fullRow]),
    getById: vi.fn(async () => fullRow),
    ...overrides,
  };
}

describe("isDiagnosticId", () => {
  it.each([
    [ID, true],
    [ID.toUpperCase(), true],
    ["not-a-uuid", false],
    ["", false],
    [`${ID}x`, false],
  ])("%s -> %s", (id, expected) => {
    expect(isDiagnosticId(id)).toBe(expected);
  });
});

describe("listDiagnostics", () => {
  it(`asks for the latest ${LIST_LIMIT} and maps rows to summaries`, async () => {
    const source = reader();
    const items = await listDiagnostics(source);
    expect(source.list).toHaveBeenCalledWith(LIST_LIMIT);
    expect(items).toEqual([
      {
        id: ID,
        createdAt: new Date("2026-10-08T15:30:00Z"),
        company: "Bayou Freight Co",
        industry: "Transportation & logistics",
        companySize: "11-50",
        level: 2,
        global: 51,
        isDemo: true,
      },
    ]);
  });

  it("fails loudly on a malformed row instead of showing broken data", async () => {
    const source = reader({ list: vi.fn(async () => [{ ...fullRow, level: 7 }]) });
    await expect(listDiagnostics(source)).rejects.toThrow();
  });
});

describe("getDiagnostic", () => {
  it("returns the full diagnostic for an existing id", async () => {
    const detail = await getDiagnostic(reader(), ID);
    expect(detail).toMatchObject({
      id: ID,
      contactName: "Alex Rivera",
      email: "alex@example.com",
      answers: fullRow.answers,
      score: { dimensions: scores.dimensions, global: 51, level: 2 },
      isDemo: true,
    });
  });

  it("includes the AI report when the row has a valid one", async () => {
    const source = reader({ getById: vi.fn(async () => ({ ...fullRow, report })) });
    expect((await getDiagnostic(source, ID))?.report).toEqual(report);
  });

  it("has report null when the row has none", async () => {
    expect((await getDiagnostic(reader(), ID))?.report).toBeNull();
  });

  it("treats a report that does not validate as missing, and still shows the diagnostic", async () => {
    const broken = { ...report, useCases: [useCase] };
    const source = reader({ getById: vi.fn(async () => ({ ...fullRow, report: broken })) });
    const detail = await getDiagnostic(source, ID);
    expect(detail?.report).toBeNull();
    expect(detail?.contactName).toBe("Alex Rivera");
  });

  it("fails loudly when the report column was not selected", async () => {
    const withoutReport: Record<string, unknown> = { ...fullRow };
    delete withoutReport.report;
    const source = reader({ getById: vi.fn(async () => withoutReport) });
    await expect(getDiagnostic(source, ID)).rejects.toThrow();
  });

  it("returns null when no row is visible (missing, or hidden by RLS)", async () => {
    expect(await getDiagnostic(reader({ getById: vi.fn(async () => null) }), ID)).toBeNull();
  });

  it("returns null for an invalid id without querying the database", async () => {
    const source = reader();
    expect(await getDiagnostic(source, "../etc/passwd")).toBeNull();
    expect(source.getById).not.toHaveBeenCalled();
  });
});
