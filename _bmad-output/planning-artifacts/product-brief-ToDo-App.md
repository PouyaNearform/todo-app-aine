---
title: "Product Brief: ToDo App"
status: "complete"
created: "2026-04-29"
updated: "2026-04-29"
inputs:
  - docs/prd-source.md
---

# Product Brief: ToDo App

> **Dual identity — both first-class.** This brief defines a v1 that is simultaneously **(a) a real, minimal personal todo app** that an end user can open and use, and **(b) the canonical worked-example reference for the AINE BMAD training pathway**, consumed by trainees, instructors, and reviewers as an end-to-end artifact set (brief → PRD → architecture → stories → tests → build → QA → containerization). Both identities have first-class success criteria. Where they conflict, **clarity for the training audience wins** — because a trainee who understands the choices can re-derive the product, while a polished product that hides its rationale teaches nothing.

## Executive Summary

The personal task-management category is loud, crowded, and exhausting. Mainstream apps have grown into productivity suites — projects, priorities, labels, filters, Pomodoros, habit trackers — and users routinely describe spending more time configuring their todo app than completing the tasks inside it. In parallel, engineering teams adopting structured AI-assisted development (BMAD) lack a small-but-complete reference that exercises every lifecycle stage end-to-end without drowning the lesson in product complexity.

**ToDo App** addresses both gaps with one artifact. As a product, it does exactly one thing well: capture, complete, and clear personal tasks with zero friction — no accounts, no onboarding, no priorities or deadlines or notifications. As a training reference, it is held to a shipped-commercial-app engineering bar (≥70% meaningful test coverage, ≥5 Playwright E2E, WCAG AA, security review, multi-stage Docker Compose with non-root containers, AI Integration Log) so trainees can see what "done" looks like at minimal scope.

The product surface is intentionally small; the process surface is deliberately full. v1 ships finished against documented scope, with explicit architectural seams that preserve the option to add authentication, multi-user, sync, and AI later — without rewriting the foundation.

## The Problem

**For end users.** The 2026 todo-app market is saturated and bloated. Across Todoist, TickTick, Microsoft To Do, Things, and Any.do, common reports include:

- **Decision fatigue at capture.** Choosing project, priority, label, and date for each task displaces the work itself.
- **Anxiety as a feature.** Overdue indicators, streak counters, and completion percentages inject synthetic urgency that demotivates.
- **Setup longer than the work.** Configuration pages outweigh the day's actual list.
- **Account & privacy friction.** A simple personal list increasingly demands an account, a privacy policy, and a marketing opt-out.

**For engineering teams adopting BMAD.** No widely-shared reference implementation walks an AI-assisted team from a one-page brief through a containerized, accessible, security-reviewed, fully-tested deployment in a domain small enough to read in an afternoon. Trainees either learn the methodology against toy snippets that skip the hard parts, or against production codebases that drown the lesson in incidental complexity.

## The Solution

A single-page, full-stack web application with one screen and four verbs: **add, see, complete, delete**.

A todo is a short text description, a completion state, and a creation timestamp. That is the entire data model. The list is visible the moment the app loads — no login, no tour. Add: one field, one keystroke. Complete: one tap, with the row visually distinguished instantly. Delete: one action away. The UI updates optimistically; if the backend rejects an op, the change is rolled back and the user sees a non-blocking error toast with retry. Persistence is **per-browser per-deployment** (a local opaque key identifies the list to the backend) — durable across refresh, restart, and tab close on the same browser, but explicitly *not* synced across devices. The deployment is **local-first / private-URL by default**; public exposure is a separate, documented decision because a no-auth durable list on the open internet is a security incident waiting to happen.

The frontend is responsive (desktop + mobile) with designed empty / loading / error states. The backend is a small CRUD API with a real database. Architectural seams (below) preserve the option to add auth, multi-user, and AI later.

## What Makes This Different

**As a product:**
- **Minimalism by deliberate design.** Every excluded feature is a documented decision, not an oversight.
- **Calm by default.** No streaks, no overdue badges, no synthetic urgency.
- **Architecture-as-option-value.** The code does *less* today so it can do *more* later, on the same foundation.

