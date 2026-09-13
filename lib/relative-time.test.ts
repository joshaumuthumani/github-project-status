import { describe, expect, it } from "vitest";
import { formatRelativeTime } from "./relative-time";

describe("formatRelativeTime", () => {
  const now = new Date("2026-09-13T12:00:00Z");

  it("formats sub-minute as just now", () => {
    const iso = new Date(now.getTime() - 30 * 1000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe("just now");
  });

  it("formats minutes", () => {
    const iso = new Date(now.getTime() - 30 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe("30m ago");
  });

  it("formats hours", () => {
    const iso = new Date(now.getTime() - 5 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe("5h ago");
  });

  it("formats days", () => {
    const iso = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe("3d ago");
  });

  it("floors rather than rounds up near the hour boundary", () => {
    const iso = new Date(now.getTime() - 59.6 * 60 * 1000).toISOString();
    expect(formatRelativeTime(iso, now)).toBe("59m ago");
  });
});
