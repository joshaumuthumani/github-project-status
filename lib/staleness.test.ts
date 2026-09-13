import { describe, expect, it } from "vitest";
import { isStale, STALE_THRESHOLD_DAYS } from "./staleness";

describe("isStale", () => {
  const now = new Date("2026-09-13T00:00:00Z");

  it("is not stale just under the threshold", () => {
    const pushedAt = new Date(now.getTime() - (STALE_THRESHOLD_DAYS - 1) * 24 * 60 * 60 * 1000).toISOString();
    expect(isStale(pushedAt, now)).toBe(false);
  });

  it("is stale exactly at the threshold", () => {
    const pushedAt = new Date(now.getTime() - STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000).toISOString();
    expect(isStale(pushedAt, now)).toBe(true);
  });

  it("is stale well past the threshold", () => {
    const pushedAt = new Date(now.getTime() - 94 * 24 * 60 * 60 * 1000).toISOString();
    expect(isStale(pushedAt, now)).toBe(true);
  });

  it("is not stale for recent activity", () => {
    const pushedAt = new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString();
    expect(isStale(pushedAt, now)).toBe(false);
  });
});
