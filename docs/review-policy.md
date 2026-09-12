# Review Policy

Canonical: `SDLC-Process/sdlc-pipeline.md` § Stage 10 and `SDLC-Process/skills/review-gate.md`.
This document records projects-status's concrete adapter choices against that policy; it does
not restate or override the policy itself.

## Status

Stage 1 gate installed (`.github/workflows/gate.yml`, `independent-review.yml`,
`pr-verdict.yml`). No stack has been chosen yet (Stage 5 is still open), so `gate.yml`'s quality
job no-ops until a `package.json` exists — see the guard comment in that file. Branch protection
is on. The disposable-PR proof of the Phase 3 verdict passed: PR #1
(`chore/disposable-gate-proof`) ran the full Phase 1 → 2 → 3 chain and
`pr-external-review-bot[bot]` cast an `APPROVED` review against the PR's exact head SHA
(`ce03ec1`), confirmed via the pull-request reviews endpoint. PR closed without merging; branch
deleted.

## Automated checks required for every PR (Phase 1 — `gate.yml`)

- **Build & Test:** lint, typecheck, unit tests, build — currently a no-op pending Stage 5's
  stack choice (guarded on `package.json` existing).
- **Security:** gitleaks (secrets scan), semgrep (SAST: typescript/react/secrets rulesets),
  `npm audit --audit-level=high` (guarded on `package.json` existing).

## Independent review (Phase 2 — `independent-review.yml`)

External PR-Agent review via `openrouter/qwen/qwen3-coder-flash`, credentialed through the
`OPENROUTER_PR_APPROVER_KEY` repository secret (sourced from Phase.dev, per
`external-review-model-policy.md`). Waits for the `STAGE10_PHASE1_CHECK_NAMES` repository
variable's checks (`["Build & Test", "Security"]`) to pass before running. Posts review evidence
only — not a GitHub approval.

## Verdict (Phase 3 — `pr-verdict.yml`)

Validates Phase 2's evidence artifact against the exact PR head SHA, then casts a formal GitHub
`APPROVE` review as the `pr-external-review-bot[bot]` App identity (App ID `4708130`, via the
`PR_EXTERNAL_REVIEW_APP_ID` repo variable and `PR_EXTERNAL_REVIEW_APP_PRIVATE_KEY_B64` repo
secret). This is the review that satisfies branch protection's required-approval rule.
Proven on the disposable-PR run described above.

## Blocking severities

Critical/High security findings and failed required checks block progression, per
`~/.agents/rules/30-quality-security.md`. Medium/Low follow project policy once recorded here.

## Review artifacts

`.ai-code-review/results/` (created at Stage 1, currently empty).

## Findings disposition

Fixed, filed, or explicitly accepted by the authorized risk owner (Josh), recorded in
`docs/DECISIONS.md`.

## Adapters selected

| Adapter | Choice |
|---|---|
| Stack | Unresolved — Stage 5 |
| CI/VCS | GitHub — `joshaumuthumani/github-project-status` (public) |
| Authoring identity | KiloCode (`gh-kilocode[bot]`, App ID `4826170`) |
| External review | PR-Agent via OpenRouter (`qwen/qwen3-coder-flash`), verdict cast by PR External Review Bot (`pr-external-review-bot[bot]`, App ID `4708130`) |
| Deploy | Unresolved — Stage 5 |
