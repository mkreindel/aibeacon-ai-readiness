// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import Home from "@/app/page";

it("is a landing, not a login, and links to the diagnostic", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { level: 1, name: "AI Readiness Diagnostic" })).toBeInTheDocument();
  expect(screen.getByText(/about 5 minutes/)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "Start the diagnostic" })).toHaveAttribute(
    "href",
    "/diagnostic",
  );
  expect(screen.queryByLabelText(/password/i)).not.toBeInTheDocument();
});
