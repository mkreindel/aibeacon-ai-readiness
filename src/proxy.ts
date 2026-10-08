import type { NextRequest } from "next/server";
import { updateAdminSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  return updateAdminSession(request);
}

// Only the admin panel uses sessions; public pages skip the proxy.
export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
