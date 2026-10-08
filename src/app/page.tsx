import Link from "next/link";
import { DIMENSION_LABELS } from "@/lib/questions";
import { DIMENSIONS } from "@/lib/scoring";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-6 py-16">
      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">AI Beacon</p>
        <h1 className="text-4xl font-semibold tracking-tight">AI Readiness Diagnostic</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Find out where your business stands with AI and what to do first. Answer 15 questions
          in about 5 minutes. No sign-up needed.
        </p>
      </div>

      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-medium text-zinc-500">You will get</h2>
        <ul className="list-disc pl-5 text-zinc-700 dark:text-zinc-300">
          <li>Your AI maturity level, from 1 to 3</li>
          <li>A score for each area: {DIMENSIONS.map((d) => DIMENSION_LABELS[d]).join(", ")}</li>
        </ul>
      </div>

      <Link
        href="/diagnostic"
        className="self-start rounded-md bg-zinc-900 px-5 py-3 font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Start the diagnostic
      </Link>
    </main>
  );
}
