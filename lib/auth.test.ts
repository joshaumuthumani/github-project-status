import { describe, expect, it } from "vitest";
import { constantTimeEqual } from "./auth";

describe("constantTimeEqual", () => {
  it("returns true for identical strings", () => {
    expect(constantTimeEqual("secret-token", "secret-token")).toBe(true);
  });

  it("returns false for different strings of the same length", () => {
    expect(constantTimeEqual("secret-token", "secret-tokeX")).toBe(false);
  });

  it("returns false for different-length strings", () => {
    expect(constantTimeEqual("short", "much-longer-string")).toBe(false);
  });

  it("returns false against an empty string", () => {
    expect(constantTimeEqual("secret-token", "")).toBe(false);
  });
});