**As a training reference:**
- **Shipped-commercial engineering bar at minimal scope.** Rare in the minimal-todo segment, where indie apps usually skip rigor.
- **Decisions Not Made is a first-class artifact.** Every "no" is captured with rationale, so trainees can re-derive scope under different constraints.
- **AI Integration Log is publishable.** A transparent, per-stage record of how an AI-assisted team built this product end-to-end — at least one entry per BMAD lifecycle stage, with prompt, output, and human-edit summary.

## Who This Serves

**Product audience — the focused individual.** Someone keeping a short, mutable personal list who wants the lowest-friction path between "I should do X" and that thought being captured. Currently uses Apple Reminders, a notes app, or paper. Success: opens the app, sees today's list, adds or checks things off in seconds, closes it.

**Training audience — trainees, instructors, and reviewers on the AINE BMAD pathway.** They consume the repo as a worked example. **Trainees** clone, read artifact-by-artifact, and reproduce the workflow on a new domain. **Instructors** reference each artifact in lessons. **Reviewers** evaluate completeness and quality across the full lifecycle.

## Success Criteria

**Product (user-facing):**
- A first-time user completes add / view / complete / delete unaided in a 5-person usability test (target ≥4/5).
- Optimistic UI round-trip <100 ms p95 on local Docker; backend confirm <500 ms p95.
- List survives refresh, browser restart, and tab close on the same browser without data loss.
- All four UI states (empty, loading, error, long-list) have designed handling; zero console errors on golden paths.
- WCAG AA verified via automated scan + keyboard-only walkthrough.

**Engineering quality:**
- ≥70% meaningful unit/integration coverage (Vitest or Jest).
- ≥5 Playwright E2E tests covering golden paths and key error states (optimistic-rollback included).
- Security review completed; findings triaged and either fixed or explicitly accepted with rationale.
- `docker compose up` from a clean checkout yields a healthy, non-root, multi-stage build with passing health checks.

**Training artifact:**
- Every BMAD lifecycle stage (brief, PRD, architecture, stories, test design, build, QA, containerization) has at least one artifact a trainee or instructor can read or reference.
- A trainee following the artifact set reaches a green build + passing E2E suite without instructor intervention (target: under one focused workday).
- AI Integration Log contains ≥1 substantive entry per stage, sufficient for a trainee to reproduce the workflow.

## Scope

**In for v1:**
- Single-user, single-list todo experience with create / read / complete (toggle) / delete.
- Todo fields: description (short text), completion status, creation timestamp.
- Responsive web UI (desktop + mobile) with empty / loading / error / long-list states.
- Small CRUD backend API with durable per-browser-per-deployment persistence.
- **Defined architectural seams** (deliberately paid for the training identity): nullable `owner_id` column on the todo table; ownership-check stub in the request pipeline; request-context object carrying the opaque browser key; a thin service layer separating HTTP handlers from persistence.
- Local-first / private-URL deployment posture by default.
- Full QA, accessibility, security, and containerization deliverables; AI Integration Log throughout.

**Explicitly out for v1:**
- User accounts, authentication, and multi-user data separation.
- Collaboration, sharing, comments.
- Priorities, due dates, deadlines, recurring tasks.
- Notifications (push, email, in-app).
- Tags, projects, sub-tasks.
- Cross-device or real-time sync.
- Native mobile apps.
- AI features (deferred to a later module on the same seams).
- Public/internet-exposed deployment without an additional security pass.

## Vision

If v1 lands, two parallel evolution tracks open on the same foundation:

**Product track.** (a) *Privacy-first personal* — local persistence, optional encrypted backup, multi-device sync without accounts. (b) *Quietly intelligent* — AI-assisted natural-language capture and gentle triage, layered on the existing seams without ever exposing project/priority/tag complexity. The discipline of *adding nothing without justification* remains the moat.

**Reference-implementation track.** Each future capability — auth, multi-user, AI, sync — ships as a successive BMAD training module on top of this same repo, demonstrating how the existing seams absorb new requirements. The artifact set becomes a serialized teaching resource: chapter one is v1 minimal, each subsequent chapter is a controlled extension. The AI Integration Log compounds across modules into a uniquely transparent record of disciplined AI-assisted engineering.

In both tracks, this brief — and the BMAD process behind it — is the reference for how minimal products and minimal lessons are supposed to be built.
