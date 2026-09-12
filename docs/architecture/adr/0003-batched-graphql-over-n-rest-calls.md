# ADR-0003: Batch GitHub reads via a single GraphQL query, not N REST calls

**Status:** Accepted. **Date:** 2026-09-12. **Stage:** 3 (Architecture Council).

## Context

Every portfolio refresh needs, per repo (~27 repos): existence/fork/archived flags, open PR
count, open issue count, and last-activity date. The initial draft left open whether to batch
this via GitHub's GraphQL API in one round trip, or issue N (~27 × 3–4) REST calls, deferring the
choice to Stage 5 tool evaluation.

`backend-architect` argued this is a reliability/correctness property of the backend contract,
not a framework preference, and should be resolved at the architecture level: GitHub's hourly
rate limit (5,000 req/hr) is not the binding constraint at this scale, but GitHub's **secondary
rate-limit / abuse-detection** behavior throttles rapid concurrent REST calls independent of the
hourly cap — and ~27 repos × 3–4 parallel calls on every page load is a plausible trigger for
that today, not a future-scale concern. Batched GraphQL also enables a clean partial-failure
contract (§3 of `architecture.md`): a single query response can report per-repo success/failure
without N independent call sites needing separate error handling.

## Decision

The backend fetches repo list, PR counts, issue counts, and last-activity via a single batched
GitHub GraphQL query (or a small fixed batch of queries) per refresh, not N sequential/parallel
REST calls.

## Alternatives considered

- **N REST calls (original open question, one option)** — rejected as the default: correct at
  small scale but risks secondary rate-limiting under concurrent fan-out, and complicates
  partial-failure reporting across independent call sites.
- **REST with client-side/manual batching or sequential calls** — rejected for the same
  reliability reason; sequential calls would also be slower for no benefit at this scale.

## Consequences

- The backend's contract with GitHub is a single query shape, simplifying the partial-failure
  response contract in `architecture.md` §3.
- Stage 5 must verify GitHub's GraphQL API can return all needed fields for ~27 repos within the
  chosen platform's serverless function timeout (e.g. Vercel free tier: 10s) — a falsifiable claim
  to check against current GitHub GraphQL documentation, not assumed from general GraphQL
  familiarity.
- Framework/runtime choice (Stage 5) is unconstrained by this decision: any chosen stack must
  simply be able to issue one outbound GraphQL POST server-side.

**Owner:** Josh Muthumani.
