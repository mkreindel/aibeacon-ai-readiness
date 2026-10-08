import type { Metadata } from "next";
import { DiagnosticFlow } from "@/components/diagnostic-flow";

export const metadata: Metadata = {
  title: "Take the diagnostic | AI Beacon",
};

export default function DiagnosticPage() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-8 px-6 py-12">
      <h1 className="text-sm font-medium uppercase tracking-wide text-zinc-500">
        AI Readiness Diagnostic
      </h1>
      <DiagnosticFlow />
    </main>
  );
}
