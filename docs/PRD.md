# PRD — GitHub Portfolio Status Dashboard

**Stage:** 7 (PRD and plan). **Status:** draft v2, pending Josh's approval (OQ-1/2/3 resolved).
**Author:** `prd` skill, from settled Stage 2/3/5/6 evidence plus the Stage 7 ADR-0004 amendment.
**Date:** 2026-09-12.

**Inputs:** `docs/planning/2026-09-12-portfolio-dashboard-discovery.md` (Stage 2, approved),
`docs/architecture/architecture.md` and `docs/architecture/threat-model.md` (Stage 3, reconciled;
amended Stage 7 per ADR-0004), `docs/architecture/adr/0001-fine-grained-github-pat.md`,
`docs/architecture/adr/0002-preview-deployment-credential-isolation.md`,
`docs/architecture/adr/0003-batched-graphql-over-n-rest-calls.md`,
`docs/architecture/adr/0004-in-app-metadata-editing-scoped-write.md`,
`docs/evaluations/2026-09-12-stage5-tool-evaluation.md` (Stage 5, gate passed),
`docs/planning/2026-09-12-stage6-batched-graphql-spike.md` (Stage 6, confirmed), `docs/DECISIONS.md`.

No backlog creation or implementation may begin before Josh approves this document (Stage 7 gate,
`sdlc-pipeline.md`).

## 1. Overview and goals

Josh has ~27 (currently 24 active, non-fork, non-archived) GitHub repositories with no single
place to see what's active, what's dormant, and where attention is accumulating across the
portfolio. This project is a single-user web dashboard that answers: **what is happening across
the full repository portfolio, right now?** It is read-only against the ~27 tracked portfolio
repos, with exactly one deliberate exception: an in-app UI writes curated-tag edits back to this
app's own repository only (ADR-0004, §7) — it has no write access to any portfolio repo.

**Goals (measurable):**

- **G1:** Replace "open GitHub and click through repos one at a time" with one page showing all
  qualifying repos and their live status in a single on-demand refresh.
- **G2:** Surface staleness (no recent activity) vs. active repos at a glance, without requiring
  Josh to remember or re-derive it per repo.
- **G3:** Let Josh apply a durable, portfolio-specific label (status/purpose/production) to a
  repo that GitHub itself has no field for, and see that label next to the live GitHub data.
- **G4:** Ship the MVP slice runnable in production (deployed, not local-only) behind a single
  access secret, with no new data-integrity or credential-exposure risk beyond what
  `threat-model.md` already accepts.

This is not a replacement for GitHub Issues/Projects as any individual repo's system of record;
GitHub stays authoritative for live operational data. This app only adds the cross-repo view and
the curated metadata GitHub itself does not model.

## 2. Non-goals and scope boundaries

- **Not multi-user.** No accounts, no OAuth, no roles — a single shared bearer token gates the
  whole app for Josh alone.
- **Not a write-back tool against any portfolio repo.** No issue/PR/label creation or mutation,
  ever, against any of the ~27 tracked repos. The one exception is this app's own repository's
  curated-metadata file, editable in-app per ADR-0004 (§7) — that write path never extends to
  any portfolio repo or to any GitHub resource type other than that one file's content.
- **Not scheduled or real-time.** No polling, no webhooks, no push updates, no background jobs,
  no cache layer for MVP — every view is an explicit, user-triggered on-demand refresh.
- **Not a per-repo detail view.** Real, deferred scope (see §4) — not part of this PRD's
  MVP slice.
- **Not automatic repo tagging beyond fork/archived filtering.** The status taxonomy is
  Josh-curated by hand, not inferred from each repo's (inconsistent) own label conventions.
- **Not a persistence/database layer.** The curated metadata file is git-tracked, not a
  database, by explicit Stage 3 decision (`architecture.md` §3) — this constraint carries into
  this PRD unchanged.

## 3. Users and use cases

