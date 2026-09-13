import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const writeMetadataEntry = vi.fn();
vi.mock("@/lib/metadata", async () => {
  const actual = await vi.importActual<typeof import("@/lib/metadata")>("@/lib/metadata");
  return { ...actual, writeMetadataEntry: (...args: unknown[]) => writeMetadataEntry(...args) };
});

const { PATCH } = await import("./route");

function patchRequest(body: unknown) {
  return new NextRequest("http://localhost/api/metadata", {
    method: "PATCH",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

describe("PATCH /api/metadata", () => {
  it("rejects a malformed repo key", async () => {
    const response = await PATCH(patchRequest({ repo: "not-a-repo-key", status: "active", purpose: "", production: false }));
    expect(response.status).toBe(400);
  });

  it("rejects an invalid status value", async () => {
    const response = await PATCH(patchRequest({ repo: "josh/repo", status: "on-fire", purpose: "", production: false }));
    expect(response.status).toBe(400);
  });

  it("rejects a missing purpose field", async () => {
    const response = await PATCH(patchRequest({ repo: "josh/repo", status: "active", production: false }));
    expect(response.status).toBe(400);
  });

  it("rejects a missing production field", async () => {
    const response = await PATCH(patchRequest({ repo: "josh/repo", status: "active", purpose: "" }));
    expect(response.status).toBe(400);
  });

  it("writes the entry on a valid request", async () => {
    writeMetadataEntry.mockResolvedValueOnce(undefined);

    const response = await PATCH(
      patchRequest({ repo: "josh/repo", status: "personal", purpose: "spike", production: false }),
    );

    expect(response.status).toBe(200);
    expect(writeMetadataEntry).toHaveBeenCalledWith("josh/repo", {
      status: "personal",
      purpose: "spike",
      production: false,
    });
  });

  it("surfaces a write failure as 502, not a crash", async () => {
    writeMetadataEntry.mockRejectedValueOnce(new Error("GitHub write failed"));

    const response = await PATCH(
      patchRequest({ repo: "josh/repo", status: "active", purpose: "", production: false }),
    );

    expect(response.status).toBe(502);
  });
});
