import Link from "next/link";
import type { DiagnosticSummary } from "@/lib/admin/diagnostics";
import { formatDate } from "@/lib/admin/format";
import { LEVEL_NAMES } from "@/lib/scoring";

export function DiagnosticsTable({ items }: { items: DiagnosticSummary[] }) {
  if (items.length === 0) {
    return <p className="text-zinc-600 dark:text-zinc-400">No diagnostics yet.</p>;
  }
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <caption className="sr-only">Diagnostics, newest first</caption>
        <thead className="border-b border-zinc-300 dark:border-zinc-700">
          <tr>
            <th scope="col" className="py-2 pr-4">Date</th>
            <th scope="col" className="py-2 pr-4">Company</th>
            <th scope="col" className="py-2 pr-4">Industry</th>
            <th scope="col" className="py-2 pr-4">Size</th>
            <th scope="col" className="py-2 pr-4">Level</th>
            <th scope="col" className="py-2">Score</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-zinc-200 dark:border-zinc-800">
              <td className="py-2 pr-4 whitespace-nowrap">{formatDate(item.createdAt)}</td>
              <td className="py-2 pr-4">
                <Link href={`/admin/${item.id}`} className="underline">
                  {item.company}
                </Link>
                {item.isDemo && <span className="ml-2 text-xs text-zinc-500">(sample)</span>}
              </td>
              <td className="py-2 pr-4">{item.industry}</td>
              <td className="py-2 pr-4 whitespace-nowrap">{item.companySize}</td>
              <td className="py-2 pr-4 whitespace-nowrap">
                {item.level}: {LEVEL_NAMES[item.level]}
              </td>
              <td className="py-2">{item.global}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
