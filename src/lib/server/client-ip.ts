import { createHmac } from "node:crypto";

// Key used when the request carries no client IP header. Those requests share one
// rate-limit bucket instead of bypassing the limit.
export const MISSING_IP_KEY = "unknown";

// First address of x-forwarded-for, which proxies append to.
// Whether the hosting platform guarantees this header is checked in phase 5 (ADR).
export function getClientIp(headers: Headers): string | null {
  const first = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return first ? first : null;
}

// Keyed hash (HMAC-SHA256) so stored values cannot be reversed without the secret salt.
export function hashIp(ip: string, salt: string): string {
  return createHmac("sha256", salt).update(ip).digest("hex");
}
