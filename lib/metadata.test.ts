import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readMetadata, writeMetadataEntry } from "./metadata";

const SAMPLE_FILE = { repos: { "josh/existing": { status: "active", purpose: "x", production: false } } };

function base64Of(obj: unknown) {
  return Buffer.from(JSON.stringify(obj), "utf-8").toString("base64");
}

beforeEach(() => {
  vi.stubEnv("GITHUB_METADATA_PAT", "test-pat");
  vi.stubEnv("GITHUB_METADATA_REPO", "josh/github-project-status");
  vi.stubEnv("GITHUB_METADATA_PATH", "data/portfolio-metadata.json");
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("readMetadata", () => {
  it("decodes the base64 GitHub Contents API response", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: base64Of(SAMPLE_FILE), sha: "abc123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await readMetadata();

    expect(result).toEqual(SAMPLE_FILE);
  });

  it("throws when the config is missing", async () => {
    vi.unstubAllEnvs();
    await expect(readMetadata()).rejects.toThrow(/must be configured/);
  });

  it("falls back to the default path when GITHUB_METADATA_PATH is set to an empty string", async () => {
    vi.stubEnv("GITHUB_METADATA_PATH", "");
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: base64Of(SAMPLE_FILE), sha: "abc123" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    await readMetadata();

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("/contents/data/portfolio-metadata.json");
  });

  it("throws on a non-2xx response", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 404 });
    vi.stubGlobal("fetch", fetchMock);

    await expect(readMetadata()).rejects.toThrow(/status 404/);
  });
});

describe("writeMetadataEntry", () => {
  it("merges the new entry and PUTs with the fetched sha", async () => {
    const getMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: base64Of(SAMPLE_FILE), sha: "abc123" }),
    });
    const putMock = vi.fn().mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const fetchMock = vi.fn().mockImplementationOnce(getMock).mockImplementationOnce(putMock);
    vi.stubGlobal("fetch", fetchMock);

    await writeMetadataEntry("josh/new-repo", { status: "paused", purpose: "spike", production: true });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const [, putInit] = fetchMock.mock.calls[1];
    expect(putInit.method).toBe("PUT");

    const putBody = JSON.parse(putInit.body);
    expect(putBody.sha).toBe("abc123");

    const decoded = JSON.parse(Buffer.from(putBody.content, "base64").toString("utf-8"));
    expect(decoded.repos["josh/existing"]).toEqual(SAMPLE_FILE.repos["josh/existing"]);
    expect(decoded.repos["josh/new-repo"]).toEqual({ status: "paused", purpose: "spike", production: true });
  });

  it("throws when the write request fails", async () => {
    const getMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ content: base64Of(SAMPLE_FILE), sha: "abc123" }),
    });
    const putMock = vi.fn().mockResolvedValueOnce({ ok: false, status: 409, text: async () => "conflict" });
    const fetchMock = vi.fn().mockImplementationOnce(getMock).mockImplementationOnce(putMock);
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      writeMetadataEntry("josh/new-repo", { status: "active", purpose: "", production: false }),
    ).rejects.toThrow(/status 409/);
  });
});
