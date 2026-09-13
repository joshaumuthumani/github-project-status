import { afterEach, describe, expect, it, vi } from "vitest";
import { discoverRepos, fetchPortfolioData } from "./github";

function mockFetchOnce(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  });
}

function discoveryPage(nodes: unknown[], hasNextPage = false, endCursor: string | null = null) {
  return {
    data: { user: { repositories: { pageInfo: { hasNextPage, endCursor }, nodes } } },
    errors: [],
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("discoverRepos", () => {
  it("filters out archived repos and maps owner/name", async () => {
    const fetchMock = mockFetchOnce(
      discoveryPage([
        { name: "keep-me", isArchived: false, owner: { login: "josh" } },
        { name: "drop-me", isArchived: true, owner: { login: "josh" } },
      ]),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await discoverRepos("token", "josh");

    expect(result).toEqual([{ owner: "josh", name: "keep-me" }]);
  });

  it("paginates until hasNextPage is false, instead of silently truncating at one page", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => discoveryPage([{ name: "repo-1", isArchived: false, owner: { login: "josh" } }], true, "cursor-1") })
      .mockResolvedValueOnce({ ok: true, json: async () => discoveryPage([{ name: "repo-2", isArchived: false, owner: { login: "josh" } }], false, null) });
    vi.stubGlobal("fetch", fetchMock);

    const result = await discoverRepos("token", "josh");

    expect(result).toEqual([
      { owner: "josh", name: "repo-1" },
      { owner: "josh", name: "repo-2" },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const secondCallBody = JSON.parse(fetchMock.mock.calls[1][1].body);
    expect(secondCallBody.variables.after).toBe("cursor-1");
  });

  it("throws when GitHub returns a GraphQL error", async () => {
    const fetchMock = mockFetchOnce({ data: null, errors: [{ message: "Bad credentials" }] });
    vi.stubGlobal("fetch", fetchMock);

    await expect(discoverRepos("token", "josh")).rejects.toThrow("Bad credentials");
  });

  it("throws on a non-2xx HTTP response", async () => {
    const fetchMock = mockFetchOnce({}, false, 401);
    vi.stubGlobal("fetch", fetchMock);

    await expect(discoverRepos("token", "josh")).rejects.toThrow(/status 401/);
  });
});

describe("fetchPortfolioData", () => {
  it("returns an empty result for an empty repo list without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchPortfolioData("token", []);

    expect(result).toEqual({ repos: [], errors: [] });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps successful aliases back to their repo and correlates failed aliases by name", async () => {
    const fetchMock = mockFetchOnce({
      data: {
        r0: { pushedAt: "2026-09-01T00:00:00Z", pullRequests: { totalCount: 3 }, issues: { totalCount: 5 } },
        r1: null,
      },
      errors: [{ message: "Could not resolve to a Repository", path: ["r1"] }],
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchPortfolioData("token", [
      { owner: "josh", name: "alive-repo" },
      { owner: "josh", name: "renamed-repo" },
    ]);

    expect(result.repos).toEqual([
      { owner: "josh", name: "alive-repo", pushedAt: "2026-09-01T00:00:00Z", openPRs: 3, openIssues: 5 },
    ]);
    expect(result.errors).toEqual([
      { repo: "josh/renamed-repo", reason: "Could not resolve to a Repository" },
    ]);
  });

  it("throws instead of masking a batch-wide error as N generic per-repo failures", async () => {
    const fetchMock = mockFetchOnce({
      data: { r0: null, r1: null },
      errors: [{ message: "API rate limit exceeded" }],
    });
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      fetchPortfolioData("token", [
        { owner: "josh", name: "a" },
        { owner: "josh", name: "b" },
      ]),
    ).rejects.toThrow("API rate limit exceeded");
  });

  it("aliases the outbound query as r0..rN in list order", async () => {
    const fetchMock = mockFetchOnce({ data: { r0: null, r1: null }, errors: [] });
    vi.stubGlobal("fetch", fetchMock);

    await fetchPortfolioData("token", [
      { owner: "josh", name: "a" },
      { owner: "josh", name: "b" },
    ]);

    const requestBody = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(requestBody.query).toContain("r0: repository(owner: \"josh\", name: \"a\")");
    expect(requestBody.query).toContain("r1: repository(owner: \"josh\", name: \"b\")");
  });
});
