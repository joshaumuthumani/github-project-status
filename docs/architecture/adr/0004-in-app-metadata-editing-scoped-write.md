# ADR-0004: In-app curated-metadata editing writes back to this repo only, via a
second, narrowly-scoped PAT

**Status:** Accepted. **Date:** 2026-09-12. **Stage:** 7 (PRD) — amends Stage 3 architecture.

## Context

Stage 2/3 settled on a git-tracked, hand-edited metadata file with an explicit "never mutated by
this app" / "no write-back to GitHub" invariant (`architecture.md` §2-§4, discovery non-goals).
At Stage 7 PRD, Josh requested an in-app editing UI for curated tags (status/purpose/production)
instead of hand-editing JSON and committing — OQ-2 from the initial PRD draft. This is a real
scope and trust-boundary change, not an implementation detail, so it is recorded here rather than
folded silently into the PRD.

Two persistence options were considered for where an in-app edit actually lands:

1. Add a database/KV store — rejected: reopens the Stage 3 "no database" decision, adds a new
   persistent store, a new credential, and a new backup/consistency question with no offsetting
   benefit for a single-editor, low-write-volume use case (curated tags for ~27 repos, edited
   occasionally).
2. Write back to GitHub via git, to this app's own metadata file, in this app's own repository —
   selected.

## Decision

The in-app editing UI writes curated metadata changes back to `github-project-status`'s own
metadata file via a GitHub API commit, using a **second, separate, narrowly-scoped PAT** distinct
from the read-only portfolio-data PAT (ADR-0001):

- **Scope:** `contents: write`, `metadata: read` — **on this one repository only**
  (`joshaumuthumani/github-project-status`). It has zero access, read or write, to any of the
  ~27 portfolio repos being tracked.
- **The read-only portfolio PAT (ADR-0001) is unchanged** — it stays read-only, scoped to the
  ~27 tracked repos, with no write permission added to it. The two credentials are never merged
  into one token.
- The write path is narrowly scoped: it can only update the one metadata file's content via a
  server-side API route, using this second PAT server-side only (same "never sent to or readable
  by the browser" invariant as ADR-0001, `architecture.md` §4).
- No other write capability is introduced. This app still has no write path to any of the ~27
  portfolio repos, and no write path to anything in this repo other than the metadata file.

## Alternatives considered

- **Database/KV store** — rejected, see Context.
- **Grant `contents: write` on the existing ADR-0001 PAT instead of issuing a second token** —
  rejected: would give one credential both cross-portfolio read access and this-repo write
  access, worse blast radius than two separately-scoped, separately-revocable tokens. A leaked
  write-capable token under this alternative could also read all ~27 private repos; under the
  chosen design, the write-capable token can only touch one file in one repo.
- **Keep hand-edit + git commit for MVP, defer UI editing** — considered and rejected by Josh at
  Stage 7; recorded as the alternative not taken.

## Consequences

- **Architecture change:** `architecture.md` and `threat-model.md` must be amended to add this
  second credential, the new write path, and the new trust-boundary crossing (server-side API →
  GitHub, write). This ADR is the record of that change; `architecture.md`/`threat-model.md` are
  updated to reflect it as of this PRD.
- **Threat model impact:** a new asset (the metadata-write PAT) and a new threat surface (an
  authenticated dashboard user, i.e. Josh, can now cause a real git commit to this repo through
  the app). Given single-user scope this is a low-incremental-risk addition, but it is a genuine
  new capability, not "no write path" anymore for this one repo.
- **Stage 5/6 evidence unaffected:** the read-only PAT's scoping (ADR-0001) and the batched
  GraphQL read query (ADR-0003) are unchanged; this ADR adds a second, independent credential and
  code path rather than modifying either.
- **Implementation (Stage 9) must verify:** a fine-grained PAT scoped to `contents: write` on
  exactly one named repository behaves as documented (no broader write access granted), and that
  this second PAT is sourced from Phase.dev and never logged, exactly like the first (ADR-0001,
  project-wide policy).

**Owner:** Josh Muthumani.
