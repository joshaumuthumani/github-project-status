---
target: design-previews/portfolio-dashboard/impeccable.html (chosen Impeccable direction, rev 2)
total_score: 18
max_score: 32
na_heuristics: 5,10
p0_count: 1
p1_count: 1
timestamp: 2026-09-12T23-15-40Z
slug: esign-previews-portfolio-dashboard-impeccable-html
---
### Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | No loading/in-flight state shown for Refresh; "Fetched 2 minutes ago" is the only status cue |
| 2 | Match System / Real World | 3 | Plain-language labels throughout, no jargon |
| 3 | User Control and Freedom | 2 | No cancel/undo affordance visible for the inline edit path (static mockup, but nothing suggests one exists) |
| 4 | Consistency and Standards | 3 | Badge/tag pattern applied consistently row to row |
| 5 | Error Prevention | n/a | No destructive action exists on this surface to guard against |
| 6 | Recognition Rather Than Recall | 3 | All states are text-labeled, not icon-only |
| 7 | Flexibility and Efficiency | 1 | No sort, filter, or bulk action for a 27-repo list; single-user power-user path (jump to stale/production repos) doesn't exist |
| 8 | Aesthetic and Minimalist Design | 2 | Core failure: rows carry almost no differentiating visual weight (see Priority Issues) |
| 9 | Error Recovery | 2 | Failure row is labeled but offers no retry affordance |
| 10 | Help and Documentation | n/a | Single-user personal tool by PRD design; no help surface intended |
| **Total** | | **18/32** | **Acceptable (56%)** |

### Design Specificity Verdict

**LLM assessment**: This reads as a generic admin-table template (pill badges, blue link accent, right-aligned numerics) that could sit in any SaaS back-office. That's a defensible choice for an Operate-mode, single-user tool — but the specific product requirement this surface exists to satisfy (PRD `SC-2`: "stale vs. active repos are visually distinguishable... without needing to cross-reference dates manually") is not actually met by the current execution. The design isn't just generic, it's under-differentiated relative to its own stated job.

**Deterministic scan** (`detect.mjs`, degraded/CLI-only — see note below): 1 warning, `flat-type-hierarchy` (11/13/20px). No other findings; the em-dash, unicode-glyph, and colored-border-left issues from the prior revision are gone.

**Browser visualization**: skipped. This is a static comparison file served through AO's confined preview panel, not a dev server; standing up `live-server.mjs` plus script injection for a single disposable mockup wasn't a good trade here. Evidence instead comes from your attached screenshot plus source reading — noted as a gap, not silently substituted.

### Overall Impression

You're right, and the screenshot proves it faster than the source code does: at a normal viewing distance the stale rows and the active rows are nearly the same color. The single biggest opportunity is to stop treating "restraint" and "invisible" as the same thing — Impeccable's own bar is AA contrast and deliberate hierarchy, not the absence of contrast.

### What's Working

- The failed-load row correctly keeps the repo visible with a scoped inline error instead of hiding the whole table (matches PRD FR-6's fail-visibly requirement).
- Numerics are right-aligned with tabular figures, so PR/issue counts are actually scannable column-to-column.
- Status is never color-only — every colored state (Active, Dormant, Stale, error) carries a text label too, so this doesn't fail on color-blindness grounds, just on overall weight.

### Priority Issues

**[P0] Stale-row treatment is imperceptible, which directly fails the product requirement it exists to satisfy**
- **Why it matters**: `--stale-wash: rgba(150, 99, 26, 0.055)` is a 5.5%-opacity tint. On a real monitor under normal lighting this is functionally invisible — you're relying on the 11px "STALE" text tag alone to do the entire job PRD `SC-2` assigns to the row. That's the exact complaint you just gave.
- **Fix**: Raise the wash to something actually legible (test around 10-14% opacity, or switch to a flat pale-amber background token rather than an alpha wash over white) and re-verify against real content, not just the source values.
- **Suggested command**: `/impeccable colorize`

**[P1] Active vs. Dormant badges carry almost equal visual weight**
- **Why it matters**: both are the same shape, same thin 1px outline, same font-weight, differing only by hue (`#157a45` vs. `--ink-muted`). At a glance, "what's active vs. dormant" — the second literal use case in the PRD — takes real focus to parse instead of registering peripherally.
- **Fix**: give Active a filled or tonal treatment (not just an outline) so it visually "sits forward," and let Dormant recede further tonally instead of nearly matching body-text gray.
- **Suggested command**: `/impeccable colorize`

**[P2] Row dividers are close to invisible (7% opacity)**
- **Why it matters**: contributes to the same "everything blurs together" complaint — there's no seam to anchor eye movement row to row in an 8-row table.
- **Fix**: increase to a value that's genuinely a hairline, not a rounding error (test ~12-16%), while keeping it subordinate to the stronger header/frame line.
- **Suggested command**: `/impeccable colorize` (bundle with the above)

**[P2] Type hierarchy still flat per the detector (11/13/20px)**
- **Why it matters**: three of four sizes sit inside a 1.18x ratio; this is an accepted trade-off for a dense Operate table, but it's a default, not a decision, until it's deliberately confirmed.
- **Fix**: either confirm this is intentional (document it) or introduce one more visible step (e.g., 11 / 14 / 17 / 22).
- **Suggested command**: `/impeccable typeset`

**[P3] No hover/focus row state defined**
- **Why it matters**: a static mockup can't show it, but nothing in the source hints at a row-hover or keyboard-focus treatment for the eventual real build.
- **Fix**: define it before this goes into the real Next.js UI.
- **Suggested command**: `/impeccable harden`

### Persona Red Flags

**Alex (Power User)**: You (the actual single user) have 27 repos and explicitly want to "spot which repos have gone stale... to decide where to spend attention next" (PRD use case 2). Nothing here lets Alex jump straight to stale/production rows — no sort, no filter, no visual grouping by state. Alex has to read all 8-27 rows linearly to build the same picture the color coding is supposed to give for free.

**Sam (Accessibility/low-vision)**: The stale wash and hairline dividers are both under common practical thresholds for reliably perceiving a non-text UI distinction (WCAG's 3:1 guidance is for meaningful graphical objects/states, and a 5.5%/7% alpha wash on white will not clear that in most cases). The redundant text label ("STALE") saves this from being a pure color-only failure, but a low-vision user gets essentially zero benefit from the row treatment and does 100% of the work by reading text.

### Minor Observations

- "PRODUCTION" label color (`--accent-hover`) is visually close in weight to the "Edit" link color — both are the same blue family, which could read as "both clickable" when only Edit is.
- Footer note text (11px, was 12px) is fine as throwaway preview annotation; won't exist in the real build.

### Questions to Consider

- Does "Dormant" need its own hue entirely, or is it enough to make "Active" visually louder and let everything else recede by comparison?
- Is 27 rows the ceiling for a flat list, or does this need a filter/sort control before ship regardless of the color fix?
