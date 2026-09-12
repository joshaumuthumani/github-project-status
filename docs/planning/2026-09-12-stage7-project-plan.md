# Stage 7 Project Plan — GitHub Portfolio Status Dashboard

**Stage:** 7 (project plan, `project-planner`). **Status:** draft, pending Josh's approval.
**Inputs:** `docs/PRD.md` (approved, PR #18), `docs/architecture/architecture.md` §7 (phase
sequencing) and §9-10, `docs/architecture/adr/0001-0004`, `docs/evaluations/2026-09-12-stage5-tool-evaluation.md`,
`docs/planning/2026-09-12-stage6-batched-graphql-spike.md`.

This plan sequences PRD FR-1..FR-10 into buildable phases, estimates them, and names the
minimum shippable slice. It does not redecide architecture or requirements — see the linked
documents for those. Stage 8 (`task-decomposer`) breaks each phase below into feat/story issues.

## 1. What could kill this project (front-loaded)

Named here so the plan orders work to retire these first, not last:

- **Phase.dev secret availability at deploy/runtime.** The app has no hardcoded fallback by
  design (PRD §8). If Phase.dev integration doesn't work cleanly with the chosen deploy
  platform, nothing after Phase 0 can run in a real environment. Retired in Phase 0.
- **Fine-grained PAT scoping in practice.** Stage 5 confirmed this against GitHub's docs, but
  the first time a real PAT is minted and used server-side is the first real test. Retired in
  Phase 1 (read-only PAT) and again in Phase 4 (metadata-write PAT, ADR-0004).
- **GraphQL batched query at real portfolio size.** Stage 6 already spiked this successfully
  (~1.26s / 1 rate-limit point for 24 repos) — this risk is de-risked, not open, but Phase 1
  re-verifies it against the live discovered repo list rather than the spike's hardcoded list.
- **Bearer-token gate correctness.** If the auth check is wrong (e.g. misses a route), the
  whole PRD's privacy requirement (§6) fails silently. This is why Phase 0 builds the gate
  before any real data flows through it, and why it is explicitly tested, not assumed.

## 2. Minimum shippable slice

**FR-1, FR-2, FR-4, FR-5, FR-6, FR-7, FR-8, FR-9** (auto-discovery, batched fetch, one-page
render with partial-failure handling, bearer-token gate, server-side-only PAT, Phase.dev
secrets) deployed to production behind the bearer token. This is Phases 0-1 below and satisfies
SC-1, SC-4, and half of the PRD's success criteria on its own.

**FR-3, FR-10** (curated metadata merge and in-app editing, ADR-0004) are real scope, not
stretch — the PRD (§1, G3) treats "let Josh apply a durable label GitHub has no field for" as a
core goal, not a nice-to-have — but they are **separable**: the app is genuinely useful and
shippable without them for a few days if Phase 2-3 slip. If forced to cut for time, cut FR-10
(in-app editing) before FR-3 (metadata merge/display) — a hand-edited JSON file still satisfies
G3 in degraded form; dropping FR-3 entirely would abandon G3.

