# Decisions Log

Append-only running decision log. Newest entries at the bottom.

## 2026-09-11 — Project tier: load-bearing

**Decision:** projects-status is tier `load-bearing`.

**Context:** Stage 1 project init, retrofitting the empty `~/Dev/projects-status` directory
against the canonical SDLC pipeline (`SDLC-Process/sdlc-pipeline.md` Stage 1), from the idea
brief at `~/Brain/Ideas/github-project-status.md`.

**Rationale:** Josh confirmed load-bearing when asked at Stage 1 — this is intended as
ongoing personal infrastructure (a live portfolio dashboard across ~27 repos), not a weekend
experiment.

**Consequences:** Stage 3 (Architecture Council) and the full Stage 11 pre-launch gate apply
in full — no reduced-tier exemptions.

**Owner:** Josh Muthumani.

---

## 2026-09-11 — Control-plane / intent store: GitHub Projects

**Decision:** This repo's own requirements/backlog (not the portfolio data it displays) are
tracked in a GitHub Project attached to `joshaumuthumani/github-project-status`, created at
Stage 1. GitHub Projects is authoritative for this repo's own Feature/Story/Task/Bug hierarchy,
status, and approvals — no separate tracker (e.g. Multica) is used for this repo's own backlog.

**Context:** The canonical SDLC policy requires declaring exactly one authoritative "intent
store" per project at Stage 1 — the single place that tracks *this project's own* requirements
and work items, distinct from any data the product itself reads or displays. This matters here
specifically because the product being built *is* a GitHub-Projects-data reader across other
repos — that's data the app consumes, not this repo's own backlog. Every other portfolio repo
(Chronicle, Ledger, Pops & Drops, Trove, Hermes Telemetry/Setup) already uses a GitHub Project
this same way, so this follows existing convention rather than introducing a new pattern.

**Alternatives considered:** Multica (used elsewhere in the personal stack for squad-dispatch
work) — not chosen because this project has no squad to dispatch to and every comparable repo
already uses a plain GitHub Project directly.

---

## 2026-09-11 — GitHub Project created and linked; webhook explicitly skipped for now

**Decision:** Created GitHub Project #9 ("GitHub Project Status",
`https://github.com/users/joshaumuthumani/projects/9`), linked to
`joshaumuthumani/github-project-status`. Added the minimum semantic fields from
`github-projects-webhook-sync.md`: `Status`, `Work Item Type` (Feature/Story/Task/Bug —
named to avoid GitHub's reserved `Type` field), `Priority`, `Milestone` (iteration
substitute), `Owner`, `Repository` (built-in), `Declared intent-store work item`,
`Blocked reason`, `Last synchronized`. Did **not** register a repository webhook.

**Context:** `github-projects-webhook-sync.md`'s own "Mutation boundary" states the contract
does not itself authorize webhook changes, and Stage 9.5 (continuous work-item sync) — the
only consumer of that webhook — doesn't exist yet for this project (no code, no sync
integration). Registering a webhook with nothing listening to its events would be premature
infrastructure.

**Consequences:** Webhook registration is deferred to whenever Stage 9.5 sync tooling is
actually built for this repo (likely alongside or after Stage 9). Until then, this repo's own
GitHub Project is updated manually.

**Alternatives considered:** Register the webhook now anyway, for completeness — rejected as
speculative infrastructure with no current consumer, against the karpathy-guidelines
simplicity principle this repo already commits to in `AGENTS.md`.

---

## 2026-09-11 — Kept extra doc directories beyond the canonical Stage 1 template

**Decision:** `docs/planning/`, `docs/security/`, `docs/releases/`, and `docs/review-policy.md`
stay in this repo even though the canonical `project-init` skill's file list doesn't include
them (they were dropped from an earlier, superseded version of that skill). Kept deliberately as
a stated local addition, not silently inherited.

**Context:** These came from Kilo's local `project-init` abstraction used to originally
bootstrap this repo, before the canonical Brain-side `project-init` skill was consulted. The
canonical skill explicitly says these were removed because they don't appear in
`sdlc-pipeline.md`'s own `docs/` conventions.

**Rationale:** All four are inert and cheap (currently near-empty placeholders); `docs/planning/`
and `docs/security/` line up with later stages' actual output locations (Stage 7/8 planning
docs, security review artifacts) even though the canonical skill doesn't pre-create them at
Stage 1. Removing them now would be pure churn with no benefit.

---

