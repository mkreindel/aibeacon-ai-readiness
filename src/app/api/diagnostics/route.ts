import "server-only";
import { createSupabaseDiagnosticsStore } from "@/lib/server/supabase-admin";
import { submitDiagnostic, type DiagnosticsStore } from "@/lib/server/submit-diagnostic";

// POST /api/diagnostics: validates, rate-limits, scores and saves a visitor's diagnostic.
export async function POST(request: Request) {
  const salt = process.env.IP_HASH_SALT;
  let store: DiagnosticsStore;
  try {
    if (!salt) throw new Error("IP_HASH_SALT is missing");
    store = createSupabaseDiagnosticsStore();
  } catch {
    console.error("diagnostics route misconfigured: missing server environment variables");
    return Response.json(
      { error: "Could not save your diagnostic. Please try again." },
      { status: 500 },
    );
  }

  return submitDiagnostic(request, { store, salt, logger: console, now: () => new Date() });
}
