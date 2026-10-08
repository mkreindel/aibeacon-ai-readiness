// Admin panel paths and the redirect rule the proxy applies before rendering.

export const ADMIN_HOME = "/admin";
export const ADMIN_LOGIN = "/admin/login";

// Where to send a request to an admin path, or null to let it through.
// This is a convenience for navigation; every page also checks the session itself.
export function adminRedirectFor(pathname: string, hasSession: boolean): string | null {
  const isLogin = pathname === ADMIN_LOGIN;
  if (!hasSession && !isLogin) return ADMIN_LOGIN;
  if (hasSession && isLogin) return ADMIN_HOME;
  return null;
}