## 2026-09-11 — Stage 1 gate chain proven; branch protection enabled

**Decision:** Committed and pushed the Stage 1 scaffold to `main`, then opened disposable PR #1
(`chore/disposable-gate-proof`) to prove the Stage 10 Phase 1 → 2 → 3 chain end to end, per
`project-init.md` § 5. `Gate` (Phase 1: Build & Test, Security) passed, `Independent Review`
(Phase 2) completed, and `PR Verdict` (Phase 3) cast a formal `APPROVED` review as
`pr-external-review-bot[bot]` against the PR's exact head SHA (`ce03ec1`), confirmed via the
GitHub pull-request reviews endpoint — not just a green check. Closed the PR without merging and
deleted its branch. Enabled branch protection on `main`: PR required, 1 approving review with
`require_last_push_approval` and `dismiss_stale_reviews`, required status checks `Build & Test`
and `Security` (strict), `enforce_admins` on, no force-push or deletion.

**Context:** Stage 1 exit criteria require the gate CI installed *and enforced*, and the verdict
integration proven rather than merely configured — a green external-review check or empty
reviews endpoint would mean Phase 3 was absent.

**Consequences:** Stage 1 is now complete for this repo. Stage 2 (Discovery) is next.

**Owner:** Josh Muthumani.

---

## 2026-09-12 — Stage 2 Discovery approved: portfolio-view-only MVP

**Decision:** MVP scope is the portfolio view only (all repos, curated tags, PR/issue counts,
last-activity date). Per-repo detail view is real but deferred to the next slice. Repos are
auto-discovered via the GitHub API (forks/archived excluded by default, override via curated
metadata); status taxonomy is a fixed enum in local curated metadata, independent of each
repo's own GitHub labels. Data refresh is on-demand only (no scheduler/cache). GitHub auth is
a PAT via Phase.dev. The app is deployed (not local-only), single-user, Vercel or Cloudflare
candidate, gated by a simple shared-secret/bearer token — no OAuth, no user DB. Exact stack
is explicitly deferred to Stage 3/5.

**Context:** Stage 2 Discovery against the idea brief `~/Brain/Ideas/github-project-status.md`,
using the `brainstorming` skill's one-question-at-a-time process. Full structured requirement
recorded at `docs/planning/2026-09-12-portfolio-dashboard-discovery.md`.

**Rationale:** Keeps the first shippable slice small (one page, read-only, on-demand) while
avoiding premature stack lock-in ahead of Architecture Council. Manual status tagging avoids
fragile inference across 27 repos with inconsistent GitHub label conventions.

**Consequences:** Stage 2 is complete for this requirement. Next is Stage 3 (Architecture
Council) and Stage 5 (tool evaluation) to settle the stack, then Stage 7 PRD drafting and
approval before any implementation.

**Owner:** Josh Muthumani.

---

## 2026-09-12 — Stage 3 Architecture Council complete: portfolio dashboard architecture

**Decision:** Architecture reconciled and accepted for the GitHub Portfolio Status Dashboard.
Server-side-only GitHub PAT (fine-grained, read-only, scoped to the ~27 target repos — ADR-0001),
bearer-token-gated backend API, no database, no write path back to GitHub, no caching (on-demand
refresh only). GitHub reads batched into a single GraphQL query per refresh rather than N REST
calls (ADR-0003). Preview deployments on the eventual hosting platform must not receive
production secrets (ADR-0002). Deployment platform choice (Vercel recommended, Cloudflare viable)
and exact frontend/backend framework remain explicitly deferred to Stage 5 tool evaluation.

**Context:** Stage 3 Architecture Council run via the `architecture-council` skill against the
Stage 2 discovery artifact. Council seated `project-architect` (lead), `security-architect`
(integrated threat model), `backend-architect`, and `cloud-security-architect` (both seated
because the design includes a non-trivial API contract, provider-managed serverless deployment,
and a secrets-manager integration). Specialist review surfaced 14 findings, all Medium/Low
severity — no Critical/High architectural flaw was found in the initial draft. All findings
accepted and incorporated or explicitly named as residual risk; none rejected, none left
undispositioned. Full detail: `docs/architecture/architecture.md` (reconciled, §9 has the full
disposition table), `docs/architecture/threat-model.md` (STRIDE analysis, attack-surface
inventory, verification criteria), `docs/architecture/adr/0001-`, `0002-`, `0003-`.

