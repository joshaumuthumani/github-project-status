# Architecture — GitHub Portfolio Status Dashboard

**Stage:** 3 (Architecture Council) — **complete**. Source:
`docs/planning/2026-09-12-portfolio-dashboard-discovery.md` (Stage 2, approved). **Author:**
`project-architect`. **Date:** 2026-09-12. **Status:** reconciled — specialist review (§9) and
integrated threat model (`threat-model.md`) both complete; architecture and threat model agree;
no unresolved Critical/High findings.

This is the reconciled architecture after specialist review (§9 records finding dispositions).
The threat model lives in `threat-model.md`; consequential choices are logged as ADRs in `adr/`.

## 1. Requirements recap (from Stage 2)

- Single user (Josh only). No multi-tenant, no user DB, no OAuth.
- Portfolio view (MVP): all non-fork, non-archived repos on Josh's account, auto-discovered via
  GitHub API, each annotated with curated tags/status from local metadata, open PR/issue counts,
  last-activity date.
- Per-repo detail view: real scope, explicitly deferred past MVP.
- Read-only against GitHub. No write-back to GitHub from this app.
- On-demand refresh only for MVP — no scheduler, no background jobs, no cache layer.
- GitHub auth: a PAT (repo read scope), sourced from Phase.dev, never hardcoded, never logged.
- Dashboard access: a single shared-secret/bearer token, via env var.
- Deployed (not local-only). Candidate platforms: Vercel or Cloudflare — left open for this
  Council to resolve or explicitly defer to Stage 5 tool evaluation.
- Tier: load-bearing — every pipeline stage runs, including Stage 10 review gate on every PR.

## 2. Component responsibilities

```
┌─────────────┐      HTTPS + bearer token       ┌──────────────────────────┐
│   Browser   │ ───────────────────────────────▶│   Web app (frontend)     │
│  (Josh only)│◀─────────────────────────────── │   static/SSR page(s)     │
└─────────────┘                                  └────────────┬─────────────┘
                                                                │ same-origin API call
                                                                │ (bearer token required)
                                                   ┌────────────▼─────────────┐
                                                   │  Backend API layer        │
                                                   │  (serverless functions)   │
                                                   │  - verifies bearer token  │
                                                   │  - holds GitHub PAT       │
                                                   │    (server-side only)     │
                                                   │  - calls GitHub API       │
                                                   │  - merges curated         │
                                                   │    metadata               │
                                                   └───┬───────────────────┬───┘
                                                       │                   │
                                           GitHub REST/GraphQL      reads committed
                                           API (PAT, read-only)     metadata file
                                                       │             (repo-tracked,
                                              ┌────────▼───────┐     not runtime-writable
                                              │  GitHub.com    │     from the app)
                                              │  (~27 repos)   │
                                              └────────────────┘
```

- **Frontend:** one page (portfolio view) for MVP. No client-side GitHub PAT exposure — every
  GitHub call happens server-side.
- **Backend API layer:** the only component that holds the GitHub PAT. Verifies the dashboard
  bearer token on every request before doing any work (including any framework default/health
  routes — not just data endpoints). Calls GitHub's **GraphQL API with a single batched query**
  per refresh (repo list + PR counts + issue counts + last-activity in one round trip) — resolved
  here rather than deferred to Stage 5, since it is a reliability property (see §6 and
  `backend-architect`'s memo) that avoids GitHub's secondary rate-limit/abuse-detection behavior
  under N parallel REST calls. Merges the live GitHub data with the curated metadata file and
  returns a single versioned response: `{ repos: [...], fetchedAt, partial: bool, errors: [...] }`
  so the frontend can distinguish "fully loaded," "partially loaded (N/27, with per-repo error
  reasons)," and "fully failed" rather than only a binary success/fail.
- **Curated metadata:** a version-controlled file in this repository (e.g.
  `data/portfolio-metadata.json` or `.yaml`), containing the per-repo status enum, purpose, and
  production flag. Edited by Josh directly (commit + deploy), not through an in-app UI, for MVP.
  This is a **deploy-time-frozen** data source: an edit only takes effect after commit + deploy,
  not live — worth naming explicitly so it is never mistaken for a live config store. Parsing is
  **tolerant, not strict**: an unknown `status` value or one malformed repo entry degrades that
  single entry to "unannotated" rather than failing the whole page; a fully malformed/unparseable
  file fails the request closed with a clear error (silently dropping all curation data is worse
  than a visible failure for a single-user tool). A metadata entry that references a repo no
  longer visible on GitHub (renamed/deleted/transferred) is an accepted, named drift risk — low
  frequency, manually curated, not solved in MVP.
