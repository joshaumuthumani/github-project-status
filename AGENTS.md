# Agent instructions — projects-status

## Coding discipline

Apply `karpathy-guidelines` (SDLC-Process/skills/karpathy-guidelines.md) whenever writing,
reviewing, or refactoring code in this repo: surface assumptions rather than guessing, keep
changes minimal and surgical, avoid speculative abstraction, and define verifiable success
criteria before calling work done.

## Workflow

This repo follows the canonical SDLC pipeline at `~/Brain/System/SDLC-Process/sdlc-pipeline.md`.
Current stage and tier are recorded in `.kilo/sdlc-adapter.md` and `README.md`; decisions are logged in
`docs/DECISIONS.md`. Do not skip a pipeline stage without recording why. Agents MUST inspect `.kilo/sdlc-adapter.md` to determine the current stage and tier before accepting or performing any work.

- Branching and PR convention: see `README.md` § Contributing.
- Review gate: `docs/review-policy.md`.
- No agent may change code, configuration, migrations, tests, workflows, or shipped
  documentation without a canonical GitHub work item stating the reason and acceptance
  criteria, once this repo's GitHub Project is adopted (Stage 1 in progress).

## Continuous-improvement observer (Task Observer)

Before the first tool call of any session — and before writing or
proposing a plan, not merely before executing one — invoke the
task-observer skill (`.kilo/skill/task-observer/SKILL.md`) AND execute its Session Start
Protocol (storage check, frontmatter scan, review trigger). Loading the skill and running
the protocol are separate steps; a session that loads the file and stops
has activated nothing. Any turn that will involve a tool call counts; do
not classify the session as "too simple" from its opening message.

Select skills on the DECISION the request is about, not on the artefact it
arrived as. Name what the user is deciding, then match the installed skill
descriptions against that — a request handed over as a file to review
still needs the skill whose description names its subject.

After completing each task, check the observation records written this
session and report a one-line summary (ids and titles, or "none logged
and why"). This is the activation backstop: it forces a look at the log,
so a session that silently skipped the protocol is discovered at the
first task boundary instead of never.

Loading a skill is not complete until you have queried the observation
log for OPEN observations naming it and read their bodies:
```
grep -l "skill:.*<skill-name>" \
  /Users/josh/Dev/projects-status/skill-observations/observation-log/*.md
```
Apply their insights to the current work, even if the skill file hasn't
been updated yet. Run this at every skill load, however many skills load
in one session.

The task-observer workspace for this project is pinned to:
```
/Users/josh/Dev/projects-status
```
Every path the skill uses derives from that root and nothing else:
```
/Users/josh/Dev/projects-status/skill-observations/observation-log/   (the log)
/Users/josh/Dev/projects-status/skill-observations/cross-cutting-principles.md
/Users/josh/Dev/projects-status/skill-updates/                        (staging root)
/Users/josh/Dev/projects-status/skill-updates/PENDING.md              (staging manifest)
```
Never resolve any of them from the current working directory — a cwd inside an ephemeral
checkout (a git worktree, a temporary clone) is torn down and takes the log with it.

Task Observer writes observations and recommendations only; it never changes skills, policy,
or project code by itself. Proposed changes still follow the normal approval, branch, PR, and
Stage 10 gates.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