**Rationale:** A single-user, read-only, low-blast-radius personal tool does not need
multi-environment, rotation, or alerting infrastructure — those are named as accepted residual
risks rather than architected away, keeping the design proportionate to actual risk. The two
credentials (GitHub PAT, bearer token) and their handling are the architecture's central trust
boundary and received the most scrutiny (ADR-0001, ADR-0002, both threat-model High findings).

**Consequences:** Stage 3 is complete. Four items are carried forward as required
verification/implementation gates for Stage 5 and Stage 9 (Build loop), not open architecture
questions: (1) confirm the issued PAT is genuinely fine-grained/read-only, not a classic PAT;
(2) confirm preview deployments are credential-isolated; (3) confirm neither secret ever appears
in build logs/error output/client bundles on the actually-chosen platform; (4) confirm the
platform's deploy identity is scoped to this repo only

---

## 2026-09-12 — Stage 5 tool evaluation: gate passes, Vercel recommended

**Decision:** All Stage 3-carried claims verified against current primary sources; the Stage 5
gate passes. No component rejected. Recommend **Vercel** (not Cloudflare) as the deploy platform,
and **Next.js** as the frontend/backend framework, carried into Stage 6 rather than re-litigated
there.

**Context:** Independent verification (tool-evaluator role) of every falsifiable claim listed in
`architecture.md` §8 and the four Stage 3 carry-forward items above. Full report:
`docs/evaluations/2026-09-12-stage5-tool-evaluation.md`. Ran in parallel with the Stage 4 Visual
Quality Gate on the architecture diagram (independent artifacts, no dependency between them per
`sdlc-pipeline.md` Stage 4/5 definitions).

**Findings:**
- GitHub GraphQL primary rate limit (5,000 pts/hr): **CONFIRMED** sufficient for a 27-repo
  on-demand batched refresh.
- Secondary rate-limit avoidance rationale behind ADR-0003 (batched GraphQL over N REST calls):
  **CONFIRMED** against current GitHub REST API best-practices docs.
- Fine-grained PAT scoped to the exact ~27 target repos (ADR-0001, carry-forward item 1):
  **CONFIRMED** — GitHub's fine-grained PAT creation flow supports per-repository selection with
  read-only permission grants.
- Vercel: function timeout, sensitive/build-log-redacted env vars, per-repo-scoped GitHub App
  install, and Preview/Production env var isolation (ADR-0002, carry-forward items 2-4): all
  **CONFIRMED**. Correction: architecture.md §8 had assumed a stale "10s" Hobby-tier function
  timeout; current docs show 300s default/max on Hobby — materially more headroom, not a
  blocker either way.
- Cloudflare (alternate candidate): **CONFIRMED WITH CAVEAT** — Free-tier CPU time (10ms,
  network I/O wait excluded) is a tighter margin than Vercel's 300s wall-clock budget; viable but
  worth re-verifying against a real build if chosen instead of Vercel.

**Rationale:** Vercel clears every carry-forward item with the larger operational margin and
matches the Architecture Council's own stated MVP fit (`architecture.md` §6). No reason surfaced
to prefer Cloudflare for this single-user, low-traffic tool.

**Consequences:** The environment/deploy provisioning gate opens (Rule 1,
`sdlc-pipeline.md`). Stage 6 (rapid prototype) and onward may build on Vercel + Next.js +
fine-grained PAT + batched GraphQL without re-verifying these claims, unless implementation
surfaces a contradiction.

**Owner:** Josh Muthumani. and distinct from the runtime PAT. Next
is Stage 4 (architecture diagram, optional/conditional) and Stage 5 (tool evaluation) to resolve
the deferred framework/platform choices and verify the falsifiable claims listed in
`architecture.md` §8, then Stage 7 PRD.

**Owner:** Josh Muthumani.

---

## 2026-09-12 — Stage 6 rapid prototype: batched-GraphQL spike confirms ADR-0003

**Decision:** The single riskiest unresolved design question — whether one GraphQL query can
alias and batch PR/issue counts and last-activity for ~27 repos in one round trip — is answered
**yes**, with margin. No architecture change. Spike code deleted; nothing carried forward.

