# ADR-0002: Preview deployments must not receive production secrets

**Status:** Accepted. **Date:** 2026-09-12. **Stage:** 3 (Architecture Council).

## Context

Both candidate deployment platforms (Vercel, Cloudflare Pages) create automatic preview
deployments per pull request/branch by default. `cloud-security-architect` flagged that if
preview builds inherit the same production environment variables as production — the GitHub PAT
and the dashboard bearer token — every PR preview becomes an additional live surface holding
production credentials, typically at a less-guarded, less-discoverable URL with no confirmed
platform-level access gate distinct from the one on production.

## Decision

Preview deployments must not receive the production GitHub PAT or bearer token. Implementation
must do one of:

1. Configure platform-scoped preview environment variables with empty/dummy values (preview
   builds show an empty or clearly-non-functional state), or
2. Disable preview deployments for this repository entirely.

This is a required decision recorded before implementation, not a Stage 5 nice-to-have — the
project's Stage 10 review gate already runs a PR pipeline for every branch, so preview-deploy
credential isolation must hold from the first PR.

## Alternatives considered

- **Do nothing (platform default)** — rejected: silently multiplies the number of live surfaces
  holding production credentials, with weaker access control than production itself.
- **Separate, distinct preview credentials (real but lower-privilege PAT)** — viable but
  unnecessary complexity for a single-user personal tool; deferred unless a concrete need for
  working preview builds with live GitHub data emerges.

## Consequences

- Preview builds will show an empty/error state rather than live portfolio data, by design.
- Implementation (Stage 9) must verify this at the chosen platform's actual environment-variable
  scoping UI/config, not just assume it from this ADR.

**Owner:** Josh Muthumani.
