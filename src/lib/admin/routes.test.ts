import { describe, expect, it } from "vitest";
import { adminRedirectFor } from "@/lib/admin/routes";

describe("adminRedirectFor", () => {
  it.each([
    ["/admin", false, "/admin/login"],
    ["/admin/3f1c2a9e-0000-4000-8000-000000000000", false, "/admin/login"],
    ["/admin/login", false, null],
    ["/admin/login", true, "/admin"],
    ["/admin", true, null],
    ["/admin/3f1c2a9e-0000-4000-8000-000000000000", true, null],
  ])("%s with session=%s goes to %s", (pathname, hasSession, expected) => {
    expect(adminRedirectFor(pathname, hasSession)).toBe(expected);
  });
});
