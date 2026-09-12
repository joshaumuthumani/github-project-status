# projects-status


A live, GitHub-backed portfolio-status dashboard for Josh's repositories: a portfolio rollup
(what's happening across ~27 repos) and a per-repository operational view (open PRs/issues,
activity, contributors, bots), backed by GitHub as the live source plus a small curated local
metadata file for what GitHub can't know (tags, purpose, production status).

Idea brief: `~/Brain/Ideas/github-project-status.md`

- **Tier:** load-bearing. Every pipeline stage runs; none are skipped.
- **Stage:** 7 in progress — PRD approved and merged (#16, PR #18: `docs/PRD.md`). Project plan
  drafted (`docs/planning/2026-09-12-stage7-project-plan.md`), pending Josh's approval before
  Stage 8 task decomposition. Stage 6 (rapid prototype — batched-GraphQL spike confirmed
  ADR-0003) and Stage 4 (architecture diagram, VQG-reviewed, `docs/architecture/portfolio-dashboard-archify.html`,
  #9/PR #14) are complete.

Not FlowDesk (personal PM/planning) and not the parked `agent-dashboard` idea (general-purpose
agent/workflow dashboard). See the idea brief's Boundaries section.

## Contributing

Trunk-based: `main` is always deployable. Work happens on `feat/…`, `fix/…`, or `chore/…`
branches, merged via pull request — even as the sole reviewer, since PR merge is what triggers
the Stage 10 review gate (CI checks, independent AI review, and the formal approval verdict).
Branches are deleted after merge. No direct pushes to `main` and no self-merging around the
gate; see `docs/review-policy.md`.
