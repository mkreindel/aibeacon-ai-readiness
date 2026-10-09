"use server";

import { redirect } from "next/navigation";
import { ADMIN_LOGIN } from "@/lib/admin/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Server Action, so it only runs on a POST from the sign-out form.
export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect(ADMIN_LOGIN);
}
