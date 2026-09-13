# projects-status


A live, GitHub-backed portfolio-status dashboard for Josh's repositories: a portfolio rollup
(what's happening across ~27 repos) and a per-repository operational view (open PRs/issues,
activity, contributors, bots), backed by GitHub as the live source plus a small curated local
metadata file for what GitHub can't know (tags, purpose, production status).

Idea brief: `~/Brain/Ideas/github-project-status.md`

- **Tier:** load-bearing. Every pipeline stage runs; none are skipped.
- **Stage:** 9 in progress — MVP build. Phases 1-4 of the Stage 7 plan (read-only portfolio
  view, curated metadata, stale-repo treatment, in-app metadata editing) are merged (#21, PR
  #28) with a passing unit-test suite and two code-review passes. **Nothing is deployed yet:**
  Phase 0 (#22 — Vercel project, Phase.dev secret wiring, PAT minting) and Phase 5 (#27 — live
  verification, blocked on #22) are open and need Josh's own account provisioning; no code-only
  path exists to close them. Design direction (Impeccable) and the auth session mechanism
  (login form + httpOnly cookie) are recorded in `docs/DECISIONS.md`. Stages 1-8 (init through
  task decomposition) are complete.

Not FlowDesk (personal PM/planning) and not the parked `agent-dashboard` idea (general-purpose
agent/workflow dashboard). See the idea brief's Boundaries section.

## Contributing

Trunk-based: `main` is always deployable. Work happens on `feat/…`, `fix/…`, or `chore/…`
branches, merged via pull request — even as the sole reviewer, since PR merge is what triggers
the Stage 10 review gate (CI checks, independent AI review, and the formal approval verdict).
Branches are deleted after merge. No direct pushes to `main` and no self-merging around the
gate; see `docs/review-policy.md`.
