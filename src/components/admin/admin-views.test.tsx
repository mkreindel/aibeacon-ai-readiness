// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DiagnosticDetail } from "@/components/admin/diagnostic-detail";
import { DiagnosticsTable } from "@/components/admin/diagnostics-table";
import type { DiagnosticDetail as Detail, DiagnosticSummary } from "@/lib/admin/diagnostics";
import { QUESTIONS } from "@/lib/questions";
import type { Report } from "@/lib/report";

const ID = "3f1c2a9e-1b2c-4d3e-8f40-123456789abc";

const summary: DiagnosticSummary = {
  id: ID,
  createdAt: new Date("2026-10-08T15:30:00Z"),
  company: "Bayou Freight Co",
  industry: "Transportation & logistics",
  companySize: "11-50",
  level: 2,
  global: 51,
  isDemo: true,
};

describe("DiagnosticsTable", () => {
  it("shows an empty state", () => {
    render(<DiagnosticsTable items={[]} />);
    expect(screen.getByText("No diagnostics yet.")).toBeInTheDocument();
  });

  it("lists each diagnostic with a link to its detail, in Houston time", () => {
    render(<DiagnosticsTable items={[summary]} />);
    const row = screen.getAllByRole("row")[1];
    expect(within(row).getByRole("link", { name: "Bayou Freight Co" })).toHaveAttribute("href", `/admin/${ID}`);
    // 15:30 UTC is 10:30 AM in Houston (CDT, UTC-5) on Oct 8, 2026
    expect(within(row).getByText(/Oct 8, 2026.*10:30/)).toBeInTheDocument();
    expect(within(row).getByText("2: Team methodology")).toBeInTheDocument();
    expect(within(row).getByText("(sample)")).toBeInTheDocument();
  });
});

describe("DiagnosticDetail", () => {
  const detail: Detail = {
    id: ID,
    createdAt: summary.createdAt,
    company: summary.company,
    industry: summary.industry,
    companySize: summary.companySize,
    isDemo: false,
    contactName: "Alex Rivera",
    email: "alex@example.com",
    answers: {
      data: [3, 3, 3],
      processes: [2, 2, 2],
      tools: [1, 1, 1],
      team: [0, 0, 0],
      governance: [2, 2, 1],
    },
    score: {
      dimensions: { data: 100, processes: 67, tools: 33, team: 0, governance: 56 },
      global: 51,
      level: 2,
    },
    report: null,
  };

  const useCase = {
    title: "Route planning from delivery spreadsheets",
    why: "Dispatchers plan routes by hand every morning.",
    effort: "medium",
    risk: "low",
    firstStep: "Export one week of delivery addresses.",
  } as const;

  const report: Report = {
    summary: "Your data is solid. Your team is the area to strengthen first.",
    useCases: [useCase, { ...useCase, title: "Invoice data entry" }, { ...useCase, title: "Fuel log checks" }],
    nextStep: "Pick one dispatcher to pilot a route planning tool.",
  };

  it("shows contact, level, scores and the chosen option for every question", () => {
    render(<DiagnosticDetail diagnostic={detail} />);
    expect(screen.getByText("alex@example.com")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Level 2: Team methodology" })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Score by area" })).getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByText(`${QUESTIONS.data[0].options[3]} (3/3)`)).toBeInTheDocument();
    expect(screen.getByText(`${QUESTIONS.governance[2].options[1]} (1/3)`)).toBeInTheDocument();
    expect(screen.queryByText(/Sample data/)).not.toBeInTheDocument();
  });

  it("shows the AI report when the diagnostic has one", () => {
    render(<DiagnosticDetail diagnostic={{ ...detail, report }} />);
    expect(screen.getByRole("heading", { name: "AI report" })).toBeInTheDocument();
    expect(screen.getByText(report.summary)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Invoice data entry" })).toBeInTheDocument();
    expect(screen.queryByText("No AI report for this diagnostic.")).not.toBeInTheDocument();
  });

  it("says there is no AI report when the diagnostic has none", () => {
    render(<DiagnosticDetail diagnostic={detail} />);
    expect(screen.getByRole("heading", { name: "AI report" })).toBeInTheDocument();
    expect(screen.getByText("No AI report for this diagnostic.")).toBeInTheDocument();
  });
});
