import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "./route";

function loginRequest(token: unknown) {
  return new NextRequest("http://localhost/api/login", {
    method: "POST",
    body: JSON.stringify({ token }),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.stubEnv("DASHBOARD_BEARER_TOKEN", "correct-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/login", () => {
  it("rejects an incorrect token", async () => {
    const response = await POST(loginRequest("wrong-token"));
    expect(response.status).toBe(401);
  });

  it("rejects a missing token", async () => {
    const response = await POST(loginRequest(undefined));
    expect(response.status).toBe(401);
  });

  it("accepts the correct token and sets a session cookie", async () => {
    const response = await POST(loginRequest("correct-token"));
    expect(response.status).toBe(200);

    const cookie = response.cookies.get("dashboard_session");
    expect(cookie?.value).toBe("correct-token");
    expect(cookie?.httpOnly).toBe(true);
  });

  it("returns 500 when the server has no configured token", async () => {
    vi.unstubAllEnvs();
    const response = await POST(loginRequest("anything"));
    expect(response.status).toBe(500);
  });
});
