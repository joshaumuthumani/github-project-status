# Stage 5 — Tool Evaluation

**Date:** 2026-09-12. **Evaluator role:** tool-evaluator (independent of Architecture Council).
**Input:** `docs/architecture/architecture.md` §8 (open questions), ADR-0001, ADR-0002, ADR-0003,
`docs/DECISIONS.md`.

Runs in parallel with the Stage 4 Visual Quality Gate on the architecture diagram companion
rendering — Stage 5 depends only on the Stage 3 frozen architecture contract (merged PR #8,
`4966fe3`), not on Stage 4's diagram output. No policy conflict in running them concurrently.

## Claims extracted and verified

### 1. GitHub GraphQL primary rate limit (architecture.md §8, §6)

**Claim:** ~27-repo batched GraphQL query stays within GitHub's rate limits for on-demand,
single-user refresh.

**Verified against:** GitHub Docs, "Rate limits and query limits for the GraphQL API" (current).
Authenticated user (PAT): **5,000 points/hour**. Point cost scales with nodes/connections
requested, not a flat per-call cost. A single batched query returning repo metadata + PR count +
issue count + last-activity for 27 repos is well inside this budget even at a generous
per-refresh cost estimate (tens to low hundreds of points), for an on-demand (not polling)
refresh pattern.

**Verdict: CONFIRMED.**

### 2. Secondary rate limit / abuse detection (ADR-0003 rationale)

**Claim:** GitHub's secondary rate limit throttles concurrent REST calls, which is why
ADR-0003 chose one batched GraphQL query over N REST calls.

**Verified against:** GitHub Docs, "Best practices for using the REST API": *"To avoid exceeding
secondary rate limits, you should make requests serially instead of concurrently."* Confirms the
ADR-0003 premise. A single batched GraphQL request removes the concurrency trigger entirely.

**Verdict: CONFIRMED** — ADR-0003's rationale holds against current docs.

### 3. Fine-grained GitHub PAT scoped to ~27 specific repos (ADR-0001)

**Claim:** A fine-grained PAT can be scoped to exactly the ~27 target repositories with
read-only permissions (`Contents`, `Metadata`, `Pull requests`, `Issues`).

**Verified against:** GitHub Docs, "Managing your personal access tokens" → "Creating a
fine-grained personal access token": token creation includes an explicit **Repository access**
step to select specific repositories, and a **Permissions** step to grant only the needed
read scopes. No documented numeric cap on repository count that would block 27 repos.

**Verdict: CONFIRMED.**

### 4. Deploy platform — Vercel (architecture.md §6 recommendation)

**Claims to verify:** (a) serverless function timeout fits the batched GraphQL call; (b) secret
env vars don't leak into build logs/bundles; (c) push-to-deploy GitHub integration can be scoped
to this one repository; (d) preview deployments can be isolated from production secrets
(ADR-0002).

**Verified against:** Vercel Docs, current.
- (a) **Correction to architecture.md's own assumption:** §8 cited "Vercel free tier: 10s" as the
  constraint to verify. Current docs show Hobby (free) tier default **and maximum** function
  duration is **300s**, not 10s — the assumption in the architecture doc was stale/wrong and is
  materially more headroom than assumed. Not a blocker either way (a single batched query needs
  nowhere near 10s), but recorded since the exact number was wrong.
- (b) Vercel supports "Sensitive Environment Variables" (write-only after creation, values not
  readable/exported) and redacts sensitive env var values from build logs — fits the PAT/bearer
  token handling this app needs.
- (c) Vercel's GitHub integration is installed as a GitHub App with per-repository install
  scoping (standard GitHub App installation flow: "All repositories" or "Only select
  repositories") — can be scoped to this repo alone, satisfying ADR-0002's separate-credential
  intent for deploy identity.
- (d) Preview deployments are a distinct Vercel "Preview" environment with its own env var scope
  separate from "Production" — dummy/empty values can be set for Preview without affecting
  Production, satisfying ADR-0002 option 1.

**Verdict: CONFIRMED.**

### 5. Deploy platform — Cloudflare (alternate candidate, architecture.md §6)

**Verified against:** Cloudflare Workers/Pages Docs, current.
- CPU time (not wall-clock) is the metered limit: **Free tier 10ms CPU time/request**, Paid
  30s default/5min max. Network I/O wait (the GitHub GraphQL round trip) does **not** count
  toward CPU time, so a thin request handler around one outbound fetch is very unlikely to hit
  10ms of actual CPU even on the Free plan — but this is a tighter, less-forgiving margin than
  Vercel's 300s wall-clock budget if the framework/runtime adds parsing/templating overhead.
- Subrequests: 50/request (Free) — one outbound GraphQL call is trivially within this.
- GitHub integration is also a per-repository-scoped GitHub App install, same as Vercel.
- Cloudflare Pages env vars support production/preview environment separation, satisfying
  ADR-0002 the same way Vercel does.

**Verdict: CONFIRMED WITH CAVEAT** — viable, but Free-tier CPU-time (10ms) is a materially
tighter margin than Vercel Hobby's 300s wall-clock budget. Not disqualifying for this app's thin
I/O-bound handler, but worth re-checking actual CPU time against a real deployed build rather
than assuming headroom, if Cloudflare is chosen over Vercel.

## Stack-level verdict

All evaluated components clear the gate: **CONFIRMED** (GraphQL rate limits, secondary rate
limit avoidance, fine-grained PAT scoping, Vercel) and **CONFIRMED WITH CAVEAT** (Cloudflare,
caveat noted above, not blocking). No component REJECTED. **The Stage 5 gate passes — the
environment/deploy tail may open.**

## Still deferred (implementation-detail, not blocking the gate)

- Exact frontend/backend framework (Next.js vs. plain static + function endpoints) —
  architecture.md's own boundaries hold under either; this is a Stage 6/9 implementation choice,
  not a Stage 5 blocking claim. Recommendation: Next.js on Vercel, matching architecture.md §6's
  stated fit ("native fit for a React/Next.js-style app") — carry into Stage 6 prototype rather
  than deciding in the abstract here.
- Exact platform pick (Vercel vs. Cloudflare) — both CONFIRMED; Vercel has the larger margin and
  matches the Council's stated MVP recommendation. Recommendation: **Vercel**, unless Josh has a
  reason to prefer Cloudflare (e.g. existing account/workflow).
