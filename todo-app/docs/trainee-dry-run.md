# Trainee Dry-Run

**Status: Pending real-trainee session.** This artifact is the deliberate placeholder for Story 3.5's outcome — a real engineer (someone who hasn't seen this code) cloning the repo, following the artifact set, and reaching a green build + passing E2E within ≤1 focused workday. Story 3.5 is the **closing v1 ship gate**.

## Method (planned)

Per Story 3.5 AC:

1. **Identify a trainee** — an engineer who hasn't seen this repo. Ideally familiar with TypeScript + React + Postgres at a working level, but not BMAD specifically. Comfortable with `git clone` + `docker compose`.
2. **Hand off the repo** — give them the URL only. No instructions, no demo, no walkthrough. (They can email questions, but the goal is to NOT need to.)
3. **Observer logs the path taken** — over Zoom screenshare or async via end-of-day journal. Time-per-stage is measured.
4. **Targets:**
   - Healthy `docker compose up` stack within their **first hour**
   - `pnpm test:e2e` passing (11/11 specs) within their **first 4 hours**
   - "I understand what every BMAD lifecycle stage produced and why" within **≤ 8 hours total**
5. **Friction log** — every place the trainee got stuck, paused, or needed to backtrack. These become the v1.1 improvement list.

## What success looks like

The trainee opens [`README.md`](../../README.md) at the repo root, reads the dual-nature opener (≤ 5 minutes), follows Quick Start (≤ 5 minutes for the first `docker compose up` to complete), then reads the artifact set top-to-bottom in the order the README lists them.

By hour 4, they've:
- Run `pnpm test:e2e` and seen 11/11 pass
- Read PRD, Architecture, UX Design Specification, and the Test Design (skim level on Architecture; full on the others)
- Opened `_bmad-output/planning-artifacts/ux-design-mockup.html` in a browser (the visual showcase requires zero build)
- Started reading per-story implementation context files for Stories 1.5–1.10 (the seam architecture in implementation form)

By hour 8, they can answer questions like:
- "Why is `owner_id` nullable?" → trainee can point to the `owner_id` seam in the Architecture's "four-component seam" section + the schema in `db/schema.ts`
- "What's Gap I-1 and how was it fixed?" → trainee can explain the `ctx.ownerId` semantic naming + the `pnpm check:gap-i1` enforcement
- "Why is `INSERT ... ON CONFLICT DO NOTHING` better than catching duplicate-key errors?" → idempotency under retry; trainee can point to the architecture's idempotency contract section
- "Why is there a Toast component but no auto-dismiss?" → calm-by-default — auto-dismissing a recovery affordance is hostile; trainee can point to UX spec § Toast and DECISIONS-NOT-MADE.md § auto-dismiss-toast

## What failure looks like

If the trainee:
- Can't get the stack up in the first hour → README's Quick Start needs work
- Gets confused about which README to read (repo root vs `todo-app/`) → README needs to clarify that distinction up front
- Asks "where do I start?" with no obvious entry point → README needs a stronger "if you only read one thing, start here" pointer
- Reads the Architecture but can't connect it to the running code → per-story implementation-artifact files need stronger reference-back to the Architecture sections

**v1 is NOT shipped until this story passes.** If the trainee gets stuck, the artifact set is the bug — not the trainee. Fix the artifacts, re-run with another trainee.

## Observation log (TBD)

```
Trainee: [first name or pseudonym]
Date: YYYY-MM-DD
Background: [TS years, React years, Postgres familiarity]
Total time: [HH:MM]

Phase 1 — Quick Start
  Time: [HH:MM]
  Friction: [...]

Phase 2 — Artifact reading order
  Order taken: [...]
  Time per artifact: [...]
  Friction: [...]

Phase 3 — Code + tests
  pnpm test:e2e first attempt: [pass / partial / fail with details]
  pnpm dev first attempt: [...]
  Friction: [...]

Phase 4 — Comprehension check
  Sample questions answered correctly: [...]
  Sample questions answered wrong / unanswered: [...]

Aggregate findings:
  Strongest part of the artifact set: [...]
  Weakest part of the artifact set: [...]
  Specific improvements proposed: [...]
```

(Replace once the dry-run has been run.)

## Improvement candidates discovered (TBD)

When friction points are identified, they go here as a numbered list. Each entry: friction + proposed change + roll-into-v1 vs accept-with-doc. The proposed changes feed into v1.1 planning.

---

This document is referenced from [`README.md`](../../README.md) § Process & Methodology.
