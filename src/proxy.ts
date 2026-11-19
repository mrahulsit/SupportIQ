import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const originCache = new Map<string, { origins: string[] | null; expires: number }>();

/** Looks up a bot's allowed embed origins (cached for 60s). null = unknown bot. */
async function allowedOrigins(req: NextRequest, key: string) {
  const hit = originCache.get(key);
  if (hit && hit.expires > Date.now()) return hit.origins;
  const res = await fetch(new URL(`/api/widget/${encodeURIComponent(key)}/config`, req.nextUrl.origin));
  const origins = res.ok ? ((await res.json()).allowedOrigins as string[]) : null;
  originCache.set(key, { origins, expires: Date.now() + 60_000 });
  return origins;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Optimistic auth gate for the dashboard; pages re-check via the data access layer.
  if (pathname.startsWith("/dashboard")) {
    const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
    if (!session) {
      const url = new URL("/login", req.url);
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // The widget iframe may only be embedded by the bot's allowed sites.
  if (pathname.startsWith("/embed/")) {
    const key = pathname.split("/")[2] ?? "";
    const res = NextResponse.next();
    try {
      const origins = await allowedOrigins(req, key);
      // No allow-list → embeddable anywhere. We deliberately send no header here:
      // `frame-ancestors *` only matches http(s) pages, so it would block local
      // test pages opened from disk (file://) and other non-network schemes.
      if (origins && origins.length > 0) {
        res.headers.set("Content-Security-Policy", `frame-ancestors 'self' ${origins.join(" ")}`);
      }
    } catch {
      res.headers.set("Content-Security-Policy", "frame-ancestors 'self'");
    }
    return res;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/embed/:path*"],
};
