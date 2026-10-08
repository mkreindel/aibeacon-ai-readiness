import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DiagnosticsReader } from "@/lib/admin/diagnostics";

const SUMMARY_COLUMNS = "id, created_at, company, industry, company_size, scores, level, is_demo";
const DETAIL_COLUMNS = `${SUMMARY_COLUMNS}, contact_name, email, answers`;

// Reads with the signed-in user's client, never the secret key, so RLS applies.
export function createDiagnosticsReader(supabase: SupabaseClient): DiagnosticsReader {
  return {
    async list(limit) {
      const { data, error } = await supabase
        .from("diagnostics")
        .select(SUMMARY_COLUMNS)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw new Error(`list failed: ${error.code}`);
      return data;
    },
    async getById(id) {
      const { data, error } = await supabase
        .from("diagnostics")
        .select(DETAIL_COLUMNS)
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(`get failed: ${error.code}`);
      return data;
    },
  };
}
