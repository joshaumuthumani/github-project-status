import { NextRequest, NextResponse } from "next/server";
import { constantTimeEqual, SESSION_COOKIE } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const expected = process.env.DASHBOARD_BEARER_TOKEN;
  if (!expected) {
    return NextResponse.json(
      { error: "Server is not configured (missing DASHBOARD_BEARER_TOKEN)" },
      { status: 500 },
    );
  }

  const body = await request.json().catch(() => null);
  const token = typeof body?.token === "string" ? body.token : "";

  if (!token || !constantTimeEqual(token, expected)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, expected, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    // No expiry: matches the PRD's accepted residual risk (single static
    // long-lived bearer token, no rotation/session story for MVP).
  });
  return response;
}
