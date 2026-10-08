import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { signInWithPassword } })),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

const { login } = await import("@/app/admin/login/actions");
const { createSupabaseServerClient } = await import("@/lib/supabase/server");

function form(fields: Record<string, string>) {
  const data = new FormData();
  Object.entries(fields).forEach(([key, value]) => data.set(key, value));
  return data;
}

beforeEach(() => {
  signInWithPassword.mockReset();
  vi.mocked(createSupabaseServerClient).mockClear();
});

describe("login action", () => {
  it("redirects to the panel after a successful sign-in", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    await expect(
      login({ error: null }, form({ email: " demo@example.com ", password: "secret" })),
    ).rejects.toThrow("REDIRECT:/admin");
    expect(signInWithPassword).toHaveBeenCalledWith({ email: "demo@example.com", password: "secret" });
  });

  it("returns a generic error when Supabase rejects the credentials", async () => {
    signInWithPassword.mockResolvedValue({ error: { message: "Invalid login credentials" } });
    const state = await login({ error: null }, form({ email: "demo@example.com", password: "wrong" }));
    expect(state).toEqual({ error: "Invalid email or password." });
  });

  it.each([
    ["an invalid email", { email: "nope", password: "secret" }],
    ["an empty password", { email: "demo@example.com", password: "" }],
    ["missing fields", {}],
  ])("rejects %s without calling Supabase", async (_, fields) => {
    const state = await login({ error: null }, form(fields));
    expect(state).toEqual({ error: "Enter a valid email and your password." });
    expect(signInWithPassword).not.toHaveBeenCalled();
  });

  it("reports sign-in as unavailable when Supabase is not configured", async () => {
    vi.mocked(createSupabaseServerClient).mockRejectedValueOnce(new Error("missing config"));
    const state = await login({ error: null }, form({ email: "demo@example.com", password: "secret" }));
    expect(state).toEqual({ error: "Sign-in is unavailable right now. Please try again later." });
  });
});
