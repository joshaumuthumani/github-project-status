# Stage 6 — Rapid Prototype: single batched GraphQL query for ~27 repos

**Date:** 2026-09-12. **Role:** Implementation Engineer. **Issue:** #12. **Status:** complete,
spike code deleted.

## Riskiest unresolved question

Can one GraphQL query alias `repository(owner, name)` for ~27 repos and return PR count, issue
count, and last-activity for all of them in a single round trip, within GitHub's rate/node
limits and within a serverless function's timeout? This is the untested premise behind
ADR-0003 and `architecture.md` §6's performance claim.

## What was real vs. faked/stubbed

- **Real:** live GitHub GraphQL API call (`gh api graphql`), real authenticated session
  (`gh auth status` → logged in via keyring), real repo list pulled live via
  `gh repo list joshaumuthumani --json name,isFork,isArchived` and filtered to non-fork,
  non-archived (24 repos — close to the architecture doc's ~27 figure; the account currently has
  24 qualifying repos, not a spike shortcut).
- **Real:** the actual query shape the app needs — per-repo `name`, `pushedAt` (last-activity),
  `openPRs: pullRequests(states: OPEN) { totalCount }`, `openIssues: issues(states: OPEN) {
  totalCount }`, aliased `r0`..`r23`, plus a top-level `rateLimit { cost remaining limit
  nodeCount used }` field to read the actual cost GitHub charged.
- **Faked/stubbed:** the credential. Used the `gh` CLI's own OAuth-derived token (already
  authenticated on this machine), not a freshly-issued fine-grained PAT scoped to exactly this
  app's permission set. Fine-grained-PAT *repo-scoping capability* was already independently
  verified in Stage 5 (`docs/evaluations/2026-09-12-stage5-tool-evaluation.md`, item 3) and
  fine-grained-PAT *GraphQL authentication support* was re-confirmed against current GitHub docs
  immediately before this spike (`forming-calls-with-graphql`: fine-grained PATs authenticate to
  GraphQL, example permission `issues:read`). This spike tests query structure and cost, not
  credential type — using an already-valid session was the cheaper, faster way to answer that
  one question, consistent with "as cheaply as possible."
- **Faked/stubbed:** no serverless function wrapper (Vercel/Next.js). Ran the query directly via
  `gh api graphql` from a shell. The app-side HTTP round trip adds negligible overhead compared
  to the dominant cost (the GitHub API call itself), so this doesn't change the answer to the
  timeout question.

## What was learned

- **The single-batched-query approach works exactly as designed.** One request returned all 24
  repos' `name`, `pushedAt`, open PR count, and open issue count correctly, in one round trip.
- **Cost: 1 point** per refresh (`rateLimit.cost: 1`, from a 5,000-point hourly budget) — far
  below the "tens to low hundreds of points" estimate in the Stage 5 evaluation. `totalCount`
  connection fields are cheap; this query shape does not scale point-cost linearly with repo
  count the way node-heavy field selections would.
- **Wall time: ~1.26s** end-to-end (shell round trip via `gh api graphql`, including process
  spawn) for 24 repos in one call — an order of magnitude under any realistic serverless
  timeout budget (Vercel Hobby: 300s default/max, confirmed in Stage 5; even the stale "10s"
  assumption in `architecture.md` §8 would have passed).
- **No node-limit or query-complexity error.** GitHub's GraphQL query returned cleanly with no
  `errors` array; `rateLimit.nodeCount: 0` because no `nodes`-returning connection was actually
  paginated in this query shape (only scalar `totalCount`s were requested).
- **Confirms ADR-0003 and architecture.md §6 as originally decided** — no invalidation, no
  redesign needed. This raises confidence in the Stage 5 verdict rather than changing it, since
  Stage 5 verified the *documented limits*, not an actual live call.

## Outcome

**The riskiest unresolved question is answered: the batched-GraphQL approach is sound.** Nothing
about the design needs to change. Spike is a success by *confirming* the approach, not by
invalidating it (both are equally valid Stage 6 outcomes per pipeline policy).

## Disposal

Spike files (`/tmp/spike_query.graphql`, `/tmp/spike_result.json`, `/tmp/spike_stderr.txt`) were
created outside the repository working tree and were never committed; nothing to delete from
version control. No code from this spike carries forward into the real build.
