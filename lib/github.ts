const GITHUB_GRAPHQL_ENDPOINT = "https://api.github.com/graphql";

export interface RepoRef {
  owner: string;
  name: string;
}

export interface RepoActivity extends RepoRef {
  pushedAt: string;
  openPRs: number;
  openIssues: number;
}

export interface PortfolioFetchResult {
  repos: RepoActivity[];
  errors: { repo: string; reason: string }[];
}

async function githubGraphQL<T>(
  token: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<{ data: T | null; errors: { message: string; path?: (string | number)[] }[] }> {
  const response = await fetch(GITHUB_GRAPHQL_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/vnd.github+json",
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(`GitHub GraphQL request failed with status ${response.status}`);
  }

  const body = await response.json();
  return { data: body.data ?? null, errors: body.errors ?? [] };
}

// FR-1: auto-discover repos owned directly by the account, excluding forks
// and archived repos by default. ownerAffiliations: OWNER scopes to repos
// owned by this account, not orgs/collaborations. Paginates fully so an
// account past the ~27-repo baseline never silently loses repos past one
// page (fail-visibly principle, architecture.md §6).
export async function discoverRepos(token: string, owner: string): Promise<RepoRef[]> {
  const query = `
    query DiscoverRepos($login: String!, $after: String) {
      user(login: $login) {
        repositories(first: 100, after: $after, ownerAffiliations: OWNER, isFork: false) {
          pageInfo { hasNextPage endCursor }
          nodes {
            name
            isArchived
            owner { login }
          }
        }
      }
    }
  `;

  type DiscoverRepoNode = { name: string; isArchived: boolean; owner: { login: string } };
  type DiscoverResponse = {
    user: {
      repositories: {
        pageInfo: { hasNextPage: boolean; endCursor: string | null };
        nodes: DiscoverRepoNode[];
      };
    } | null;
  };

  const nodes: DiscoverRepoNode[] = [];
  let after: string | null = null;

  while (true) {
    const { data, errors }: { data: DiscoverResponse | null; errors: { message: string }[] } = await githubGraphQL<DiscoverResponse>(
      token,
      query,
      { login: owner, after },
    );

    if (errors.length > 0 || !data?.user) {
      throw new Error(errors[0]?.message ?? "Could not discover repositories");
    }

    nodes.push(...data.user.repositories.nodes);

    if (!data.user.repositories.pageInfo.hasNextPage) break;
    after = data.user.repositories.pageInfo.endCursor;
  }

  return nodes.filter((node) => !node.isArchived).map((node) => ({ owner: node.owner.login, name: node.name }));
}

// FR-2 (ADR-0003, Stage 6-verified shape): one batched GraphQL request per
// refresh, aliasing repository(owner, name) as r0..rN so a failure on one
// repo (rename, deletion) is correlated back to its exact name instead of
// failing the whole refresh.
export async function fetchPortfolioData(
  token: string,
  repos: RepoRef[],
): Promise<PortfolioFetchResult> {
  if (repos.length === 0) {
    return { repos: [], errors: [] };
  }

  const aliasFor = (index: number) => `r${index}`;
  const fields = repos
    .map(
      (repo, index) => `
        ${aliasFor(index)}: repository(owner: ${JSON.stringify(repo.owner)}, name: ${JSON.stringify(repo.name)}) {
          pushedAt
          pullRequests(states: OPEN) { totalCount }
          issues(states: OPEN) { totalCount }
        }`,
    )
    .join("\n");

  const query = `query PortfolioBatch {\n${fields}\n}`;

  const { data, errors } = await githubGraphQL<
    Record<string, { pushedAt: string; pullRequests: { totalCount: number }; issues: { totalCount: number } } | null>
  >(token, query);

  const erroredAliases = new Set(
    errors.map((error) => error.path?.[0]).filter((alias): alias is string => typeof alias === "string"),
  );

  // A GraphQL error with no resolvable path (rate limit, abuse detection,
  // revoked token) applies to the whole batch, not one repo. Reporting it as
  // a generic per-repo failure for all N repos would mask the real cause
  // from the one person who needs to see it — surface it as a hard failure
  // instead, same as discoverRepos does.
  const batchWideError = errors.find((error) => !error.path || error.path.length === 0);
  if (batchWideError) {
    throw new Error(batchWideError.message);
  }

  const results: RepoActivity[] = [];
  const failures: { repo: string; reason: string }[] = [];

  repos.forEach((repo, index) => {
    const alias = aliasFor(index);
    const repoLabel = `${repo.owner}/${repo.name}`;
    const node = data?.[alias];

    if (erroredAliases.has(alias) || !node) {
      const matchingError = errors.find((error) => error.path?.[0] === alias);
      failures.push({ repo: repoLabel, reason: matchingError?.message ?? "Repository could not be loaded" });
      return;
    }

    results.push({
      owner: repo.owner,
      name: repo.name,
      pushedAt: node.pushedAt,
      openPRs: node.pullRequests.totalCount,
      openIssues: node.issues.totalCount,
    });
  });

  return { repos: results, errors: failures };
}
