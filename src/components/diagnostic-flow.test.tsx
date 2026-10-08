// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent, { type UserEvent } from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DiagnosticFlow } from "@/components/diagnostic-flow";
import { QUESTIONS } from "@/lib/questions";
import { DIMENSIONS, type AnswerValue, type Dimension } from "@/lib/scoring";

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

    expect(screen.getByRole("heading", { name: "Level 3: Governed AI" })).toBeInTheDocument();
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
    expect(screen.getByText("Overall score: 80 / 100")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Level 2: Team methodology" })).toBeInTheDocument();
  });
});