**User:** Josh only. Single human, single browser session, single bearer token.

**Use cases:**

1. Josh opens the dashboard and hits "refresh" to see the current state of all ~27 repos: open
   PR count, open issue count, last-activity date, and his own curated status/purpose/production
   tag per repo — without opening GitHub.
2. Josh scans the list to spot which repos have gone stale (no recent activity) versus which are
   actively churning, to decide where to spend attention next.
3. Josh edits a repo's status/purpose/production flag through an in-app editing UI, which
   commits the change back to the metadata file via GitHub (ADR-0004), and sees it reflected on
   next refresh — without needing to hand-edit JSON or run git commands himself.
4. GitHub or one repo transiently fails to respond during a refresh; Josh sees which repos
   loaded and which didn't (`partial`/`errors`, per `architecture.md` §3), not a single opaque
   failure or silently stale data for the whole page.

## 4. Current state and requirements: add / modify / remove

This is a new project — `github-project-status` currently has no application code, only
documentation, CI gate scaffolding (`docs/review-policy.md`), and the artifacts from Stages 1-6.
Every requirement below is **Add**; there is no existing behavior to modify or remove.

## 5. Functional requirements

- **FR-1 (Add):** The system auto-discovers all repositories owned by Josh's GitHub account via
  the GitHub API, excluding forks and archived repositories by default.
- **FR-2 (Add):** The system fetches, in a single batched GraphQL request per refresh (ADR-0003,
  confirmed live in Stage 6): repo name, open PR count, open issue count, and last-activity
  (`pushedAt`) for every discovered repo.
- **FR-3 (Add):** The system merges each repo's live GitHub data with its curated metadata entry
  (status, purpose, production flag) from the git-tracked metadata file (`architecture.md` §3).
  A repo with no curated entry still appears, unannotated — auto-discovery is the source of the
  repo list itself, not the metadata file.
- **FR-4 (Add):** The portfolio view renders one page listing every qualifying repo with its
  curated tags, open PR count, open issue count, and last-activity date, sorted or visually
  distinguished so stale repos (no recent activity) are identifiable at a glance (Stage 2 MVP
  definition).
- **FR-5 (Add):** Refresh is exclusively on-demand (user-triggered); there is no scheduler,
  polling loop, or background job in MVP.
- **FR-6 (Add):** If one or more repos fail to load during a refresh (e.g. a transient GitHub
  error or a repo mid-rename), the response is marked `partial: true` with a per-repo `errors`
  list; the repos that did load still render (`architecture.md` §3, §6 fail-visibly principle).
  A refresh never silently serves stale or wrong data in place of a visible error.
- **FR-7 (Add):** All GitHub API access is server-side only, using a fine-grained personal
  access token scoped to exactly the target repos with read-only permissions (ADR-0001,
  confirmed in Stage 5). The token is never sent to or readable by the browser.
- **FR-8 (Add):** The dashboard's frontend routes and its backend API routes are gated by a
  single shared bearer token, checked on every route including default/health routes
  (`architecture.md` §2, §4). There is no OAuth flow and no user database.
- **FR-9 (Add):** Both secrets (the GitHub PAT and the dashboard bearer token) are sourced from
  Phase.dev at deploy/runtime configuration time; neither is hardcoded, logged, or committed to
  the repository (project-wide constraint, `docs/DECISIONS.md`).
- **FR-10 (Add):** The dashboard provides an in-app editing UI for curated metadata
  (status/purpose/production per repo). Saving an edit commits the change to this repository's
  own metadata file via the GitHub API, using a second, narrowly-scoped PAT (`contents: write`,
  `metadata: read`, this repository only — ADR-0004) distinct from the read-only portfolio-data
  PAT (ADR-0001, FR-7). This is the one deliberate exception to "no write path": it can never
  reach any of the ~27 portfolio repos, and it can only write the metadata file's content, not
  any other file, PR, issue, or label.

