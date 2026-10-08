import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { adminRedirectFor } from "@/lib/admin/routes";

// Refreshes the Supabase session on admin requests and redirects based on it.
// Session refresh follows Supabase's Next.js server-side auth guide.
export async function updateAdminSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    // Without configuration nobody can sign in; send everyone to the login page.
    const target = adminRedirectFor(request.nextUrl.pathname, false);
    return target ? NextResponse.redirect(new URL(target, request.url)) : response;
  }

  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Keep getClaims() right after creating the client (Supabase guide): it refreshes the token.
  const { data, error } = await supabase.auth.getClaims();
  const hasSession = !error && Boolean(data?.claims);

  const target = adminRedirectFor(request.nextUrl.pathname, hasSession);
  if (!target) return response;

  const redirect = NextResponse.redirect(new URL(target, request.url));
  // Carry over any refreshed session cookies.
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}
