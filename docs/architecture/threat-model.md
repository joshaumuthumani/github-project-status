# Threat Model — GitHub Portfolio Status Dashboard

**Stage:** 3 (Architecture Council). **Author:** `security-architect`. **Date:** 2026-09-12.
**Input:** `architecture.md` (reconciled draft, post-`backend-architect`/`cloud-security-architect`
review), `docs/planning/2026-09-12-portfolio-dashboard-discovery.md`.

## 1. Scope, assumptions, assets, actors

**Scope:** the dashboard web app (frontend + backend API), its two credentials (GitHub PAT,
bearer token), the curated metadata file, and the deployment platform (Vercel or Cloudflare —
either satisfies this model unchanged). Out of scope: GitHub's own platform security, Phase.dev's
internal security (treated as a trusted secret broker per project-wide policy).

**Assumptions:**
- Single human user (Josh). No multi-tenancy, no user accounts.
- Phase.dev is the sole system of record for both secrets; the deployment platform's env var
  store is a runtime copy, not a second source of truth.
- The deployment platform's TLS termination and instant-rollback are trusted platform features,
  not independently re-implemented.
- No database exists; the curated metadata file is git-tracked and non-sensitive.

**Assets** (ranked by sensitivity):

| Asset | Classification | Why it matters |
|---|---|---|
| GitHub PAT (fine-grained, read-scoped per ADR-0001) | **Secret, high value** | Grants read access to ~27 repos, some private. Compromise reveals private source code, issues, PRs. |
| Bearer token (dashboard access secret) | **Secret, moderate value** | Sole gate to the dashboard. Compromise reveals the same GitHub data the PAT can read, via the app itself — a lower-effort path than stealing the PAT directly if the app has no other controls. |
| Curated metadata (`status`/`purpose`/`production` flags) | **Non-sensitive** | No PII, no secrets. Worst case if tampered: misleading portfolio labels, not a security incident. |
| GitHub-sourced operational data (PR/issue counts, activity) | **Non-sensitive in transit, but private-repo-derived** | Not secret in itself, but reveals private-repo activity patterns if exposed to an unauthorized viewer. |

**Actors:**

| Actor | Trust level |
|---|---|
| Josh (browser, bearer token holder) | Trusted — the only intended user |
| Backend API (server-side) | Trusted compute boundary — sole holder of the GitHub PAT |
| GitHub API | Trusted external service |
| Phase.dev | Trusted secret broker (per project-wide policy) |
| Deployment platform (Vercel/Cloudflare) | Trusted infrastructure provider, but its own IAM/config is an attack surface (see §4) |
| Anonymous internet actor | **Untrusted** — the only realistic adversary in this model, given single-user scope |

## 2. Trust-boundary table

| Source → Destination | Data | AuthN | AuthZ | Encryption | Validation | Audit |
|---|---|---|---|---|---|---|
| Browser → Backend API | Bearer token, refresh requests | Bearer token possession | Implicit (token = full access, no roles) | TLS (platform-managed) | Token presence/match check on every route, including default/health routes (architecture.md §2) | Platform request logs only |
| Backend API → GitHub | GraphQL query (batched, ADR-0003), PAT in Authorization header | GitHub PAT | Repo-scoped, read-only (ADR-0001) | TLS | N/A (trusted destination) | GitHub's own API audit log (not this app's) |
| Backend API → Curated metadata file | Filesystem read of a build-bundled file | N/A (not network-crossing) | N/A | N/A (build artifact) | Tolerant parse: malformed single entry degrades gracefully, fully malformed file fails closed (architecture.md §2) | Git history |
| Phase.dev → Deployment platform env store | GitHub PAT, bearer token | Josh's Phase.dev session/CLI auth | Manual, Josh-initiated sync | TLS (Phase.dev ⇄ platform API) | N/A | Phase.dev's own sync/audit log |
| Deployment platform GitHub App → Repository | Push-to-deploy trigger | Platform GitHub App installation | Should be scoped to this repo only (architecture.md §4, unverified until Stage 5) | N/A | N/A | Platform + GitHub deployment logs |

## 3. STRIDE analysis