## 6. Non-functional requirements

- **Security:**
  - Server-side-only PAT; never included in any client bundle, log line, or error message
    (`architecture.md` §4, `threat-model.md` §2).
  - Bearer token transmitted only via the `Authorization` header, never a URL query parameter
    (`threat-model.md` §2, row: Spoofing — bearer token theft).
  - CORS must default-deny with no wildcard origin (`threat-model.md` §2).
  - Preview deployments must not receive production secret values (ADR-0002, confirmed in
    Stage 5: Vercel's Preview/Production env var separation satisfies this).
  - No write path back to GitHub exists in any code path (architectural invariant, not just a
    UI restriction).
- **Privacy:** GitHub-sourced data (PR/issue counts, activity) is not secret in itself but is
  private-repo-derived; it must not be exposed to any unauthenticated request
  (`threat-model.md` §1, assets table).
- **Reliability:** No SLA — single-user tool. A GitHub API outage or rate-limit hit must fail
  visibly (per FR-6), never silently (`architecture.md` §6).
- **Performance:** A full-portfolio refresh (~24-27 repos) must complete within one serverless
  function invocation, well inside both GitHub's primary rate limit (5,000 pts/hr; the live
  spike measured **1 point** per refresh) and the deploy platform's function timeout (Vercel
  Hobby: 300s default/max, confirmed Stage 5) — both with large empirically-measured margin
  (Stage 6: ~1.26s wall time for 24 repos in one call).
- **Compatibility:** Laptop/desktop only (resolved at Stage 7, OQ-1). Mobile/responsive support
  is explicitly out of scope for MVP — not a target platform, not a design constraint.
- **Observability:** No dedicated observability stack for MVP; platform-native request logs are
  sufficient at this scale (`architecture.md` §6). Must be confirmed (implementation-time check,
  not re-litigated here) that neither secret ever appears in those logs.

## 7. Settled platform and data model (linked, not re-decided)

These are Stage 3/5/6 decisions; this PRD does not reopen them:

- **Frontend/backend framework:** Next.js (Stage 5 recommendation, `docs/evaluations/2026-09-12-stage5-tool-evaluation.md`).
- **Deploy platform:** Vercel (Stage 5 recommendation — larger operational margin than
  Cloudflare; Cloudflare remains a documented, `CONFIRMED WITH CAVEAT` fallback if Josh has a
  reason to prefer it).
- **GitHub data-fetch strategy:** single batched GraphQL query per refresh, not N REST calls
  (ADR-0003), empirically confirmed against the live API in Stage 6.
- **Credential model:** fine-grained, read-only, per-repo-scoped GitHub PAT for the ~27 portfolio
  repos (ADR-0001); a second, separate fine-grained PAT scoped to `contents: write`/`metadata:
  read` on this repository only, for in-app metadata edits (ADR-0004); single shared bearer token
  for dashboard access. All three secrets are sourced from Phase.dev (project-wide policy).
- **Data model:** no database — a git-tracked JSON metadata file keyed by `owner/repo`, holding
  only `status` (enum), `purpose` (string), `production` (bool) per entry (`architecture.md` §3).
  API response contract is the `GET /api/portfolio` shape already specified in
  `architecture.md` §3 (`repos[]`, `fetchedAt`, `partial`, `errors[]`) — this PRD does not
  redefine it.

## 8. Risks, dependencies, and open questions

