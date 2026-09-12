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
