// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReportView } from "@/components/report-view";
import type { Report } from "@/lib/report";

const report: Report = {
  summary: "Your data is organized. Governance is the area to strengthen first.",
  useCases: [
    {
      title: "Automate the weekly sales report",
      why: "Totals are copied by hand from the register each week.",
      effort: "low",
      risk: "low",
      firstStep: "Export one week of register data.",
    },
    {
      title: "Draft supplier emails",
      why: "Buyers write the same reorder emails every week.",
      effort: "medium",
      risk: "medium",
      firstStep: "Collect five recent reorder emails as examples.",
    },
    {
      title: "Classify support tickets",
      why: "Tickets pile up without a category.",
      effort: "high",
      risk: "low",
      firstStep: "Tag last month's tickets by hand to define categories.",
    },
  ],
  nextStep: "Write down who may use AI tools and with which data.",
};

describe("ReportView", () => {
  it("shows the summary and the next step", () => {
    render(<ReportView report={report} />);
    expect(screen.getByText(report.summary)).toBeInTheDocument();
    expect(screen.getByText(report.nextStep)).toBeInTheDocument();
    expect(screen.getByText("Next step")).toBeInTheDocument();
  });

  it("lists the 3 use cases in order with why, effort, risk and first step", () => {
    render(<ReportView report={report} />);
    const items = within(screen.getByRole("list", { name: "Recommended use cases" })).getAllByRole(
      "listitem",
    );
    expect(items).toHaveLength(3);

    const second = items[1];
    expect(within(second).getByRole("heading", { name: "Draft supplier emails" })).toBeInTheDocument();
    expect(within(second).getByText(report.useCases[1].why)).toBeInTheDocument();
    expect(within(second).getByText("Effort: medium")).toBeInTheDocument();
    expect(within(second).getByText("Risk: medium")).toBeInTheDocument();
    expect(within(second).getByText(report.useCases[1].firstStep)).toBeInTheDocument();

    expect(within(items[2]).getByText("Effort: high")).toBeInTheDocument();
    expect(within(items[2]).getByText("Risk: low")).toBeInTheDocument();
  });

  it("renders the model's text as plain text, never as HTML", () => {
    const html = { ...report, summary: '<img src=x onerror="alert(1)">' };
    const { container } = render(<ReportView report={html} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText(html.summary)).toBeInTheDocument();
  });
});
