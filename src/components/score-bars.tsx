import { DIMENSION_LABELS } from "@/lib/questions";
import { DIMENSIONS, type Dimension } from "@/lib/scoring";

// Horizontal bar per dimension, shared by the visitor result and the admin detail.
export function ScoreBars({ dimensions }: { dimensions: Record<Dimension, number> }) {
  return (
    <ul aria-label="Score by area" className="flex flex-col gap-3">
      {DIMENSIONS.map((dimension) => (
        <li key={dimension} className="flex flex-col gap-1">
          <div className="flex justify-between text-sm">
            <span>{DIMENSION_LABELS[dimension]}</span>
            <span>{dimensions[dimension]}</span>
          </div>
          <div aria-hidden="true" className="h-3 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className="h-full rounded-full bg-zinc-900 dark:bg-zinc-100"
              style={{ width: `${dimensions[dimension]}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
