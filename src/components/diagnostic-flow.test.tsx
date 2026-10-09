// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DiagnosticFlow } from "@/components/diagnostic-flow";
import { QUESTIONS } from "@/lib/questions";
import type { Report } from "@/lib/report";
import { DIMENSIONS, scoreDiagnostic, type Answers, type AnswerValue, type Dimension } from "@/lib/scoring";

const useCase = {
  title: "Automate the weekly sales report",
  why: "Totals are copied by hand each week.",
  effort: "low",
  risk: "low",
  firstStep: "Export one week of register data.",
} as const;

const REPORT: Report = {
  summary: "Your data is organized. Governance is the area to strengthen first.",
  useCases: [useCase, { ...useCase, title: "Draft supplier emails" }, { ...useCase, title: "Tag tickets" }],
  nextStep: "Write down who may use AI tools and with which data.",
};

// Fake server: scores the posted answers like the real route does and returns a report.
const fetchMock = vi.fn(async (_url: string, init?: RequestInit) => {
  const body = JSON.parse(String(init?.body));
  return Response.json({ score: scoreDiagnostic(body.answers), report: REPORT }, { status: 201 });
});

beforeEach(() => {
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function setup() {
  const user = userEvent.setup();
  render(<DiagnosticFlow />);
  return user;
}

async function fillCompany(user: UserEvent) {
  await user.selectOptions(screen.getByLabelText("Industry"), "Retail");
  await user.click(screen.getByRole("radio", { name: "11-50 employees" }));
  await user.click(screen.getByRole("button", { name: "Continue" }));
}

async function answerDimension(user: UserEvent, dimension: Dimension, values: AnswerValue[]) {
  for (const [index, value] of values.entries()) {
    const question = QUESTIONS[dimension][index];
    const group = screen.getByRole("group", { name: question.text });
    const option = question.options[value];
    await user.click(within(group).getByRole("radio", { name: option }));
  }
}

async function answerAll(user: UserEvent, value: AnswerValue) {
  for (const dimension of DIMENSIONS) {
    await answerDimension(user, dimension, [value, value, value]);
    await user.click(screen.getByRole("button", { name: "Continue" }));
  }
}

async function fillContact(user: UserEvent) {
  await user.type(screen.getByLabelText("Your name"), "Jane Doe");
  await user.type(screen.getByLabelText("Work email"), "jane@example.com");
  await user.type(screen.getByLabelText("Company"), "Acme");
}

describe("DiagnosticFlow", () => {
  it("starts with the company step and requires industry and size", async () => {
    const user = setup();
    const next = screen.getByRole("button", { name: "Continue" });
    expect(next).toBeDisabled();

    await user.selectOptions(screen.getByLabelText("Industry"), "Healthcare");
    expect(next).toBeDisabled();

    await user.click(screen.getByRole("radio", { name: "1-10 employees" }));
    expect(next).toBeEnabled();
  });

  it("offers every industry and size from the spec", () => {
    setup();
    const industry = screen.getByLabelText("Industry");
    expect(within(industry).getAllByRole("option")).toHaveLength(12); // placeholder + 11
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("shows one dimension per screen with progress, and needs its 3 answers", async () => {
    const user = setup();
    await fillCompany(user);

    expect(screen.getByRole("heading", { name: "Data" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByText("Section 1 of 5")).toBeInTheDocument();

    const next = screen.getByRole("button", { name: "Continue" });
    await answerDimension(user, "data", [1, 2]);
    expect(next).toBeDisabled();

    await answerDimension(user, "data", [1, 2, 0]);
    expect(next).toBeEnabled();
    await user.click(next);

    expect(screen.getByRole("heading", { name: "Processes" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
  });

  it("keeps answers when going back", async () => {
    const user = setup();
    await fillCompany(user);
    await answerDimension(user, "data", [3, 2, 1]);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(screen.getByRole("button", { name: "Back" }));

    const group = screen.getByRole("group", { name: QUESTIONS.data[0].text });
    expect(within(group).getByRole("radio", { name: QUESTIONS.data[0].options[3] })).toBeChecked();
  });

  it("cannot be submitted without consent", async () => {
    const user = setup();
    await fillCompany(user);
    await answerAll(user, 1);
    await fillContact(user);

    const submit = screen.getByRole("button", { name: "See my results" });
    expect(submit).toBeDisabled();

    await user.click(screen.getByRole("checkbox"));
    expect(submit).toBeEnabled();
  });

  it("requires a valid email", async () => {
    const user = setup();
    await fillCompany(user);
    await answerAll(user, 1);
    await user.type(screen.getByLabelText("Your name"), "Jane Doe");
    await user.type(screen.getByLabelText("Work email"), "not-an-email");
    await user.type(screen.getByLabelText("Company"), "Acme");
    await user.click(screen.getByRole("checkbox"));

    expect(screen.getByRole("button", { name: "See my results" })).toBeDisabled();
  });

  it("shows level, global score and a score per dimension at the end", async () => {
    const user = setup();
    await fillCompany(user);
    await answerAll(user, 3);
    await fillContact(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "See my results" }));

    expect(await screen.findByRole("heading", { name: "Level 3: Governed AI" })).toBeInTheDocument();
    expect(screen.getByText("Overall score: 100 / 100")).toBeInTheDocument();
    const scores = screen.getByRole("list", { name: "Score by area" });
    expect(within(scores).getAllByRole("listitem")).toHaveLength(5);
    expect(within(scores).getByText("Governance")).toBeInTheDocument();
  });

  it("caps the level at 2 when governance is low", async () => {
    const user = setup();
    await fillCompany(user);
    for (const dimension of DIMENSIONS) {
      const value: AnswerValue = dimension === "governance" ? 0 : 3;
      await answerDimension(user, dimension, [value, value, value]);
      await user.click(screen.getByRole("button", { name: "Continue" }));
    }
    await fillContact(user);
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: "See my results" }));

    // (100 * 4 + 0) / 5 = 80, but governance 0 keeps it at level 2
    expect(await screen.findByText("Overall score: 80 / 100")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Level 2: Team methodology" })).toBeInTheDocument();
  });
});

describe("DiagnosticFlow submission", () => {
  async function reachContact(user: UserEvent) {
    await fillCompany(user);
    await answerAll(user, 2);
    await fillContact(user);
    await user.click(screen.getByRole("checkbox"));
  }

  it("posts the visitor's data to /api/diagnostics", async () => {
    const user = setup();
    await reachContact(user);
    await user.click(screen.getByRole("button", { name: "See my results" }));
    await screen.findByRole("heading", { name: /^Level/ });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/diagnostics");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      industry: "Retail",
      companySize: "11-50",
      answers: Object.fromEntries(DIMENSIONS.map((dimension) => [dimension, [2, 2, 2]])),
      contact: { name: "Jane Doe", email: "jane@example.com", company: "Acme" },
      consent: true,
    });
  });

  it("shows the score returned by the server", async () => {
    fetchMock.mockImplementationOnce(async () =>
      Response.json(
        {
          score: {
            dimensions: { data: 11, processes: 22, tools: 33, team: 44, governance: 56 },
            global: 33,
            level: 1,
          },
        },
        { status: 201 },
      ),
    );
    const user = setup();
    await reachContact(user);
    await user.click(screen.getByRole("button", { name: "See my results" }));

    expect(await screen.findByRole("heading", { name: "Level 1: Individual use" })).toBeInTheDocument();
    expect(screen.getByText("Overall score: 33 / 100")).toBeInTheDocument();
  });

  it("shows a saving state and cannot be submitted twice", async () => {
    let respond: (response: Response) => void = () => {};
    fetchMock.mockImplementationOnce(
      () => new Promise<Response>((resolve) => (respond = resolve)),
    );
    const user = setup();
    await reachContact(user);
    await user.click(screen.getByRole("button", { name: "See my results" }));

    const saving = screen.getByRole("button", { name: "Preparing your report…" });
    expect(saving).toBeDisabled();
    await user.click(saving);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const twos: Answers = {
      data: [2, 2, 2],
      processes: [2, 2, 2],
      tools: [2, 2, 2],
      team: [2, 2, 2],
      governance: [2, 2, 2],
    };
    respond(Response.json({ score: scoreDiagnostic(twos), report: REPORT }, { status: 201 }));
    expect(await screen.findByRole("heading", { name: /^Level/ })).toBeInTheDocument();
  });

  it("shows the AI report below the scores", async () => {
    const user = setup();
    await reachContact(user);
    await user.click(screen.getByRole("button", { name: "See my results" }));

    expect(await screen.findByRole("heading", { name: "Your AI report" })).toBeInTheDocument();
    expect(screen.getByText(REPORT.summary)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Draft supplier emails" })).toBeInTheDocument();
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("shows the result with a notice when the report could not be generated", async () => {
    fetchMock.mockImplementationOnce(async (_url: string, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      return Response.json({ score: scoreDiagnostic(body.answers), report: null }, { status: 201 });
    });
    const user = setup();
    await reachContact(user);
    await user.click(screen.getByRole("button", { name: "See my results" }));

    expect(await screen.findByRole("heading", { name: /^Level/ })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "Score by area" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "We couldn't generate your personalized report right now. Your scores above are saved.",
    );
    expect(screen.queryByRole("heading", { name: "Your AI report" })).not.toBeInTheDocument();
  });

  it("asks the visitor to wait when the server rate-limits the submission", async () => {
    fetchMock.mockImplementationOnce(async () =>
      Response.json({ error: "Too many submissions." }, { status: 429 }),
    );
    const user = setup();
    await reachContact(user);
    await user.click(screen.getByRole("button", { name: "See my results" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "You've sent several diagnostics in a short time. Please wait a while and try again.",
    );
    expect(screen.getByLabelText("Your name")).toHaveValue("Jane Doe");
    expect(screen.getByRole("button", { name: "See my results" })).toBeEnabled();
  });

  it.each([
    ["a server error", async () => Response.json({ error: "x" }, { status: 500 })],
    ["a validation error", async () => Response.json({ error: "x" }, { status: 400 })],
    ["a network failure", async () => Promise.reject(new TypeError("Failed to fetch"))],
  ])("shows a generic error for %s and lets the visitor retry", async (_, failure) => {
    fetchMock.mockImplementationOnce(failure as () => Promise<Response>);
    const user = setup();
    await reachContact(user);
    await user.click(screen.getByRole("button", { name: "See my results" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("We couldn't save your diagnostic. Please try again.");
    expect(alert).not.toHaveTextContent(/wait a while/);

    await user.click(screen.getByRole("button", { name: "See my results" }));
    expect(await screen.findByRole("heading", { name: /^Level/ })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