**Context:** Stage 6 rapid prototype (`sdlc-pipeline.md` Stage 6), tracked in issue #12. Ran a
live GraphQL query (`gh api graphql`, existing authenticated session) against 24 real non-fork,
non-archived repos on the account (close to architecture.md's ~27 figure), aliasing `name`,
`pushedAt`, open PR count, and open issue count per repo in a single request, plus a top-level
`rateLimit` field to read the real cost GitHub charged. Full real-vs-faked record:
`docs/planning/2026-09-12-stage6-batched-graphql-spike.md`.

**Findings:**
- Cost: **1 point** per refresh (of a 5,000 pts/hr budget) — well below the "tens to low
  hundreds" estimate in the Stage 5 report.
- Wall time: **~1.26s** end-to-end for 24 repos in one call — an order of magnitude under any
  realistic serverless timeout.
- No node-limit or query-complexity error; response returned cleanly.
- Confirms ADR-0003 and `architecture.md` §6's batched-query performance claim was correct
  as originally decided — this raises confidence rather than changing anything.

**Rationale:** Cheaper to verify the live query shape now, disposably, than discover a
node-limit or complexity problem mid-build. Used the existing `gh` CLI session rather than
provisioning a fresh fine-grained PAT for the spike, since Stage 5 already independently
verified fine-grained-PAT repo-scoping and GraphQL-auth support — this spike targeted query
structure and cost, not credential type.

**Consequences:** No open architecture question remains for the MVP scope. Stage 7 (PRD/plan)
may proceed on the confirmed design. Spike code was never committed and is deleted; nothing from
it exists to carry into the real build.

**Owner:** Josh Muthumani.

---

## 2026-09-12 — Stage 7 PRD amendment: in-app metadata editing adds a scoped write path (ADR-0004)

**Decision:** The MVP adds an in-app UI for editing curated metadata (status/purpose/production
tags), instead of hand-editing the JSON file and committing directly. This writes back to
`github-project-status`'s own metadata file via the GitHub API, using a **second**, narrowly
scoped fine-grained PAT (`contents: write`, `metadata: read`, this repository only) — distinct
from the existing read-only portfolio-data PAT (ADR-0001), which is unchanged. Recorded as
ADR-0004: `docs/architecture/adr/0004-in-app-metadata-editing-scoped-write.md`.

**Context:** Raised as OQ-2 while drafting `docs/PRD.md` at Stage 7. Direct-git-edit was the
Stage 3 default; Josh asked for an in-app UI instead. Since Stage 3 had explicitly decided "no
database" and "never mutated by this app" for the metadata file (`architecture.md` §2-§4,
discovery non-goals), this is a genuine trust-boundary change, not an implementation detail —
handled as an ADR amendment plus updates to `architecture.md` and `threat-model.md`, rather than
folded silently into the PRD.

**Rationale:** A database/KV store was rejected (reopens the "no database" decision for no
offsetting benefit at this write volume). Adding `contents: write` to the existing ADR-0001 PAT
was rejected (would combine cross-portfolio read access and this-repo write access in one
credential — worse blast radius than two separately-scoped, separately-revocable tokens). A
second PAT scoped to this repository only keeps the ~27 portfolio repos exactly as read-only as
before, while allowing exactly one new capability: committing to this repo's own metadata file.

**Consequences:**
- `architecture.md` §2-§4 and §8 updated: new component behavior (in-app edit → GitHub commit),
  new trust-boundary row (second PAT, this-repo-only write), explicit statement that the
  no-write-path invariant still holds for all ~27 portfolio repos and is the one deliberate
  exception for this repo's own metadata file.
- `threat-model.md` updated: new asset (metadata-write PAT), new trust-boundary row, new STRIDE
  row (elevation of privilege via the new write path) — assessed as **Moderate**, accepted,
  because the existing accepted bearer-token-theft risk already implied read access to the same
  data, and the new capability is bounded to one non-sensitive file in one repo.
- `docs/PRD.md` FR/§7 updated to describe the in-app editing flow instead of hand-edit-only.
- Stage 9 (build) must verify the second PAT actually grants no broader write access than
  documented, exactly as ADR-0001 required for the read-only PAT.

**Owner:** Josh Muthumani.

---

## 2026-09-13 — UI design direction: Impeccable (of 5 compared)

**Decision:** The portfolio table UI ships in the "Impeccable" style — systematic, audit-grade
craft (restrained single accent, deterministic hierarchy, AA contrast) — chosen over 4
alternatives built and compared side by side per the mandatory design-style-matrix gate:
Taste (premium anti-generic; the skill's own scope note excludes dashboards/data tables, so
this column was an adapted-by-judgment approximation, not an in-scope skill run), Google
Stitch (Material-leaning; approximated locally rather than generated live in Stitch, to avoid
creating a persisted cloud project for a disposable comparison), UI/UX Pro Max (shadcn/Radix
conventions; the skill plugin is cached but not enabled in this session, so also an
approximation, not the live skill), and Raw Front-End (unaided baseline).

