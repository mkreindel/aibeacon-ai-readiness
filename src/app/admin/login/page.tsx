import type { Metadata } from "next";
import { LoginForm } from "@/app/admin/login/login-form";

export const metadata: Metadata = { title: "Sign in | AI Beacon admin" };

// Signed-in users are sent to the panel by the proxy.
export default function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-2xl font-semibold">AI Beacon admin</h1>
      <LoginForm />
    </main>
  );
}
