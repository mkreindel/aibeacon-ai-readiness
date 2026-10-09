import "server-only";
import { createClient } from "@supabase/supabase-js";
import type { DiagnosticsStore } from "@/lib/server/submit-diagnostic";

// Server-side store backed by Supabase with the secret key, which bypasses RLS.
// The "server-only" import makes the build fail if this module reaches the browser.
export function createSupabaseDiagnosticsStore(): DiagnosticsStore {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!url || !secretKey) {
    throw new Error("Supabase server configuration is missing");
  }

  const supabase = createClient(url, secretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  return {
    async countSince(ipHash, since) {
      const { count, error } = await supabase
        .from("diagnostics")
        .select("id", { count: "exact", head: true })
        .eq("ip_hash", ipHash)
        .gte("created_at", since.toISOString());
      if (error) throw new Error(`count failed: ${error.code}`);
      return count ?? 0;
    },
    async insert(row) {
      const { error } = await supabase.from("diagnostics").insert(row);
      if (error) throw new Error(`insert failed: ${error.code}`);
    },
  };
}
