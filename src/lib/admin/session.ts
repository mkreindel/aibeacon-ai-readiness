import "server-only";
import { redirect } from "next/navigation";
import { ADMIN_LOGIN } from "@/lib/admin/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Verifies the session on every admin page (the proxy alone is not enough, per the
// Next.js docs) and returns the user's client for reading under RLS.
export async function requirePanelClient() {
  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    redirect(ADMIN_LOGIN);
  }
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims) redirect(ADMIN_LOGIN);
  return supabase;
}