**Context:** First UI-design request for this project's one real screen (the repo-status
table with inline metadata editing). All 5 previews live at
`design-previews/portfolio-dashboard/*.html`. The initial Impeccable build then went through
an `/impeccable critique` pass (18/32 heuristic score) that caught two real defects before
the production build started: a stale-row background wash at 5.5% opacity (functionally
invisible, directly failing PRD `SC-2`'s "distinguishable at a glance" requirement) and
Active/Dormant badges differing only by hue with equal visual weight. Both were fixed and
re-verified (contrast ratios computed directly, not eyeballed) before Stage 9 build started.

**Rationale:** This is a single-user, dense data-scanning tool (PRD §3), not a marketing
surface — restraint and fast legibility outweigh personality. Two of the five columns weren't
produced by their canonical skills (noted above); re-running them properly would need the
`ui-ux-pro-max` plugin enabled for this session and either accepting `design-taste-frontend`'s
dashboard exclusion or finding a dashboard-appropriate "taste" skill instead.

**Consequences:** `app/page.module.css` and `app/globals.css` carry the finalized token set
(`--stale-wash: #f1eae1`, `--active-fill`/`--active-ink` tonal badge, hairline dividers at a
verified-visible weight). If a future session wants the UI/UX Pro Max or Taste columns done
properly, that's a re-run, not a re-litigation of the Impeccable pick itself.

**Owner:** Josh Muthumani.

---

## 2026-09-13 — Auth session mechanism: login form + httpOnly cookie

**Decision:** The dashboard's single shared bearer token (FR-8) reaches the browser via a
one-field login page that POSTs to `/api/login`, which sets an httpOnly, `sameSite: strict`
session cookie; `proxy.ts` (Next.js's current middleware convention) checks that cookie on
every route, pages included — not just API calls.

**Context:** `architecture.md` §4 specifies the trust boundary (bearer token, `Authorization`
header, no OAuth/session) but never specifies the concrete client-side mechanism for a full
page navigation, which can't attach a custom header. Asked Josh directly rather than
inventing an auth-shaped mechanism silently; the alternative considered was sessionStorage +
manual header attachment on API calls only, which would leave the page shell itself ungated
(FR-8 requires gating "including default/health routes").

**Rationale:** httpOnly cookie is not readable by JS (smaller XSS exposure than
sessionStorage) and satisfies "every route gated" with one mechanism instead of two
(page-level vs. API-level). No expiry is set on the cookie, matching the already-accepted
long-lived-static-token residual risk (`docs/PRD.md` §8).

**Consequences:** `lib/auth.ts` holds the shared `SESSION_COOKIE` name and the constant-time
comparison used by both `proxy.ts` and `/api/login`. No logout endpoint exists (not requested,
matches the PRD's accepted no-rotation risk) — if that's wanted later it's a small addition,
not a redesign.

**Owner:** Josh Muthumani.

---

## 2026-09-13 — Stage 9: MVP build merged (Phases 1-4), Phase 0/5 pending Josh's infra

**Decision:** N/A (status entry, not a decision) — recorded here because it changes what a
future session should assume is true, and README's stage line is the other place this must
stay in sync.

**Context:** PR #28 merged Phases 1-4 of the Stage 7 plan (read-only portfolio view, curated
metadata read side, stale-repo treatment, in-app metadata editing) with 52 passing unit tests
and two code-review passes. Issue #21 (MVP umbrella) was reopened after merge auto-closed it
prematurely — its own success criteria require Phase 5 verification, which hasn't happened.
Issues #22 (Phase 0: Vercel project, Phase.dev secret wiring, live PAT minting) and #27
(Phase 5: live verification against a real deployment) remain open and are explicitly blocked
on Josh's own account provisioning — no code-only path exists to close them.

**Consequences:** A future session picking this up should check #21/#22/#27's live state
before assuming anything about deployment status; nothing in this repo is deployed yet. The
staleness threshold used in `lib/staleness.ts` (30 days) is an implementation-time default,
not a doc-sourced or Josh-confirmed value — flagged in code, worth confirming if it ever
feels wrong in practice.

**Owner:** Josh Muthumani.

---
