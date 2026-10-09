import type { Metadata } from "next";
import { DiagnosticsTable } from "@/components/admin/diagnostics-table";
import { listDiagnostics } from "@/lib/admin/diagnostics";
import { requirePanelClient } from "@/lib/admin/session";
import { createDiagnosticsReader } from "@/lib/admin/supabase-reader";

export const metadata: Metadata = { title: "Diagnostics | AI Beacon admin" };

export default async function DiagnosticsPage() {
  const supabase = await requirePanelClient();
  const items = await listDiagnostics(createDiagnosticsReader(supabase));
  return (
    <main className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Diagnostics</h1>
      <DiagnosticsTable items={items} />
    </main>
  );
}
