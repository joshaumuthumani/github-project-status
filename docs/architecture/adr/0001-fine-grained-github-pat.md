# ADR-0001: Use a fine-grained, read-only GitHub PAT

**Status:** Accepted. **Date:** 2026-09-12. **Stage:** 3 (Architecture Council).

## Context

The architecture's core trust boundary relies on the GitHub credential being genuinely
read-only, with no write path back to GitHub (`architecture.md` §4). `cloud-security-architect`
flagged that a **classic** GitHub PAT's `repo` scope is not read-only: it grants full read/write
access to every private repository the account can see, not just the ~27 repos in scope. Using a
classic PAT would make the credential itself contradict the documented boundary, regardless of
what the application code does with it.

## Decision

Use a **fine-grained GitHub PAT**, scoped explicitly to the ~27 target repositories, with only
read permissions granted: `Contents: Read`, `Metadata: Read`, `Pull requests: Read`,
`Issues: Read`. No write, no administration permission, on any repo.

## Alternatives considered

- **Classic PAT with `repo` scope** — rejected: grants read/write to all accessible private
  repos, a materially larger blast radius than this app needs or the architecture claims.
- **GitHub App installation token** — viable alternative with similarly fine-grained scoping;
  deferred to Stage 5 as an implementation-detail choice between two credential types that both
  satisfy this ADR's read-only, scoped-repo requirement.

## Consequences

- Leaked-credential blast radius is limited to the ~27 named repos, read-only.
- Stage 5 must verify a fine-grained PAT can actually be scoped to exactly the target repo list
  in practice (not just in GitHub's documentation) before implementation relies on it.

**Owner:** Josh Muthumani.