**Carried-forward residual risks** (accepted, owner Josh, per `architecture.md` §10 and
`threat-model.md` — not re-litigated here, only restated so this PRD doesn't silently drop them):

- The bearer token is a single static long-lived shared secret with no rotation/expiry
  mechanism. **Owner:** Josh. **Unblock condition:** accepted for MVP given single-user,
  low-blast-radius scope; revisit if scope ever expands beyond one user.
- No PAT/bearer-token rotation or revocation runbook is written down yet, though Phase.dev makes
  the mechanical revocation step easy. **Owner:** Josh. **Unblock condition:** write the runbook
  before or shortly after first production deploy (Stage 9/11 item, not a Stage 7 blocker).
- No environment separation beyond Preview/Production env var isolation, no alerting/detection,
  no rollback drill. **Owner:** Josh. **Unblock condition:** accepted tradeoff for a
  single-user, load-bearing-but-low-blast-radius personal tool; revisit only if incident
  experience says otherwise.
- Metadata/GitHub drift: a renamed or deleted repo silently orphans its curated metadata entry.
  **Owner:** Josh. **Unblock condition:** not solved in MVP; explicitly deferred, not an
  oversight.

**Dependencies:**

- Phase.dev availability for both secrets at deploy/runtime — if unavailable, the app cannot
  start (no hardcoded fallback exists, by design).
- GitHub API availability — a GitHub outage degrades the dashboard to a visible `partial`/error
  state (FR-6), not a silent failure.

**Open questions — resolved at Stage 7:**

- **OQ-1 (resolved):** Laptop/desktop only. No mobile/responsive support requirement for MVP
  (see §6, Compatibility).
- **OQ-2 (resolved):** In-app editing UI, not hand-edit-only. This is a real architecture change,
  not an implementation detail — see ADR-0004
  (`docs/architecture/adr/0004-in-app-metadata-editing-scoped-write.md`), and the corresponding
  updates to `architecture.md`, `threat-model.md`, FR-10, and §7 above. `docs/DECISIONS.md`
  records the full rationale (2026-09-12, "Stage 7 PRD amendment").
- **OQ-3 (resolved):** Per-repo detail view timing is explicitly conditioned on MVP success —
  Josh decides whether/when to build it after the portfolio view has shipped and seen real use.
  No committed date; not a blocker to this PRD or to Stage 8 decomposition of the portfolio-view
  slice, since the detail view is out of scope for this PRD's FRs entirely (§2, Non-goals).

No open questions remain blocking Stage 7 approval.

## 9. Success criteria

Tied to the goals in §1:

- **SC-1 (→ G1):** Josh can view live status (open PRs, open issues, last-activity) for every
  qualifying repo in the portfolio from one page, triggered by a single refresh action, with no
  need to open GitHub directly for this information.
- **SC-2 (→ G2):** Stale vs. active repos are visually distinguishable on the portfolio view
  without Josh needing to cross-reference dates manually.
- **SC-3 (→ G3):** A curated status/purpose/production tag Josh sets in the metadata file
  appears correctly merged with that repo's live GitHub data on the next refresh.
- **SC-4 (→ G4):** The dashboard is reachable at a deployed URL, gated by the bearer token, with
  neither GitHub PAT (read-only portfolio PAT or metadata-write PAT, ADR-0004) ever observable in
  the browser, network tab, build logs, or any error message.
- **SC-5 (→ G3):** An in-app metadata edit (status/purpose/production) results in a real commit
  to this repository's metadata file, visible in git history, and cannot write to, or read
  anything from, any of the ~27 portfolio repos.
- A refresh that partially fails (one or more repos erroring) still renders every repo that
  succeeded, with the failure(s) visibly flagged (FR-6) — verified as an explicit test case, not
  merely assumed from the response contract.

## 10. Revision history

| Date | Summary |
|---|---|
| 2026-09-12 | Initial draft, from Stage 2 discovery, Stage 3 architecture/threat model, Stage 5 tool evaluation, and Stage 6 prototype evidence. Pending Josh's approval. |
| 2026-09-12 | v2: resolved OQ-1 (laptop/desktop only), OQ-2 (in-app metadata editing UI — added ADR-0004, updated `architecture.md`/`threat-model.md`/FR-10/§7 for the new scoped write path), OQ-3 (per-repo detail view timing conditioned on MVP success). Pending Josh's approval. |
