// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const getById = vi.fn();
vi.mock("@/lib/admin/session", () => ({
  requirePanelClient: vi.fn(async () => ({})),
}));
vi.mock("@/lib/admin/supabase-reader", () => ({
  createDiagnosticsReader: vi.fn(() => ({ list: vi.fn(), getById })),
}));
vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const { default: DiagnosticPage } = await import("@/app/admin/(panel)/[id]/page");
const { notFound } = await import("next/navigation");

const ID = "3f1c2a9e-1b2c-4d3e-8f40-123456789abc";
const page = (id: string) =>
  DiagnosticPage({ params: Promise.resolve({ id }) } as Parameters<typeof DiagnosticPage>[0]);

beforeEach(() => {
  getById.mockReset();
  vi.mocked(notFound).mockClear();
});

describe("/admin/[id]", () => {
  it("responds 404 when no row comes back (missing id, or a demo user asking for a real one)", async () => {
    getById.mockResolvedValue(null);
    await expect(page(ID)).rejects.toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledTimes(1);
  });

  it("responds 404 for an id that is not a UUID, without querying", async () => {
    await expect(page("not-a-uuid")).rejects.toThrow("NEXT_NOT_FOUND");
    expect(getById).not.toHaveBeenCalled();
  });

  it("renders the diagnostic when the row is visible", async () => {
    getById.mockResolvedValue({
      id: ID,
      created_at: "2026-10-08T15:30:00+00:00",
      company: "Bayou Freight Co",
      contact_name: "Alex Rivera",
      email: "alex@example.com",
      industry: "Retail",
      company_size: "1-10",
      answers: {
        data: [3, 3, 3],
        processes: [2, 2, 2],
        tools: [1, 1, 1],
        team: [0, 0, 0],
        governance: [2, 2, 1],
      },
      scores: { dimensions: { data: 100, processes: 67, tools: 33, team: 0, governance: 56 }, global: 51 },
      level: 2,
      report: null,
      is_demo: false,
    });
    render(await page(ID));
    expect(screen.getByRole("heading", { level: 1, name: "Bayou Freight Co" })).toBeInTheDocument();
    expect(notFound).not.toHaveBeenCalled();
  });
});
