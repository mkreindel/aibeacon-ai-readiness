import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DiagnosticDetail } from "@/components/admin/diagnostic-detail";
import { getDiagnostic } from "@/lib/admin/diagnostics";
import { requirePanelClient } from "@/lib/admin/session";
import { createDiagnosticsReader } from "@/lib/admin/supabase-reader";

export const metadata: Metadata = { title: "Diagnostic | AI Beacon admin" };

export default async function DiagnosticPage(props: PageProps<"/admin/[id]">) {
  const { id } = await props.params;
  const supabase = await requirePanelClient();
  const diagnostic = await getDiagnostic(createDiagnosticsReader(supabase), id);
  // No row: the id does not exist, or RLS hides it (a demo user asking for a real one).
  if (!diagnostic) notFound();
  return (
    <main>
      <DiagnosticDetail diagnostic={diagnostic} />
    </main>
  );
}