| Threat | Component/boundary | Attack scenario | Severity | Mitigation | Residual risk |
|---|---|---|---|---|---|
| **Spoofing** — bearer token theft | Browser ⇄ Backend API | Token exfiltrated via XSS, a misconfigured wildcard CORS policy, or accidental logging/URL leakage; attacker replays it to read all portfolio data | **High** | CORS must default-deny, no wildcard origin (architecture.md §4, ADR-pending-implementation). Token transmitted only via `Authorization` header, never a URL query param. No XSS-introducing client-side rendering of unescaped GitHub content. | Token has no expiry/rotation (architecture.md §10) — a stolen token remains valid indefinitely until manually revoked. **Accepted**, owner Josh, given single-user low-blast-radius scope; revoke-and-reissue via Phase.dev is the recovery path (see §6). |
| **Spoofing** — classic-PAT scope creep | Backend API → GitHub | If implementation accidentally uses a classic PAT instead of the fine-grained PAT mandated by ADR-0001, the credential's real privilege silently exceeds the documented boundary | **High** (if realized) | ADR-0001 requires a fine-grained, explicitly-scoped PAT. Stage 5/implementation must verify the actual token type issued, not assume from naming. | None if ADR-0001 is followed; this is a verification gap, not an architectural one. |
| **Tampering** — curated metadata | Curated metadata file | Attacker with repo write access (not this app's access model) commits false `status`/`production` flags | **Low** | Metadata is non-sensitive (§1); worst case is a misleading label, not data exposure. Git history provides full audit/recovery. | Accepted — not a security-relevant asset. |
| **Tampering** — preview deployment exposure | Deployment platform | Platform auto-creates a preview build for a PR; if it inherits production secrets, an attacker who discovers the preview URL gains the same access as production, at a less-guarded endpoint | **High** | ADR-0002: preview deployments must not receive production PAT/bearer token — dummy/empty preview env vars, or preview deploys disabled entirely. | None if ADR-0002 is implemented and verified at Stage 5/9 (Build loop). **This is the highest-value single mitigation in this model** given how easily it could be missed as "just a platform default." |
| **Repudiation** | N/A | Single-user, no multi-party actions to dispute; not a meaningful threat at this scope | **Low** | N/A | Accepted — out of scope for a single-user personal tool. |
| **Information disclosure** — PAT in logs/build output | Backend API, deployment platform, Phase.dev sync | PAT appears in a build log, error message, or CI artifact, readable by anyone with access to those logs | **High** | Architecture requires the PAT is "never included in any client bundle, log line, or error message" (architecture.md §4). Verify at Stage 5/9: platform build logs, error-handler code paths, and the Phase.dev→platform sync step itself (manual, not scripted through an intermediate log-producing tool). | **Not yet verified** — this is a required Stage 5/9 verification item, not yet a proven control. Tracked in §6. |
| **Information disclosure** — GitHub data to wrong viewer | Backend API → Browser | Bearer-token bypass or CORS misconfiguration exposes private-repo-derived data (PR/issue content, activity) to an unauthorized origin/viewer | **High** | Same mitigation as the Spoofing/bearer-token-theft row above — this is the consequence, that row is the cause. | Same residual risk as above (no token rotation). |
| **Denial of service** — GitHub secondary rate-limiting | Backend API → GitHub | Concurrent/rapid-fire calls trigger GitHub's abuse-detection throttling, breaking every subsequent refresh until it clears | **Medium** | ADR-0003: single batched GraphQL query per refresh instead of N parallel REST calls. | Low — batching substantially reduces but does not eliminate rate-limit exposure; single-user usage pattern makes this unlikely regardless. |
| **Denial of service** — malformed metadata file | Curated metadata file | A bad commit to the metadata file breaks parsing for the whole dashboard | **Low** | architecture.md §2: tolerant per-entry parsing, fail-closed only on total file corruption, with a clear error message (not a silent stale/blank page). | Accepted — self-inflicted by the sole maintainer (Josh), recoverable via git revert. |
| **Elevation of privilege** — deploy identity conflated with runtime PAT | Deployment platform → Repository | If the platform's push-to-deploy GitHub App shares scope/credentials with the runtime PAT, compromising one compromises both | **Medium** | architecture.md §4 requires these be named as distinct credentials with distinct blast radii; deploy identity scoped to this repo only. | **Not yet verified** — Stage 5 item, tracked in §6. |

## 4. Attack-surface inventory

| Surface | Present? | Notes |
|---|---|---|
| External network (public internet → app) | Yes | Single API surface: the backend's `/api/portfolio` (or equivalent) endpoint, bearer-token gated. No anonymous read path (architecture.md §4). |
| Internal (service-to-service) | Minimal | Backend → GitHub only. No internal service mesh, no microservices. |
| Data (storage, backups) | Minimal | No database. Curated metadata is git-tracked; git itself is the only "storage" surface, already protected by this repo's existing branch protection + Stage 10 review gate. |
| Infrastructure (cloud config, IAM) | Yes | Deployment platform's env var store, preview-deployment behavior, and push-to-deploy GitHub App scope — all flagged above as needing Stage 5 verification. |
| Administrative | None | No in-app admin UI; metadata edited via commit + deploy (architecture.md §2). Removes an entire admin-auth surface by design. |
| Supply chain | Partial | Stage 10 review gate (existing, already enforced on this repo) covers code entering `main`: required checks, independent review, formal approval. Deploy-time supply chain (does every `main` merge auto-deploy to prod with no separate gate?) is flagged in architecture.md §4 as needing an explicit, deliberate answer given the "load-bearing" tier. |

## 5. Prioritized required changes

No Critical findings. High findings, in priority order:

1. **Implement ADR-0002 (preview-deployment credential isolation) before the first real deploy.**
   Highest-value mitigation in this model — an unisolated preview deployment would otherwise be a
   second, weaker-guarded production-equivalent surface from day one.
2. **Verify ADR-0001 (fine-grained, read-only PAT) is what's actually issued**, not a classic PAT,
   before the backend API is granted any live credential.
3. **Verify the PAT/bearer token never appear in build logs, error output, or CI artifacts** —
   architecture.md already requires this; this threat model requires it be *proven*, not asserted,
   before go-live.
4. **Name and scope the deploy identity distinctly from the runtime PAT**, confirming least
   privilege (this repo only) at the platform's actual configuration screen.

All four are **verification/implementation gates for Stage 5 and Stage 9 (Build loop)**, not
open architectural questions — the architecture already specifies the required control; nothing
here requires `project-architect` to revise the design again.

## 6. Accepted risks, verification criteria, unresolved questions

**Accepted risks** (named, owner Josh, per architecture.md §10):

- Bearer token has no rotation/expiry; compromise requires manual revoke-and-reissue via
  Phase.dev. Recovery path: revoke the leaked token in Phase.dev, issue a new one, redeploy.
  Detection relies on Josh noticing unexpected dashboard access or GitHub API activity — no
  automated alerting exists or is planned for MVP (architecture.md §6, §10).
- Same accepted gap applies symmetrically to the GitHub PAT: no rotation cadence, same
  revoke-and-reissue recovery path via Phase.dev.
- No environment separation, no alerting/detection stack, no rollback drill beyond the platform's
  native instant-rollback — all reasonable for a single-user, load-bearing-but-low-blast-radius
  personal tool.
- Metadata/GitHub drift (renamed/deleted repo orphans a curated metadata entry) — cosmetic, not
  a security risk.

**Verification criteria for Stage 5/9** (must be checked against real platform behavior, not
assumed):

- [ ] Confirm the deployed PAT is fine-grained and scoped to only the ~27 target repos (ADR-0001).
- [ ] Confirm preview deployments do not receive production secrets (ADR-0002).
- [ ] Confirm CORS is default-deny (no wildcard) on the backend API.
- [ ] Confirm neither secret ever appears in build logs, preview output, error messages, or
      client-side bundles, on the actually-chosen platform.
- [ ] Confirm the platform's push-to-deploy GitHub App is scoped to this repository only, distinct
      from the runtime PAT.
- [ ] Confirm every merge to `main` auto-deploying to production is a deliberate, documented
      choice (not an unexamined platform default), matching this repo's "load-bearing" tier.

**Unresolved questions carried to Stage 5** (falsifiable, per architecture.md §8): GraphQL query
feasibility within serverless timeout limits; fine-grained PAT repo-scoping in practice; current
GitHub rate-limit figures; platform secret-exposure guarantees — all listed in full in
`architecture.md` §8.

## 7. Disposition

No Critical or High architectural design flaw requires `project-architect` to revise the design
again. The four "prioritized required changes" in §5 are implementation/verification gates on an
already-sound design (ADR-0001, ADR-0002, ADR-0003 already capture the required architectural
decisions), not evidence the architecture itself needs another revision round. **Stage 3 threat
model is complete; architecture and threat model agree.**
