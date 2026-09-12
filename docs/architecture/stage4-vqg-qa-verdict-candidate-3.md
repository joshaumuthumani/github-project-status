# Stage 4 VQG — Independent QA Verdict (candidate-3)

**Reviewer seat:** QA (functional/structural correctness only — not Design Review; no
coordination with the Design Review seat per VQG separation-of-seats requirement).
**Work item:** joshaumuthumani/github-project-status#9
**Reviewed:** 2026-09-12T19:23:38Z
**Entry packet:** `docs/architecture/stage4-vqg-entry.yaml` (candidate-3)

## Boundary integrity

Recomputed SHA-256 for all three boundary files against the yaml manifest and the
`stage4-vqg-boundary-lines.txt` sidecar:

| File | Manifest SHA-256 | Recomputed | Match |
|---|---|---|---|
| portfolio-dashboard-archify.html | `639d86cc...5dd816a8` | `639d86cc...5dd816a8` | ✅ |
| portfolio-dashboard-topology.html | `7608cdef...1875b1072` | `7608cdef...1875b1072` | ✅ |
| portfolio-dashboard.archify.json | `0c6f4db2...a685b4f8` | `0c6f4db2...a685b4f8` | ✅ |

Byte counts (716761 / 36143 / 4624) also match the manifest exactly. `boundary_sha256`
(`8a1b15d3...485ad0e711`) is the SHA-256 of `stage4-vqg-boundary-lines.txt`'s content and is
internally self-consistent. No `stage4-vqg-manifest.txt` referenced by the older `.md` packet
exists on disk; `stage4-vqg-entry.yaml` explicitly supersedes `stage4-vqg-entry.md` as the sole
authoritative entry, so this is not a boundary defect — noted for completeness only.

**Verdict: PASS.** Boundary is exactly what was reviewed; no drift.

## Functional/structural checks (VQG §5.5/§8 scope: layout integrity, text-zoom reflow,
color-independent connector semantics, self-contained artifact, topology fidelity)

### 1. Self-contained artifact (no network dependency)
Grepped both HTML files for `https?://` outside the SVG namespace URI
(`http://www.w3.org/2000/svg`, not a network request). Zero remaining Google Fonts or other
external references in either file — confirms the candidate-3 claim (fonts.gstatic.com /
fonts.googleapis.com references removed from archify.html; font stack falls back to
system monospace via `ui-monospace, SFMono-Regular, Menlo, Consolas, ...` plus a
`local()`-only `@font-face`).

**Verdict: PASS.**

### 2. Connector label/routing overlap, topology.html, stacked breakpoint (candidate-2 fix, re-verified)
Confirmed in source: `render()` computes `stacked = dr.width <= 900` (line 604) and forces
`fromSide`/`toSide` to `autoSide()` fallback when stacked (line 605), regardless of any
explicit `fromSide`/`toSide` on the connection object. Reviewed the full-page mobile
(390px) screenshot in four vertical slices — no connector label overlaps any heading or
node text anywhere in the document (browser→frontend, frontend→backend, backend→metadata,
backend→github, backend→pat-env, backend→bearer-env, phasedev edges all render cleanly
stacked, each label sitting in its own line between nodes). This contradicts the earlier
non-independent preparer note in `stage4-vqg-entry.md` (which predates the candidate-2 fix
and was never updated) — that finding is now superseded and confirmed fixed, not merely
claimed.

**Verdict: PASS.**

### 3. backend→github connector fix at desktop/tablet (candidate-3's own claimed fix)
Confirmed in source: `{ from: 'backend', to: 'github', ..., fromSide: 'right', toSide: 'left' }`
(line 506) now has explicit sides, matching sibling desktop-width connectors. Reviewed
desktop (1920px), desktop_1214 (1214px), and tablet (768px) screenshots: the backend→GitHub
connector routes as a clean right-to-right-edge line with its "batched GraphQL (PAT,
read-only)" label sitting above the line in open space — does not cross through the
"GitHub.com" boundary/node title at any of the three widths tested.

**Verdict: PASS.**

