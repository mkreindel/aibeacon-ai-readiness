import Link from "next/link";
import { ScoreBars } from "@/components/score-bars";
import type { DiagnosticDetail as Detail } from "@/lib/admin/diagnostics";
import { formatDate } from "@/lib/admin/format";
import { DIMENSION_LABELS, QUESTIONS } from "@/lib/questions";
import { DIMENSIONS, LEVEL_NAMES } from "@/lib/scoring";

export function DiagnosticDetail({ diagnostic }: { diagnostic: Detail }) {
  const { score } = diagnostic;
  return (
    <article className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Link href="/admin" className="text-sm underline">
          Back to all diagnostics
        </Link>
        <h1 className="text-2xl font-semibold">{diagnostic.company}</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          {formatDate(diagnostic.createdAt)}
          {diagnostic.isDemo && " · Sample data"}
        </p>
      </div>

      <section className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold">Contact</h2>
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          <dt className="text-zinc-500">Name</dt>
          <dd>{diagnostic.contactName}</dd>
          <dt className="text-zinc-500">Email</dt>
          <dd>{diagnostic.email}</dd>
          <dt className="text-zinc-500">Industry</dt>
          <dd>{diagnostic.industry}</dd>
          <dt className="text-zinc-500">Size</dt>
          <dd>{diagnostic.companySize} employees</dd>
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">
          Level {score.level}: {LEVEL_NAMES[score.level]}
        </h2>
        <p>Overall score: {score.global} / 100</p>
        <ScoreBars dimensions={score.dimensions} />
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Answers</h2>
        {DIMENSIONS.map((dimension) => (
          <div key={dimension} className="flex flex-col gap-2">
            <h3 className="font-medium">{DIMENSION_LABELS[dimension]}</h3>
            <ol className="flex list-decimal flex-col gap-1 pl-5 text-sm">
              {QUESTIONS[dimension].map((question, index) => {
                const value = diagnostic.answers[dimension][index];
                return (
                  <li key={question.id}>
                    <span className="text-zinc-600 dark:text-zinc-400">{question.text}</span>{" "}
                    <span>
                      {question.options[value]} ({value}/3)
                    </span>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}
      </section>
    </article>
  );
}
