# SDLC Project Adapter

**Tier**: `load-bearing` (Every pipeline stage runs; none are skipped)
**Current Stage**: 9 (MVP build), pending operational readiness (webhook, verification)
**Authoritative Intent Store**: GitHub Project #9 ("GitHub Project Status")

## Required Project Commands
- `/sdlc-status` — Project local status overlay
- `/sdlc-readiness` — Project readiness check
- `/phase-0-entry` — Entry for Phase 0 environment setup

## Approved Skips & Deferred Integrations
- Graphify lifecycle: explicitly skipped for now (documentation-only/no application code originally, but now app code exists).


## Durable Evidence
- README status: `README.md`
- Decisions log: `docs/DECISIONS.md`
- Test pass evidence: (CI/CD links)









### Graphify Lifecycle
- Canonical CI-only Graphify configuration added.
- Marker: `docs/graphify.json`.
- Drift behavior: > 10% graph-size drift requires manual Stage 10 review. Missing artifacts fail CI.

## Capability Gaps & Blocked Readiness
- **GitHub Identity**: `gh-kilocode[bot]` identity is unavailable for the current Kilo agent. Blocked the 'Prove GH-KiloCode identity' capability and full operating flow test.
- **OpenDesign**: Engine unavailable. UI design-track conditional stages 3A/4A are blocked. Style-lock missing.

Full operating flow (Work Item 10) was halted due to missing GitHub identity and OpenDesign capability, complying with the "fail closed" readiness rules.