- **GitHub:** the sole live source of operational truth (PRs, issues, activity, forks/archived
  flags). Never mutated by this app.

## 3. Data model

**Curated metadata** (git-tracked, not a database):

```jsonc
{
  "repos": {
    "joshaumuthumani/github-project-status": {
      "status": "active",       // enum: active | production | personal | paused | archived-override
      "purpose": "Portfolio dashboard (this repo)",
      "production": false
    }
    // ... one entry per repo Josh chooses to annotate; repos with no entry still appear,
    // unannotated, since GitHub auto-discovery is the source of the repo list itself.
  }
}
```

- No database. No ORM. No migrations. This keeps Stage 5 (tool evaluation) unconstrained on
  backend stack choice, since there's no persistence layer to select around.
- **Retention:** the metadata file's history is git history — no separate audit log needed.
- **Caching:** none for MVP, per Stage 2's explicit "on-demand refresh only" decision. Every
  page load/refresh re-fetches from GitHub. This is an explicit scale tradeoff (see §6).
- **API response contract** (`GET /api/portfolio`, single consumer — its own frontend):

  ```jsonc
  {
    "repos": [ { "name": "...", "status": "active", "openPRs": 3, "openIssues": 5, "lastActivity": "..." } ],
    "fetchedAt": "2026-09-12T...Z",
    "partial": false,       // true if one or more repos failed to load this refresh
    "errors": []            // [{ repo, reason }] when partial is true
  }
  ```

  This makes partial failure (some repos load, others transiently fail) visible and distinct
  from total failure, per the fail-visibly principle in §6.

## 4. Trust boundaries, authN/authZ, sensitive-data flow