### 4. Document structure / landmarks (candidate-3's own claimed fix, topology.html)
Confirmed in source: `<main>` wraps body content (line 300), `<h1 id="diagram-title">`
is a real heading (line 340, previously a styled div per the changelog claim),
`<section aria-labelledby="diagram-title">` (line 339) and
`<section aria-label="...">`/`<h2 class="sr-only">` (lines 329-330) wrap the legend, and
`<section aria-labelledby="graph-table-heading">` / `<h2 class="sr-only">` (lines 679-680)
wraps the machine-readable table. All landmarks present and correctly cross-referenced by
`id`.

**Verdict: PASS.**

### 5. archify.html mobile "clipping" — re-classified as pannable canvas, not defect
`archify-mobile.png` (fixed 390×1218 viewport, not full-page — consistent with an app-shell
canvas rather than document overflow) shows Platform Env Store / Curated Metadata nodes
partially past the visible edge in the initial frame. `archify-mobile-scrolled.png` and
`archify-mobile-scrolled2.png` show the same canvas after horizontal pan, with the
previously-edge-truncated nodes (Store, PAT, GitHub.com, ...data) now fully inside the
viewport and a horizontal scrollbar visible at the bottom of the canvas — confirming content
is reachable by panning, not lost. This matches the candidate-3 claim
(`scrollWidth=744` vs `clientWidth=356` at 390px). I did not independently re-run the
`page.evaluate` scroll check, but the visual before/after pan evidence is consistent with
the claim and with a designed zoomable/pannable canvas (PATH/MAP/LENS controls visible in
every archify screenshot).

**Verdict: PASS**, with one open note below.

### 6. Text zoom 200% reflow
Reviewed `topology-text_zoom_200.png` and `archify-text_zoom_200.png` (1600px viewport,
CSS zoom 200%). Topology.html reflows to a single column with all labels intact and
readable, no truncation or overlap observed. archify.html's app-shell chrome (toolbar,
guided-views panel, side cards) reflows to stacked single-column layout without visible
button/label collision at this zoom.

**Verdict: PASS.**

### 7. Topology fidelity to source (architecture.md, threat-model.md, ADR-0001/0002/0003)
Cross-checked both candidates' node/edge sets against `architecture.md` §2/§4 and
`threat-model.md` §2:
- Actors/components (Browser, Anonymous caller, Web app/frontend, Backend API layer,
  Curated metadata file, GitHub PAT, Bearer token/env store, GitHub.com, Phase.dev, Josh)
  are present in both candidates and match the source's named components.
- Trust-boundary framing (Untrusted network / Deployment platform / Env var store /
  External API / Secret broker) matches `threat-model.md` §1-2's trust table.
- ADR references rendered in-diagram (ADR-0001 fine-grained PAT scoping, ADR-0002 preview
  deploy secret isolation, ADR-0003 batched GraphQL) match the ADR file contents.
- topology.html models the env-store secret as two nodes (`pat-env`, `bearer-env`);
  archify.json/html models it as one node (`envstore`) holding both. Both are structurally
  valid representations of the same "Env var store (runtime secret copy)" boundary in the
  source docs — a renderer-level granularity choice, not a fidelity defect, and consistent
  with the entry packet's framing of these as two independently-designed competing
  renderers of one topology.

**Verdict: PASS.**

## Open note (not a blocking finding)

The `archify-mobile-scrolled.png` → `archify-mobile-scrolled2.png` pair render as visually
identical in this review; if a third capture was intended to show a different pan state it
did not do so. This does not affect the finding in §5 above (the first scrolled capture
already shows the previously-clipped nodes correctly reachable), and I could not independently
re-run the referenced `page.evaluate` scroll assertion in this session — I relied on the
visual evidence, which supports the claim. Recommend, non-blocking: re-capture or discard the
duplicate frame before this evidence set is archived.

## Overall QA verdict

**PASS.** All candidate-2 STOP items attributed to the QA seat (topology.html document
structure/landmarks; archify.html network dependency) are fixed and independently verified
against source, not merely re-asserted. The backend→github connector fix (attributed to both
seats on candidate-2) is also verified fixed at desktop and tablet. No new functional or
structural defect found in candidate-3. Boundary hashes match exactly; no scope drift.

This verdict covers functional/structural correctness only, per this seat's mandate. It does
not supersede or comment on the separate Design Review seat's aesthetic verdict for
candidate-3.
