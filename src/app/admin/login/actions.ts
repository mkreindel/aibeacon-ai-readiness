"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { ADMIN_HOME } from "@/lib/admin/routes";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface LoginState {
  error: string | null;
}

const credentialsSchema = z.object({
  email: z.string().trim().max(320).pipe(z.email()),
  password: z.string().min(1).max(200),
});

export async function login(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email") ?? "",
    password: formData.get("password") ?? "",
  });
  if (!parsed.success) {
    return { error: "Enter a valid email and your password." };
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch {
    return { error: "Sign-in is unavailable right now. Please try again later." };
  }

  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    // Same message for unknown email and wrong password.
    return { error: "Invalid email or password." };
  }

  redirect(ADMIN_HOME);
}
