import { NextRequest, NextResponse } from "next/server";
import { constantTimeEqual, SESSION_COOKIE } from "@/lib/auth";

const PUBLIC_PATHS = new Set(["/login", "/api/login"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const expected = process.env.DASHBOARD_BEARER_TOKEN;
  const session = request.cookies.get(SESSION_COOKIE)?.value;
  const authorized = Boolean(expected) && Boolean(session) && constantTimeEqual(session!, expected!);

  if (authorized) {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    /*
     * Match every route except Next.js internals and static assets,
     * so the bearer-token gate covers pages, API routes, and any
     * default/health route (FR-8) with a single mechanism.
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
