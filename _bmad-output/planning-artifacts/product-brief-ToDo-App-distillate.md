---
title: "Product Brief Distillate: ToDo App"
type: llm-distillate
source: "product-brief-ToDo-App.md"
created: "2026-04-29"
purpose: "Token-efficient context for downstream PRD creation"
---

# ToDo App — Distillate

Concise, dense context for downstream BMAD stages (PRD, architecture, stories, tests). Each bullet is self-contained; assume the reader has not loaded the full brief.

## Core identity (load-bearing)

- **Dual-purpose v1.** Real personal todo product *and* canonical AINE BMAD training reference. Both audiences are first-class.
- **Tiebreaker rule.** When product polish and training clarity conflict, **training clarity wins** — a trainee who understands the rationale can re-derive the product; opaque polish teaches nothing. Use this to settle downstream design debates.
- **Product surface = small. Process surface = full.** Don't soften this asymmetry.

## Data model (v1, frozen)

- Todo entity: `description` (short text), `completion_status` (boolean), `created_at` (timestamp).
- **Defined architectural seams (in scope for v1, paid for the training identity):**
  - Nullable `owner_id` column on the todo table — set to the opaque browser key in v1; ready to receive a real user id later.
  - Ownership-check stub in the request pipeline (no-op in v1; pluggable).
  - Request-context object carrying the opaque browser key — single seam where auth would inject a real principal.
  - Thin service layer between HTTP handlers and persistence — keeps handlers slim and swappable.
- No other fields. No tags, priorities, deadlines, projects, sub-tasks, recurring rules.

## Persistence & identity model (resolved in brief)

- **Per-browser-per-deployment.** An opaque local key (cookie or localStorage) identifies a browser's list to the backend.
- **Durable on the same browser** across refresh, restart, tab close. **Not** synced across devices in v1.
- Single-deployment scope: each deployed instance is its own world.

## Deployment posture (resolved in brief)

- **Local-first / private-URL by default.** A no-auth durable list on the open internet is a security incident waiting to happen — public exposure is a separate, explicitly-documented decision (out of v1).
- Container target: Docker Compose, multi-stage build, non-root containers, health checks.

## UX requirements

- One screen, four verbs: add / see / complete / delete.
- Open-and-use; no login, no onboarding, no tour, no empty-state pitch.
- Optimistic UI updates; on backend rejection, **roll back the change** and show a non-blocking toast with retry.
- Visually distinguish completed vs active rows clearly (status at a glance).
- Designed states: **empty, loading, error, long-list, long-text**.
- Responsive desktop + mobile; touch targets sized for mobile.
- Calm-by-default — no streaks, no overdue badges, no completion-percentage anxiety.

## Non-functional requirements (concrete budgets)

- Optimistic UI round-trip <100 ms p95 on local Docker.
- Backend confirm <500 ms p95.
- Zero console errors on golden paths.
- WCAG AA: automated scan clean + keyboard-only walkthrough passes.

## Test strategy (anchors for bmad-testarch-test-design)

- ≥70% meaningful unit/integration coverage (Vitest or Jest).
- ≥5 Playwright E2E tests. Golden-path coverage: add, complete, delete, empty→non-empty, persistence-across-refresh. **Must include** optimistic-rollback on backend failure.
- Tests integrated from day one, not retrofitted.
- Security review completed; findings triaged and either fixed or explicitly accepted with rationale.

## Training-artifact requirements (do not drop)

- Every BMAD lifecycle stage has at least one consumable artifact in the repo.
- "Decisions Not Made" is a **first-class artifact** — every excluded feature has a one-line rationale. Surface it prominently in the repo.
- **AI Integration Log**: at least one substantive entry per BMAD stage with prompt, output, and human-edit summary. Treat as a publishable artifact, not internal busywork.
- Trainee reproducibility target: a trainee following the artifacts reaches a green build + passing E2E suite within one focused workday, without instructor intervention.
- Instructor reference target: every lifecycle stage cites at least one artifact in this repo.

## Out of scope for v1 (do not re-propose downstream)

- User accounts / authentication. Reason: explicitly deferred; seams preserved.
- Multi-user data separation, collaboration, sharing, comments. Reason: deferred; nullable `owner_id` is the seam.
- Priorities, due dates / deadlines, recurring tasks. Reason: would inject the synthetic-urgency anti-pattern the product exists to avoid.
- Notifications (push, email, in-app). Reason: same as above.
- Tags, projects, sub-tasks. Reason: feature creep / decision fatigue.
- Cross-device or real-time sync. Reason: out of scope; persistence is per-browser-per-deployment.
- Native mobile apps. Reason: responsive web is sufficient at this scope.
- AI features. Reason: deliberately deferred to a later BMAD module layered on the same seams.
- Public/internet-exposed deployment without an additional security pass. Reason: no-auth + durable list = unacceptable risk profile in the open.

## Competitive context (selected — for positioning, not differentiation)

- **Todoist / TickTick / Things / Microsoft To Do / Any.do**: feature-rich incumbents; common user complaints are decision fatigue, anxiety-inducing urgency, configuration overhead.
- **Apple Reminders / paper / notes apps**: the actual incumbent for the target user. v1's job is not to win against Todoist; it's to be a calmer alternative to Reminders for users who want one, and to be a clean teaching reference.
- 2026 market context: cloud sync is table-stakes for commercial todo apps (~61% adoption, ~49% users prioritize cross-device). v1 deliberately doesn't compete on that axis — frame this as a non-goal, not a gap.

## Open questions (surfaced, not blocking)

- Stack choice (framework, language, database) is intentionally open — to be resolved in `bmad-create-architecture`. Whatever is chosen, the seams above must hold.
- Whether to ship a "Decisions Not Made" page in the running app itself, or keep it as a repo artifact only.
- Whether the AI Integration Log lives in-repo as markdown or as a separate publishable site/blog. In-repo markdown is the safe default.
- Long-text limit on description: pick a reasonable cap (e.g., 256 chars) during PRD; not a brief-level decision.

## Anti-goals / framing reminders for downstream agents

- Do not re-introduce excluded features by stealth (e.g., "just a little priority field"). Each would have to defeat the documented rationale.
- Do not let the training-artifact identity bloat the product surface. Seams stay, features stay out.
- "Polished" means quality of execution within scope (designed states, AA, no console errors), **not** feature completeness — say so explicitly when the question comes up.
- "Production-grade" applies to engineering practice (tests, accessibility, security review, containerization), **not** to deployment posture (which is local-first / private-URL by default).