**Explicitly not in the minimum slice:** stale-repo visual treatment (FR-4's "identifiable at a
glance" clause, Phase 3 below) can ship as a fast-follow — the raw data being visible at all
(Phase 1) is the higher-value increment.

## 3. Phases, estimates, and dependencies

Three-point estimates in developer-hours (optimistic / likely / pessimistic), solo developer,
assuming focused sessions rather than calendar time. These are planning estimates, not
commitments — re-estimate at Stage 8 once each phase is decomposed into tasks.

| # | Phase | Scope (FRs) | Depends on | Est. (O/L/P hrs) |
|---|-------|-------------|------------|-------------------|
| 0 | **Environments + deploy tail** | Vercel project (paired Preview/Production per ADR-0002), Phase.dev project + both secret slots wired to each environment, GitHub PAT #1 (read-only, ADR-0001) minted and stored, bearer token generated and stored, Next.js skeleton deployed and reachable, bearer-token gate on every route (FR-8) verified with a real request | Stage 5/6 evidence (done) | 3 / 5 / 9 |
| 1 | **Read-only portfolio view** | FR-1, FR-2, FR-4, FR-5, FR-6, FR-7, FR-9; one-page render with partial rendering on per-repo failure | Phase 0 | 4 / 7 / 12 |
| 2 | **Curated metadata (read side)** | FR-3: git-tracked metadata file, merge into portfolio view, unannotated repos still render | Phase 1 | 2 / 3 / 5 |
| 3 | **Stale-repo visual treatment** | FR-4's staleness distinction (sort or visual marker) | Phase 1 (not Phase 2 — operates on the same `pushedAt` data) | 1 / 2 / 3 |
| 4 | **In-app metadata editing (ADR-0004)** | FR-10: second scoped PAT (`contents: write`, this repo only), edit UI, commit-back, re-render on next refresh | Phase 2 | 4 / 7 / 11 |
| 5 | **Verification pass** | SC-1..SC-5 walked explicitly, incl. the partial-failure test case PRD §9 calls out as "not merely assumed" | Phases 1-4 | 2 / 3 / 5 |

**Critical path:** 0 → 1 → 2 → 4 → 5 (Phase 3 branches off Phase 1 and can run in parallel with
Phase 2, or after — it has no downstream dependents). Critical-path total: **15 / 25 / 42 hours**
(optimistic/likely/pessimistic), i.e. likely a small number of focused sessions rather than a
multi-week effort, consistent with the PRD's single-user/no-SLA scope.

**Why Phase 0 is its own phase, not folded into Phase 1:** `project-workflows.md`'s environment
rule — "no project *ships* without paired environments, but no project *starts* with them,
gated on Stage 5" — is satisfied; Stage 5 already passed, so Phase 0 is this project's first
implementation phase, not a precondition sitting outside the plan. Sequencing it first also
retires the Phase.dev and bearer-token risks (§1) before any data-handling code exists to hide
a mistake in.

## 4. Risk log

| Risk | Phase surfaced | Owner | Mitigation / unblock |
|---|---|---|---|
| Phase.dev secret injection fails on Vercel (env var not visible at runtime) | 0 | Josh | Stage 5 confirmed the platform docs; Phase 0 includes an explicit smoke test (deployed function reads both secrets) before any other code is written |
| Fine-grained PAT grants broader access than intended | 1, 4 | Josh | Verify against a live token in Phase 1 (read-only) and again in Phase 4 (write-scoped) — not assumed from docs alone, per architecture.md §8's carried-forward verification item |
| Metadata file and GitHub drift (renamed/deleted repo orphans an entry) | 2 | Josh | Accepted residual risk, PRD §8 — no mitigation built in MVP; not a plan blocker |
| Bearer-token gate has a route-coverage gap | 0 | Josh | Explicit test in Phase 0 hits every route class (page, API, default/health) unauthenticated and confirms rejection, before Phase 1 adds real data behind it |
| Scope creep into per-repo detail view mid-build | any | Josh | PRD §2 and architecture.md §7 both explicitly exclude it; this plan carries zero hours for it — treat any drift toward it during Stage 9 as a new PRD, not free-riding on this one |

## 5. Stage 8 handoff

Each phase above becomes one or more Stage 8 (`task-decomposer`) stories:
- Phase 0 → environment/infra setup story (not app code — may not need the full vertical-slice
  template Stage 8 normally uses).
- Phases 1-4 → one story per phase, each already scoped to specific FRs and independently
  testable per the acceptance criteria those FRs already state in the PRD.
- Phase 5 → a verification story tied directly to PRD §9's success criteria, not new scope.

## 6. Revision history

| Date | Summary |
|---|---|
| 2026-09-12 | Initial draft, from approved PRD (PR #18) and architecture.md §7 phase sequencing. Pending Josh's approval. |
