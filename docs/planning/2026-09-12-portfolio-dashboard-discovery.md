# Discovery — GitHub Portfolio Status Dashboard

**Stage:** 2 (Brainstorm/Discovery). Feeds Stage 7 PRD (`docs/PRD.md`); does not itself
authorize implementation.

**Source idea brief:** `~/Brain/Ideas/github-project-status.md` (captured 2026-09-10).

**Date:** 2026-09-12. **Approved by:** Josh Muthumani.

## Problem statement

Josh has ~27 GitHub repositories with no single place to see what's active, what's dormant,
and where attention is accumulating across the portfolio, or to drill into one repo's live
operational state (PRs, issues, activity) without opening GitHub directly. This project
builds a live, GitHub-backed dashboard answering two questions:

1. **Portfolio:** what is happening across the full repository portfolio?
2. **Project:** what is the operational state of one repository right now?

It is not a replacement project-management system — GitHub stays the source of live
operational truth; a small local metadata record supplies only what GitHub cannot know
(portfolio tags, purpose, production status).

## Scope decisions (resolved this session)

- **Repo scope:** all repositories under Josh's account, including private ones.
- **Repo enumeration:** auto-discovered via the GitHub API (not a hand-maintained list).
  Forks and archived repositories are excluded by default; a curated override can still
  surface one deliberately.
- **Status taxonomy:** a fixed, small enum (e.g. active, production, personal, paused,
  archived) lives in the local curated metadata file and is applied per repo by Josh —
  independent of each repo's own GitHub label conventions, which are inconsistent across
  27 repos.
- **Data freshness:** on-demand refresh only for MVP. No scheduled polling, cache layer, or
  background job.
- **Auth to GitHub:** a personal access token (repo read scope), retrieved through Phase.dev
  per the secrets-broker policy — never printed, exported, or hardcoded.
- **Runtime target:** deployed (not local-only), single-user (Josh only). Candidate
  platforms are Vercel or Cloudflare; the exact stack is explicitly deferred to Stage 3
  (Architecture Council) and Stage 5 (tool evaluation) rather than locked here.
- **Dashboard access control:** a simple shared-secret / bearer-token check, configured via
  an env var — no OAuth, no user database, since there is exactly one user.
- **Repo identity:** this repository (`joshaumuthumani/github-project-status`, bootstrapped
  at Stage 1) is the dashboard project. There is no separate prior "projects-status"
  workspace to reconcile.

## MVP definition (minimum shippable slice)

**Portfolio view only.** A single page listing all discovered, non-forked, non-archived
repositories with:

- curated tags (from local metadata: status enum, purpose, production flag)
- open PR count, open issue count
- last-activity date (most recent commit or PR/issue event)
- a visual/sortable way to spot stale repos (no recent activity) vs. active ones

The per-repository detail view (labels, contributors, bot participation, full backlog
breakdown) described in the idea brief is real scope but is **not** part of MVP — it is the
next slice after the portfolio view ships and is actually used.

## Non-goals

- Not a replacement for GitHub Issues/Projects as the system of record for any individual
  repo's backlog.
- Not multi-user; no sharing, teams, or access levels beyond the single shared secret.
- Not a write-back tool — this dashboard reads GitHub data, it does not create or modify
  issues, PRs, or labels.
- Not scheduled/real-time (e.g. no webhooks, no push updates) for MVP — refresh is
  user-triggered.
- Not responsible for enumerating or tagging repos automatically beyond fork/archived
  filtering — the status taxonomy is manually curated.

## Constraints carried forward

- Project tier is `load-bearing` (`docs/DECISIONS.md`, 2026-09-11) — full Stage 3 and Stage
  11 gates apply, no reduced-tier exemptions.
- This repo's own backlog/intent store is the GitHub Project on
  `joshaumuthumani/github-project-status` (`docs/DECISIONS.md`, 2026-09-11) — separate from
  the portfolio data the app itself displays.
- Secrets (the GitHub PAT, the dashboard shared secret) are managed via Phase.dev; values
  are never retrieved, printed, or persisted outside the approved broker flow.

## Open questions carried to Stage 3/5

- Exact stack (framework, data-fetch layer, hosting target: Vercel vs. Cloudflare) —
  Architecture Council / tool evaluation.
- Local metadata storage format/location (flat file vs. small DB) — architecture-level
  choice once the stack is picked.
- Whether the per-repo detail view (post-MVP) needs any persistent storage beyond on-demand
  API calls, or stays fully live.

## Next step

Hand this structured requirement to Stage 7's PRD process (`docs/PRD.md`) once architecture
(Stage 3) and tool evaluation (Stage 5) settle the stack. Per the canonical pipeline, Stage 7
PRD approval is the actual implementation gate, not this document.
