import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Supabase client for Server Components and Server Actions, acting as the signed-in user.
// It uses the publishable key plus the user's session cookies, so RLS decides what each
// panel user can read. Pattern from Supabase's Next.js server-side auth guide.
export async function createSupabaseServerClient() {
  // Read cookies first: it marks every caller as dynamic (rendered per request),
  // even when configuration is missing and we throw below.
  const cookieStore = await cookies();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error("Supabase configuration is missing");
  }

  return createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component, which cannot set cookies.
          // The proxy refreshes the session, so this can be ignored.
        }
      },
    },
  });
}
