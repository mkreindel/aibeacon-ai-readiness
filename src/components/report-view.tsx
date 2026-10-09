import type { Report } from "@/lib/report";

// AI report, shared by the visitor result and the admin detail.
// Text from the model is rendered as plain text by React, never as HTML.
// The ordered list carries the priority order, so titles are not numbered.
export function ReportView({ report }: { report: Report }) {
  return (
    <div className="flex flex-col gap-5">
      <p>{report.summary}</p>
      <ol aria-label="Recommended use cases" className="flex flex-col gap-4">
        {report.useCases.map((useCase, index) => (
          <li
            key={index}
            className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <h3 className="font-semibold">{useCase.title}</h3>
            <p className="text-sm">{useCase.why}</p>
            <p className="flex gap-2 text-xs">
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                Effort: {useCase.effort}
              </span>
              <span className="rounded-full bg-zinc-100 px-2 py-0.5 dark:bg-zinc-800">
                Risk: {useCase.risk}
              </span>
            </p>
            <p className="text-sm">
              <span className="font-medium">First step: </span>
              <span>{useCase.firstStep}</span>
            </p>
          </li>
        ))}
      </ol>
      <div className="flex flex-col gap-1">
        <h3 className="font-semibold">Next step</h3>
        <p>{report.nextStep}</p>
      </div>
    </div>
  );
}