| Boundary crossing | Mechanism | Notes |
|---|---|---|
| Browser → Backend API | Bearer token (shared secret) in `Authorization` header | Single user, single static token. No session, no refresh flow, no OAuth. CORS must default-deny (no wildcard origin) since a misconfigured CORS policy on a bearer-token API is an exfiltration path. |
| Backend API → GitHub | GitHub **fine-grained PAT**, scoped read-only to the specific ~27 target repos, server-side only | PAT never reaches the browser. Never included in any client bundle, log line, or error message. **Not** a classic PAT: a classic PAT's `repo` scope grants read/write to every repo the account can access, contradicting the "read-only" boundary this architecture leans on — this is recorded as ADR-0001. |
| Secret provisioning → Runtime | Phase.dev → deployment platform env vars, pushed by Josh (manually, via Phase.dev's platform sync/CLI) at deploy time | PAT and bearer-token secret are both managed in Phase.dev, synced to the hosting platform's secret/env store before/at deploy. The running app reads them from its own platform env, not by calling Phase.dev at request time. No intermediate step (CI job, build script) may write either secret to a file, log, or build artifact — verified at Stage 5/implementation, not just asserted here. |
| Deploy identity → Repository | Platform-native GitHub App/OAuth (Vercel or Cloudflare push-to-deploy) | A **separate credential from the runtime PAT**, with its own (different) blast radius. Scope to this single repository only. Confirm every merge to `main` auto-deploying to prod is a deliberate choice (matches "load-bearing" tier) rather than unexamined default platform behavior. |

- **Identities:** exactly one human identity (Josh), authenticated to the dashboard by
  possession of the bearer token. No user table, no password, no OAuth flow — matches Stage 2's
  explicit non-goal ("not multi-user"). No session/rotation story exists for the bearer token;
  accepted as a named residual risk at this scale (see §9).
- **Privilege boundary:** the GitHub PAT is the only credential capable of reading private repo
  data; it must never be reachable from client-side code or from any log/error path. This is the
  architecture's single most consequential trust boundary and is the primary subject for
  `security-architect`'s threat model.
- **No write path exists** from the dashboard back to GitHub — eliminates an entire class of
  authorization concerns (no scoped write permissions to reason about).
- **Preview deployments:** both Vercel and Cloudflare Pages create automatic preview builds per
  PR/branch by default. Preview builds **must not** receive the production GitHub PAT or bearer
  token; use platform-scoped preview env vars (empty/dummy values) or disable preview deploys for
  this repo. This is a required decision, not a Stage 5 nice-to-have — an unauthenticated or
  differently-secreted preview URL would otherwise be a second live surface holding production
  credentials. Recorded as ADR-0002.

## 5. Deployment topology (options, pending Council/Stage 5 resolution)

Two viable platforms were named in discovery. Both fit "backend API + static/SSR frontend,
single low-traffic single-user app":

| Option | Fit | Tradeoffs |
|---|---|---|
| **Vercel** (Recommended for MVP) | Native fit for a React/Next.js-style app: static frontend + serverless functions in one deploy, generous free tier for single-user traffic, first-class env var / secret management, trivial GitHub-push-to-deploy. | Vendor lock-in to Vercel's serverless runtime conventions; cold starts on infrequent access (acceptable for on-demand single-user use). |
| **Cloudflare** (Pages + Workers) | Also a strong fit; typically faster cold start, generous free tier, Workers KV available later if a cache layer is ever added. | Slightly more setup friction for a full-stack framework's API routes depending on framework choice; ecosystem less turnkey for some meta-frameworks than Vercel. |

**Recommendation:** Vercel for MVP, given the single-user low-traffic profile and minimal
operational surface it needs — but this is explicitly **not locking the framework/stack**,
which stays a Stage 5 tool-evaluation decision. Either platform satisfies this architecture's
component boundaries unchanged; the choice mainly affects deployment config, not the design
above.

**Rejected for MVP:** a persistent server (VM/container) — unnecessary operational overhead
(patching, uptime, scaling) for a single-user, on-demand, read-only app with no background jobs.

**Deploy-time controls to confirm at Stage 5 (not architectural blockers):** disable or
credential-isolate preview deployments (see §4); confirm TLS-in-transit is platform-managed
(at-rest encryption is moot — no database); rely on the chosen platform's native instant-rollback
rather than building a custom one; confirm the platform's env var store never surfaces secret
values in build logs, preview output, or client bundles.

## 6. Scale, performance, reliability

- **Scale:** one user, ~27 repos, on-demand refresh. GitHub REST/GraphQL rate limits (5,000
  req/hr authenticated) are not a practical constraint at this scale even with zero caching.
- **Reliability:** no SLA requirement — single-user tool. A GitHub API outage or rate-limit hit
  fails visibly via the `partial`/`errors` response shape (§3), not silently stale/wrong data.
- **Performance:** on-demand refresh uses a **single batched GitHub GraphQL query** per refresh
  (repo list + PR counts + issue counts + last-activity in one round trip), not N sequential/
  parallel REST calls. This is a resolved architectural decision (ADR-0003), not deferred to
  Stage 5: `backend-architect` identified that ~27 repos × 3–4 parallel REST calls on every page
  load is a plausible trigger for GitHub's secondary rate-limit/abuse-detection behavior today,
  not just at future scale — this is a correctness/reliability property of the backend contract,
  independent of which framework Stage 5 selects.
- **Partial failure:** repos can succeed/fail independently within one refresh (transient GitHub
  error, one repo mid-rename). Surfaced via `partial`/`errors` in the response contract (§3)
  rather than either hidden or failing the whole page for one bad repo.
- **Observability:** no dedicated observability stack for MVP; platform-native request logs
  (Vercel/Cloudflare) are sufficient at this scale. Revisit if the tool grows beyond single-user.
  Explicitly confirmed (not just asserted) that the PAT and bearer token never appear in those
  logs — a Stage 5/implementation verification item.

## 7. Implementation phases (sequencing only, not task decomposition)

1. Repo auto-discovery + basic portfolio list (no curated metadata yet) — proves the GitHub
   API integration and the bearer-token gate.
2. Curated metadata file wired in — tags/purpose/production flag merged into the list.
3. Sort/stale-repo visual treatment on top of the data already fetched in phases 1–2.
4. (Post-MVP, not this Council's scope) per-repo detail view.

## 8. Open questions carried into Stage 5 (falsifiable, tool-evaluator to verify)

Resolved by this Council (no longer open — see §9): GraphQL batching vs. N REST calls; Phase.dev
sync mechanism/actor; preview-deployment credential isolation; PAT scoping model.

Still open, deliberately deferred to Stage 5 tool evaluation:

- Exact frontend/backend framework (Next.js vs. a plain static frontend + separate function
  endpoints, etc.) — this architecture's boundaries hold under either choice.
- Whether GitHub's GraphQL API can return the full batched query (repo list + PR/issue counts +
  last-activity for ~27 repos) within the chosen platform's serverless function timeout (e.g.
  Vercel free tier: 10s) — falsifiable against current GitHub GraphQL docs, not assumed.
