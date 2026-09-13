import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const discoverRepos = vi.fn();
const fetchPortfolioData = vi.fn();
const readMetadata = vi.fn();

vi.mock("@/lib/github", () => ({
  discoverRepos: (...args: unknown[]) => discoverRepos(...args),
  fetchPortfolioData: (...args: unknown[]) => fetchPortfolioData(...args),
}));

vi.mock("@/lib/metadata", async () => {
  const actual = await vi.importActual<typeof import("@/lib/metadata")>("@/lib/metadata");
  return { ...actual, readMetadata: (...args: unknown[]) => readMetadata(...args) };
});

const { GET } = await import("./route");

beforeEach(() => {
  vi.stubEnv("GITHUB_PORTFOLIO_PAT", "test-pat");
  vi.stubEnv("GITHUB_OWNER", "josh");
  discoverRepos.mockReset();
  fetchPortfolioData.mockReset();
  readMetadata.mockReset();
  readMetadata.mockResolvedValue({ repos: {} });
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("GET /api/portfolio", () => {
  it("returns 500 when required env vars are missing", async () => {
    vi.unstubAllEnvs();
    const response = await GET();
    expect(response.status).toBe(500);
  });

  it("merges live data with curated metadata and reports partial:false when nothing failed", async () => {
    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();
    discoverRepos.mockResolvedValueOnce([{ owner: "josh", name: "alive-repo" }]);
    fetchPortfolioData.mockResolvedValueOnce({
      repos: [{ owner: "josh", name: "alive-repo", pushedAt: sixtyDaysAgo, openPRs: 2, openIssues: 1 }],
      errors: [],
    });
    readMetadata.mockResolvedValueOnce({
      repos: { "josh/alive-repo": { status: "active", purpose: "test", production: true } },
    });

    const response = await GET();
    const body = await response.json();

    expect(body.partial).toBe(false);
    expect(body.errors).toEqual([]);
    expect(body.repos).toEqual([
      {
        name: "josh/alive-repo",
        status: "active",
        purpose: "test",
        production: true,
        openPRs: 2,
        openIssues: 1,
        lastActivity: sixtyDaysAgo,
        stale: true,
      },
    ]);
  });

  it("leaves a repo unannotated when no curated entry exists (FR-3)", async () => {
    discoverRepos.mockResolvedValueOnce([{ owner: "josh", name: "unannotated-repo" }]);
    fetchPortfolioData.mockResolvedValueOnce({
      repos: [{ owner: "josh", name: "unannotated-repo", pushedAt: new Date().toISOString(), openPRs: 0, openIssues: 0 }],
      errors: [],
    });
    readMetadata.mockResolvedValueOnce({ repos: {} });

    const response = await GET();
    const body = await response.json();

    expect(body.repos[0].status).toBeNull();
    expect(body.repos[0].purpose).toBeNull();
    expect(body.repos[0].production).toBe(false);
  });

  it("marks partial:true and surfaces per-repo fetch errors (FR-6)", async () => {
    discoverRepos.mockResolvedValueOnce([{ owner: "josh", name: "ok" }, { owner: "josh", name: "renamed" }]);
    fetchPortfolioData.mockResolvedValueOnce({
      repos: [{ owner: "josh", name: "ok", pushedAt: new Date().toISOString(), openPRs: 0, openIssues: 0 }],
      errors: [{ repo: "josh/renamed", reason: "not found" }],
    });
    readMetadata.mockResolvedValueOnce({ repos: {} });

    const response = await GET();
    const body = await response.json();

    expect(body.partial).toBe(true);
    expect(body.repos).toHaveLength(1);
    expect(body.errors).toEqual([{ repo: "josh/renamed", reason: "not found" }]);
  });

  it("degrades to unannotated repos (not a failed request) when metadata read fails", async () => {
    discoverRepos.mockResolvedValueOnce([{ owner: "josh", name: "ok" }]);
    fetchPortfolioData.mockResolvedValueOnce({
      repos: [{ owner: "josh", name: "ok", pushedAt: new Date().toISOString(), openPRs: 0, openIssues: 0 }],
      errors: [],
    });
    readMetadata.mockRejectedValueOnce(new Error("metadata unavailable"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.partial).toBe(true);
    expect(body.errors).toEqual([{ repo: "metadata", reason: "metadata unavailable" }]);
    expect(body.repos[0].status).toBeNull();
  });

  it("degrades gracefully instead of crashing when the metadata file is malformed (no repos key)", async () => {
    discoverRepos.mockResolvedValueOnce([{ owner: "josh", name: "ok" }]);
    fetchPortfolioData.mockResolvedValueOnce({
      repos: [{ owner: "josh", name: "ok", pushedAt: new Date().toISOString(), openPRs: 0, openIssues: 0 }],
      errors: [],
    });
    // Intentionally malformed (no `repos` key) to exercise the defensive fallback.
    readMetadata.mockResolvedValueOnce({});

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.repos[0].status).toBeNull();
  });

  it("returns 502 when discovery itself fails, rather than a silent empty list", async () => {
    discoverRepos.mockRejectedValueOnce(new Error("GitHub is down"));

    const response = await GET();
    expect(response.status).toBe(502);
  });

  it("returns 502 when the batch fetch fails outright (e.g. rate limit), not a fabricated per-repo error list", async () => {
    discoverRepos.mockResolvedValueOnce([{ owner: "josh", name: "a" }]);
    fetchPortfolioData.mockRejectedValueOnce(new Error("API rate limit exceeded"));

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(502);
    expect(body.error).toBe("API rate limit exceeded");
  });
});
