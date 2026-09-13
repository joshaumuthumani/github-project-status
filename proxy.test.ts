import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { proxy } from "./proxy";

function requestTo(path: string, cookieValue?: string) {
  const headers: Record<string, string> = {};
  if (cookieValue !== undefined) {
    headers.cookie = `dashboard_session=${cookieValue}`;
  }
  return new NextRequest(new URL(path, "http://localhost"), { headers });
}

beforeEach(() => {
  vi.stubEnv("DASHBOARD_BEARER_TOKEN", "correct-token");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy (bearer-token gate)", () => {
  it("passes /login through without a cookie", () => {
    const response = proxy(requestTo("/login"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("passes /api/login through without a cookie", () => {
    const response = proxy(requestTo("/api/login"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("passes through a page request with the correct session cookie", () => {
    const response = proxy(requestTo("/", "correct-token"));
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects an unauthenticated page request to /login", () => {
    const response = proxy(requestTo("/"));
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("returns 401 JSON for an unauthenticated API request", async () => {
    const response = proxy(requestTo("/api/portfolio"));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body).toEqual({ error: "Unauthorized" });
  });

  it("rejects a wrong session cookie value", () => {
    const response = proxy(requestTo("/", "wrong-value"));
    expect(response.status).toBe(307);
  });

  it("rejects every route when no bearer token is configured server-side", () => {
    vi.unstubAllEnvs();
    const response = proxy(requestTo("/", "anything"));
    expect(response.status).toBe(307);
  });
});
