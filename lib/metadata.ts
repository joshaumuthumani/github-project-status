const GITHUB_CONTENTS_API = "https://api.github.com";

export const CURATED_STATUSES = ["active", "production", "personal", "paused", "archived-override"] as const;
export type CuratedStatus = (typeof CURATED_STATUSES)[number];

export interface CuratedEntry {
  status: CuratedStatus;
  purpose: string;
  production: boolean;
}

export type MetadataFile = { repos: Record<string, CuratedEntry> };

interface MetadataRef {
  content: MetadataFile;
  sha: string;
}

function requireMetadataConfig() {
  const token = process.env.GITHUB_METADATA_PAT;
  const repo = process.env.GITHUB_METADATA_REPO;
  // `||`, not `??`: an explicitly empty string is just as invalid a path as
  // an unset one, and should fall back to the default rather than produce a
  // malformed Contents API URL.
  const path = process.env.GITHUB_METADATA_PATH || "data/portfolio-metadata.json";
  if (!token || !repo) {
    throw new Error("GITHUB_METADATA_PAT and GITHUB_METADATA_REPO must be configured");
  }
  return { token, repo, path };
}

// Always reads the metadata file's live content straight from GitHub, never
// from this deployment's bundled copy — an in-app edit (Phase 4) commits to
// GitHub, and the next refresh must see it immediately (PRD SC-3), which a
// build-time-bundled copy could not guarantee on a serverless deploy.
async function fetchMetadataRef(): Promise<MetadataRef> {
  const { token, repo, path } = requireMetadataConfig();

  const response = await fetch(`${GITHUB_CONTENTS_API}/repos/${repo}/contents/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Could not read curated metadata file (status ${response.status})`);
  }

  const body = await response.json();
  const decoded = Buffer.from(body.content, "base64").toString("utf-8");
  const parsed = JSON.parse(decoded) as MetadataFile;

  return { content: parsed, sha: body.sha };
}

export async function readMetadata(): Promise<MetadataFile> {
  const { content } = await fetchMetadataRef();
  return content;
}

// Phase 4 (ADR-0004): the one deliberate write path, scoped to this file in
// this repo only, using the narrowly-scoped GITHUB_METADATA_PAT.
export async function writeMetadataEntry(repoKey: string, entry: CuratedEntry): Promise<void> {
  const { token, repo, path } = requireMetadataConfig();
  const { content, sha } = await fetchMetadataRef();

  const updated: MetadataFile = {
    repos: { ...content.repos, [repoKey]: entry },
  };

  const response = await fetch(`${GITHUB_CONTENTS_API}/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: `chore: update curated metadata for ${repoKey}`,
      content: Buffer.from(JSON.stringify(updated, null, 2) + "\n", "utf-8").toString("base64"),
      sha,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Could not write curated metadata (status ${response.status}): ${body}`);
  }
}
