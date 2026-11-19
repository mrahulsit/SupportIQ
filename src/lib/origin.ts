import "server-only";
import { headers } from "next/headers";

/**
 * Public origin of this deployment, used in embed snippets.
 * Derived from the request (so it's right on any domain/port, and a deployment
 * without NEXT_PUBLIC_APP_URL never hands out "localhost" snippets), with
 * NEXT_PUBLIC_APP_URL as the fallback.
 */
export async function publicOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (host) {
    const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
    const proto = h.get("x-forwarded-proto")?.split(",")[0] ?? (local ? "http" : "https");
    return `${proto}://${host}`;
  }
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
