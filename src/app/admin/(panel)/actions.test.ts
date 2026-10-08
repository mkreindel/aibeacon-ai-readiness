import { expect, it, vi } from "vitest";

const signOut = vi.fn(async () => ({ error: null }));
vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { signOut } })),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((path: string) => {
    throw new Error(`REDIRECT:${path}`);
  }),
}));

const { logout } = await import("@/app/admin/(panel)/actions");

it("signs out and sends the user to the login page", async () => {
  await expect(logout()).rejects.toThrow("REDIRECT:/admin/login");
  expect(signOut).toHaveBeenCalledTimes(1);
});