- Whether a fine-grained GitHub PAT can actually be scoped to exactly the ~27 target repos in
  practice (vs. an org/account-wide grant) — verify against current GitHub PAT documentation.
- Confirm Vercel's/Cloudflare's env var storage does not surface secret values in build logs,
  preview-deployment output, or client-side bundles, against current platform docs.
- Confirm current GitHub REST/GraphQL rate limits (5,000 req/hr authenticated, cited in §6) are
  still accurate.
- Confirm whether the chosen platform's push-to-deploy GitHub App integration can be scoped to
  this single repository only.

## 9. Reconciliation — specialist finding dispositions

Findings from `backend-architect` and `cloud-security-architect` review of the initial draft.
No Critical/High findings were raised by either specialist — both confirmed the core design
(server-side-only PAT, bearer-token-gated API, no write path, no database) is sound. All findings
below are Medium/Low-severity contract or documentation gaps, each accepted and incorporated.

| # | Finding (source) | Disposition |
|---|---|---|
| 1 | Resolve GraphQL-vs-REST now, as a backend contract decision (`backend-architect`) | **Accepted and incorporated** — §2, §6; ADR-0003. |
| 2 | Define an explicit, versioned API response contract with partial-failure shape (`backend-architect`) | **Accepted and incorporated** — §3. |
| 3 | Curated-metadata parsing must be tolerant to single-entry errors, closed on total-file corruption (`backend-architect`) | **Accepted and incorporated** — §2. |
| 4 | Metadata/GitHub drift (renamed/deleted repo orphans a metadata entry) | **Accepted as a named residual risk**, not solved in MVP — §2. |
| 5 | Classic PAT's `repo` scope contradicts the stated read-only boundary; require a fine-grained, read-only PAT | **Accepted and incorporated** — §4; ADR-0001. |
| 6 | Preview deployments may inherit production secrets by platform default | **Accepted and incorporated** — §4; ADR-0002. |
| 7 | Name the deploy identity (platform GitHub App) as distinct from the runtime PAT | **Accepted and incorporated** — §4. |
| 8 | Make the Phase.dev → platform env var sync actor/cadence explicit | **Accepted and incorporated** — §4. |
| 9 | CORS should default-deny, not wildcard, given the bearer-token exfiltration risk | **Accepted and incorporated** — §4. |
| 10 | No PAT/bearer-token rotation or revocation procedure defined | **Accepted as a named residual risk**, owner Josh, revisit if this tool gains urgency beyond personal use. |
| 11 | No environment separation (single prod environment only) | **Accepted as an explicit non-goal** for this tier/scope, not a silent omission. |
| 12 | No alerting/detection stack | **Accepted as a named residual risk**, acceptable for single-user MVP with no SLA. |
| 13 | Recovery path for a compromised PAT/bearer token is not walked through | **Deferred to `threat-model.md`** as a mitigation reference — this is exactly what the integrated threat model should specify. |
| 14 | Confirm deploy-on-merge-to-main is deliberate given "load-bearing" tier | **Accepted and incorporated** — §4 (deploy identity row). |

**Explicit disagreements:** none. Both specialists confirmed the core boundaries without
proposing to reopen the no-DB, no-cache, or single-environment decisions from Stage 2.

## 10. Residual risks carried forward (named, not silent)

- Bearer token is a single static long-lived shared secret with no rotation/expiry story.
- No PAT/bearer-token rotation or revocation runbook exists yet (Phase.dev makes revocation
  mechanically easy; the *procedure* is not written down).
- No environment separation, no alerting/detection, no rollback drill — all accepted tradeoffs
  for a single-user, load-bearing-but-low-blast-radius personal tool.
- Metadata/GitHub drift (renamed or deleted repos silently orphan their curated metadata entry)
  is not solved in MVP.

These carry into `threat-model.md` as accepted-risk entries with Josh as owner, not as
unconsidered gaps.
