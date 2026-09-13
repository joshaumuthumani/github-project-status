import { NextResponse } from "next/server";
import { discoverRepos, fetchPortfolioData } from "@/lib/github";
import { readMetadata, type CuratedEntry } from "@/lib/metadata";
import { isStale } from "@/lib/staleness";

export const runtime = "nodejs";

export interface PortfolioRepo {
  name: string;
  status: CuratedEntry["status"] | null;
  purpose: string | null;
  production: boolean;
  openPRs: number;
  openIssues: number;
  lastActivity: string;
  stale: boolean;
}

export interface PortfolioResponse {
  repos: PortfolioRepo[];
  fetchedAt: string;
  partial: boolean;
  errors: { repo: string; reason: string }[];
}

export async function GET() {
  const portfolioToken = process.env.GITHUB_PORTFOLIO_PAT;
  const owner = process.env.GITHUB_OWNER;

  if (!portfolioToken || !owner) {
    return NextResponse.json(
      { error: "Server is not configured (missing GITHUB_PORTFOLIO_PAT or GITHUB_OWNER)" },
      { status: 500 },
    );
  }

  const errors: { repo: string; reason: string }[] = [];

  // readMetadata has no dependency on the GitHub calls below, so it starts
  // immediately instead of waiting behind them — one less sequential round
  // trip on every refresh.
  const metadataPromise = readMetadata().catch((error: unknown) => {
    errors.push({ repo: "metadata", reason: error instanceof Error ? error.message : "Could not read curated metadata" });
    return null;
  });

  let discovered;
  try {
    discovered = await discoverRepos(portfolioToken, owner);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not discover repositories" },
      { status: 502 },
    );
  }

  let activity;
  try {
    const result = await fetchPortfolioData(portfolioToken, discovered);
    activity = result.repos;
    errors.push(...result.errors);
  } catch (error) {
    // A batch-wide GraphQL error (rate limit, revoked token) applies to
    // every repo at once — surface it as a hard failure, not N generic
    // per-repo errors (lib/github.ts).
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not fetch portfolio data" },
      { status: 502 },
    );
  }

  // Metadata failure (including a malformed file with no `repos` key)
  // degrades to "no curated entries" rather than failing the whole
  // refresh — live GitHub data (this app's core value) still renders, but
  // the failure is surfaced above, never swallowed silently.
  const metadata = await metadataPromise;
  const metadataRepos: Record<string, CuratedEntry> = metadata?.repos ?? {};

  const repos: PortfolioRepo[] = activity.map((repo) => {
    const key = `${repo.owner}/${repo.name}`;
    const curated = metadataRepos[key];
    return {
      name: key,
      status: curated?.status ?? null,
      purpose: curated?.purpose ?? null,
      production: curated?.production ?? false,
      openPRs: repo.openPRs,
      openIssues: repo.openIssues,
      lastActivity: repo.pushedAt,
      stale: isStale(repo.pushedAt),
    };
  });

  const response: PortfolioResponse = {
    repos,
    fetchedAt: new Date().toISOString(),
    partial: errors.length > 0,
    errors,
  };

  return NextResponse.json(response);
}
