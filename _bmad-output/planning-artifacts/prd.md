---
stepsCompleted:
  - step-01-init
  - step-02-discovery
  - step-02b-vision
  - step-02c-executive-summary
  - step-03-success
  - step-04-journeys
  - step-05-domain-skipped
  - step-06-innovation-skipped
  - step-07-project-type
  - step-08-scoping
  - step-09-functional
  - step-10-nonfunctional
  - step-11-polish
  - step-12-complete
releaseMode: phased
inputDocuments:
  - _bmad-output/planning-artifacts/product-brief-ToDo-App.md
  - _bmad-output/planning-artifacts/product-brief-ToDo-App-distillate.md
  - docs/prd-source.md
documentCounts:
  briefs: 2
  research: 0
  brainstorming: 0
  projectDocs: 1
  projectContext: 0
workflowType: 'prd'
classification:
  projectType: web_app
  domain: general
  complexity: low_domain_high_engineering_bar
  projectContext: greenfield
  notes: "Dual-purpose v1 — real personal todo product AND canonical AINE BMAD training reference. Tiebreaker: training clarity wins over product polish. Low scope complexity, elevated engineering bar (>=70% coverage, >=5 Playwright E2E, WCAG AA, security review, multi-stage non-root Docker Compose, AI Integration Log per stage)."
---

# Product Requirements Document - ToDo App

**Author:** Pouya
**Date:** 2026-04-29

## Executive Summary

ToDo App is a single-screen, full-stack web application for capturing, completing, and clearing personal tasks with zero friction — no accounts, no onboarding, no priorities, deadlines, or notifications. The data model is three fields (`description`, `completion_status`, `created_at`); the UI exposes four verbs (add, see, complete, delete); the persistence model is per-browser per-deployment via an opaque local key (cookie or localStorage), durable across refresh, browser restart, and tab close on the same browser, deliberately not synced across devices. Deployment posture is local-first / private-URL by default; public exposure is a separate, explicitly-documented decision because a no-auth durable list on the open internet is an unacceptable risk profile.

The target user is the focused individual keeping a short, mutable personal list — currently using Apple Reminders, a notes app, or paper — who wants the lowest-friction path between "I should do X" and that thought being captured. Existing incumbents (Todoist, TickTick, Things, Microsoft To Do, Any.do) have grown into productivity suites; users routinely report decision fatigue at capture, configuration overhead exceeding the day's actual list, and synthetic-urgency mechanics (streaks, overdue badges, completion percentages) that demotivate rather than motivate. v1 refuses every one of those mechanics and documents why.

This product is also the canonical worked-example reference for the AINE BMAD training pathway — a small-but-complete artifact set (brief → PRD → architecture → stories → tests → build → QA → containerization) consumed end-to-end by trainees, instructors, and reviewers. The dual identity and its tiebreaker — *training clarity wins where product polish and training clarity conflict, with security, accessibility, and data integrity as non-negotiable floors neither identity may negotiate down* — are codified once in the Project Principles section that follows. The rest of the PRD reads as a normal product spec.

### What Makes This Special

**Minimalism through documented refusals.** Every excluded feature — accounts, priorities, due dates, recurring tasks, tags, projects, sub-tasks, notifications, cross-device sync, native mobile apps, AI capabilities, public deployment — is captured in a first-class "Decisions Not Made" artifact with a one-line rationale. The discipline of refusing features with reasons is the moat; it survives the next product manager and lets a downstream reader (or trainee) re-derive scope under different constraints.

Two consequences follow from that lead:

- **User-facing — calm by default.** A deliberate stance, not an absence. The category's dominant anti-pattern is synthetic urgency; v1 names and refuses it.
- **Engineering — architecture as option value.** Four specific seams paid for by the training identity: (1) a nullable `owner_id` column on the todo table, set to the opaque browser key in v1 and ready to receive a real user id later; (2) an ownership-check stub in the request pipeline, no-op in v1 but pluggable; (3) a request-context object carrying the opaque browser key — the single seam where auth would inject a real principal; (4) a thin service layer between HTTP handlers and persistence. Together they demonstrate how future modules (auth, multi-user, AI, sync) absorb requirements without rewrites.

Optimistic UI is implemented with explicit rollback: the client updates instantly, the backend confirms, and on rejection the change is rolled back **and** a non-blocking toast with retry is shown. NFRs are stated as concrete numbers, not adjectives: <100 ms p95 optimistic round-trip on local Docker, <500 ms p95 backend confirm, ≥70% meaningful unit/integration coverage, ≥5 Playwright E2E tests including optimistic-rollback, zero console errors on golden paths, WCAG AA verified via automated scan plus keyboard-only walkthrough.

## Project Principles

This section codifies the load-bearing framing that shapes every downstream artifact. The PRD body that follows reads as a normal product spec; readers needing the framing find it once, here.

### Dual identity

ToDo App is **simultaneously** a real personal todo product (used by an end user) and the canonical worked-example reference for the AINE BMAD training pathway (consumed by trainees, instructors, and reviewers as an end-to-end artifact set). Both audiences are first-class. Both have measurable success criteria. Both can succeed or fail independently.

The first-time reader of the repository encounters the dual nature in the README; from there, the rest of the artifact set — including this PRD — does not re-explain it. The training framing surfaces only where it materially shapes a product decision.

### Tiebreaker

When product polish and training clarity conflict, **training clarity wins**.

A trainee who understands the *why* behind a decision can re-derive the product under different constraints; opaque polish teaches nothing. The asymmetry is intentional — the product surface is small *because* the process surface is full. v1 is not trying to win against Todoist; it is trying to be a calmer alternative to Apple Reminders that any trainee can re-derive in a workday.

### Carve-out — non-negotiable floors

The tiebreaker resolves *aesthetic* conflicts. It does not apply to:

- **Security.** OWASP Top 10 floor; security review with documented triage; no public-internet deployment in v1; container hygiene (non-root, no `latest` tags, no host network).
- **Accessibility.** WCAG 2.1 Level AA, verified by automated scan and manual keyboard-only walkthrough.
- **Data integrity.** Per-browser per-deployment durability; optimistic UI rollback correctness; idempotent retry; zero silent failures.

Neither identity may negotiate any of these down. They are constraints on the design space, not trade-offs within it.

### Decision discipline

Every excluded feature is a documented decision, not an oversight. The **"Decisions Not Made"** artifact captures every refused feature with a one-line rationale; refusal-with-reason is the moat. The discipline is what survives the next product manager and lets a downstream reader (or trainee) re-derive scope under different constraints.

### Calm by default

Calm-by-default is a **stance**, not an absence. Synthetic-urgency mechanics are deliberately refused: no streaks, no overdue indicators, no completion-percentage displays, no celebratory animations. The category's dominant anti-pattern is anxiety; v1 names it and refuses to ship it. The absence is verifiable — present in QA review as a checklist of "not present" items.

### AI Integration Log

The AI Integration Log is a **separate, publishable document** that ships with the artifact set. It contains at least one substantive entry per BMAD lifecycle stage, with prompt, output, and human-edit summary. It is not internal busywork; it is a first-class training artifact, intended to compound across successor modules into a uniquely transparent record of disciplined AI-assisted engineering.

## Project Classification

- **Project Type:** Web application (responsive desktop + mobile, SPA-style frontend, small CRUD backend with a real database). Native mobile, offline mode, SEO, and real-time sync are explicit non-goals.
- **Domain:** General (personal task management). No regulated industry, no HIPAA/PCI/FERPA-equivalent compliance regime; standard concerns apply — UX, security, performance, accessibility.
- **Complexity:** Low scope, high engineering bar. A three-field entity and four verbs held to a shipped-commercial-app quality standard (≥70% meaningful coverage, ≥5 Playwright E2E, WCAG AA, security review with documented triage, multi-stage non-root Docker Compose with health checks, AI Integration Log entry per BMAD lifecycle stage maintained as a separate publishable document).
- **Project Context:** Greenfield. No existing codebase; v1 is built from scratch. Stack choice (framework, language, database) is deliberately deferred to `bmad-create-architecture`. The four seams above must hold whatever stack is chosen.

## Success Criteria

### User Success

A first-time user — opening the app without onboarding or instruction — completes the four core verbs (add, see, complete, delete) unaided. Validation: a 5-person usability test, target ≥4/5 unaided completion. The user's list survives refresh, browser restart, and tab close on the same browser without data loss; on rejected operations they see the optimistic update rolled back **and** a non-blocking toast with retry, never a silent failure or a stuck state. All four designed UI states (empty, loading, error, long-list) render correctly. Long-text descriptions (capped at 256 characters per FR4) wrap cleanly without breaking layout.

Emotional success criterion: the user closes the app within seconds of opening it on most sessions — a calm interaction, not a configuration session. The success signal is the *absence* of friction the incumbents introduce: no decision fatigue at capture, no anxiety from synthetic-urgency mechanics, no setup overhead. Calm-by-default is a stance, measured by what we refused to put in the user's way.

### Business Success

This product is non-commercial; conventional business KPIs (MRR, conversion, ad revenue) do not apply. The closest stakeholder-success analogs come from the dual-purpose v1's two audiences:

- **End-user adoption (informal, qualitative).** Users in the 5-person usability test self-report they would use v1 as a calmer alternative to Apple Reminders or a notes app for short personal lists (target ≥3/5 say yes, unprompted).
- **Training-audience adoption (formal, measurable).** Trainees following the artifact set reach a green build + passing E2E suite within one focused workday without instructor intervention; instructors cite at least one artifact in each lifecycle-stage lesson; reviewers sign off on the artifact set as "what done looks like at minimal scope."

These training-audience metrics are first-class success criteria for v1, on equal footing with user-facing metrics — the dual identity makes them so. The Project Principles carve-out still applies: security, accessibility, and data integrity are floors below which neither audience may negotiate.

### Technical Success

Engineering quality bar (concrete numbers, not adjectives):

- **Test coverage:** ≥70% meaningful unit/integration coverage (Vitest or Jest), where "meaningful" excludes trivial getters, framework-generated code, and the test fixtures themselves.
- **E2E:** ≥5 Playwright end-to-end tests covering golden paths (add, complete, delete, empty→non-empty, persistence-across-refresh) **and** at least one optimistic-rollback path (server-side rejection forces UI rollback + retry toast).
- **Performance:** optimistic UI round-trip <100 ms p95 on local Docker; backend confirm <500 ms p95.
- **Reliability:** zero console errors on all golden paths; durable persistence verified across refresh / browser restart / tab close without data loss.
- **Accessibility:** WCAG AA verified via automated scan (axe or equivalent) **plus** a manual keyboard-only walkthrough that completes all four verbs without a mouse.
- **Security:** security review completed (OWASP top-10 coverage minimum); each finding triaged and either fixed or explicitly accepted in writing with rationale. No public-internet deployment in v1; private-URL / local-first posture verified.
- **Containerization:** `docker compose up` from a clean checkout yields a healthy, multi-stage, non-root build with passing health checks. No `latest` image tags; no host network mode.

### Measurable Outcomes

| Outcome | Target | Measurement |
|---|---|---|
| Unaided completion of core verbs | ≥4/5 in 5-person usability test | First-time-user observed session |
| Optimistic UI round-trip latency | <100 ms p95 | Local Docker, instrumented client |
| Backend confirm latency | <500 ms p95 | Local Docker, server-side traces |
| Persistence durability | 100% across refresh / restart / tab close | Automated E2E test |
| Console errors on golden paths | 0 | E2E run with browser-console assertion |
| Test coverage (unit + integration) | ≥70% meaningful | Vitest/Jest coverage report |
| Playwright E2E count | ≥5, including ≥1 optimistic-rollback path | Test inventory |
| WCAG conformance | AA via automated + keyboard walkthrough | axe + manual checklist |
| Security review findings | All triaged; all fixed or accepted in writing | Review document |
| Multi-stage Docker health | `docker compose up` healthy from clean checkout | CI run |
| Trainee reproduction time | ≤1 focused workday to green build + passing E2E | Trainee dry-run log |
| AI Integration Log entries | ≥1 substantive entry per BMAD lifecycle stage | Log document inventory |

## Product Scope

### MVP — Minimum Viable Product

In scope for v1, finalized:

- Single-user, single-list todo experience with create / read / complete (toggle) / delete.
- Todo entity: `description` (short text, ≤256 char cap per FR4), `completion_status` (boolean), `created_at` (timestamp). No other fields.
- Per-browser per-deployment persistence via opaque local key (cookie or localStorage) identifying the browser's list to the backend; durable on the same browser across refresh, browser restart, and tab close; not synced across devices.
- Responsive web UI (desktop + mobile) with designed empty / loading / error / long-list states. No native mobile, no offline mode, no SEO.
- Optimistic UI with explicit rollback: instant client update; backend confirm; on rejection, change rolled back **and** non-blocking toast with retry.
- Small CRUD backend API with a real database. Stack choice (framework, language, database) deferred to `bmad-create-architecture`; the four seams below must hold whatever stack is chosen.
- **Architectural seams (paid for by training identity, in scope for v1):** (1) nullable `owner_id` column on the todo table — set to the opaque browser key in v1, ready to receive a real user id later; (2) ownership-check stub in the request pipeline — no-op in v1, pluggable; (3) request-context object carrying the opaque browser key — single seam where auth would inject a real principal; (4) thin service layer between HTTP handlers and persistence.
- Local-first / private-URL deployment posture; multi-stage non-root Docker Compose with health checks.
- Full QA, accessibility, security review, and containerization deliverables. AI Integration Log maintained as a **separate publishable document**, with ≥1 substantive entry per BMAD lifecycle stage.

### Growth Features (Post-MVP)

Explicitly *deferred from v1*, each captured with rationale in the "Decisions Not Made" artifact. Each is a candidate for a successor BMAD training module layered on the same repo, demonstrating how the existing seams absorb the new requirement without rewrites:

- **Authentication and multi-user data separation** — the `owner_id` seam, ownership-check stub, and request-context object exist precisely to absorb this.
- **AI capabilities** (natural-language capture, gentle triage) — layered on the service-layer seam; AI complexity must never expose project / priority / tag concepts to the user.
- **Cross-device sync / multi-device editing** — replaces the per-browser-per-deployment persistence model with a synced one; request-context seam absorbs the principal change.
- **Public / internet-exposed deployment** — requires an additional security pass beyond v1's local-first posture; authentication is a precondition.

### Vision (Future)

Two parallel evolution tracks on the same foundation:

- **Product track.** (a) *Privacy-first personal* — local persistence retained, optional encrypted backup, multi-device sync without accounts. (b) *Quietly intelligent* — AI-assisted natural-language capture and gentle triage, layered on the existing seams without ever exposing project / priority / tag complexity. The discipline of *adding nothing without justification* remains the moat.
- **Reference-implementation track.** Each future capability (auth, multi-user, AI, sync) ships as a successive BMAD training module on top of the same repo, demonstrating how the existing seams absorb new requirements. The artifact set becomes a serialized teaching resource: chapter one is v1 minimal, each subsequent chapter a controlled extension. The AI Integration Log compounds across modules into a uniquely transparent record of disciplined AI-assisted engineering.

## User Journeys

### Primary User — Happy Path: "Capture, Done, Close"

**Persona — Sam, the focused individual.** Sam works hybrid, juggles a few small projects, and keeps a short personal list for the day: pick up dry cleaning, email Helena, prep a slide for the 3pm. Has tried Todoist twice and abandoned it both times — *"the app wanted me to organize my life; I just wanted to remember three things."* Currently rotates between Apple Reminders, a sticky note, and the back of an envelope. Wants a list that opens fast, takes the thought, and disappears.

**Opening scene.** Sam types `todo.local` (or whatever the private URL is) into a fresh browser tab. The page loads in under a second; yesterday's three remaining items appear in their order of capture. No login screen, no welcome modal, no empty-state pitch. Sam sees what's still pending without reading anything.

**Rising action.** Sam thinks: "I should email Helena before standup." The input field at the top is already focused. They type *email helena re: Q3 budget*, press Enter. The new item appears at the top of the list instantly (optimistic UI). ~100 ms later the backend confirms; nothing visibly changes because the optimistic state was correct.

**Climax.** Over lunch, Sam picks up dry cleaning and opens the same private URL on their phone — a different browser, a fresh per-browser key — and sees an empty list. They're briefly confused; the deployment context (private URL, no account, no sync) makes the cause inferable. *(UX note: v1 does not surface a "this is a different browser" explanation. That's a deliberate scope decision — v1's deployed-app audience is technically literate; a future module that adds public deployment would also add this affordance.)* Back at the desk, Sam taps the checkbox next to *pick up dry cleaning*. The row instantly moves to its struck-through, faded "completed" style. No streak counter, no celebration animation, no overdue red — just a quiet visual change. Sam moves on.

**Resolution.** End of day, Sam returns to delete the three completed items — one tap, then another, then another. The list is back to two pending items for tomorrow morning. They close the tab. No notification will fire. No badge will appear on a phone. Tomorrow morning the two items will still be there.

**Capabilities revealed:**
- One-screen, no-login UI; input field focused on load.
- Single text-field add with Enter-to-submit.
- Tap-to-toggle complete / uncomplete with immediate visual distinction.
- Tap-to-delete on individual items.
- Strict per-browser per-deployment persistence; no cross-device sync; an unknown browser key just shows an empty list (not an error).
- Created-at-ordered render (sort direction is an open question, see below).
- No notifications, no badges, no streaks, no overdue indicators — calm-by-default as a stance.

### Primary User — Optimistic-Rollback Recovery: "The Save That Didn't Save"

**Persona — same Sam, mid-afternoon.** Network is flaky (coffee-shop wifi, a VPN reconnecting, a backend restart — doesn't matter which).

**Opening scene.** Sam types *follow up with the design team* and presses Enter. The item appears at the top of the list instantly.

**Rising action.** ~800 ms later — beyond the 500 ms p95 threshold for backend confirms — the backend responds with a 5xx. The client rolls the optimistic state back: the new item disappears from the list. A non-blocking toast slides in from the corner: *"Couldn't save 'follow up with the design team'. Retry?"* The toast does **not** block input. Sam can still tap, type, complete, and delete other items while the toast is up.

**Climax.** Sam taps **Retry** on the toast. The same item reappears at the top (optimistic again). This time the backend confirms within ~200 ms. The toast dismisses itself.

**Resolution.** Sam never lost the text they typed. Never had to retype. The system never silently dropped data. Visible state on screen and durable state in the backend match.

**Capabilities revealed:**
- Optimistic UI with explicit rollback on backend rejection — applied to *every* mutation: add, complete, uncomplete, delete.
- Non-blocking toast surface for transient failure messages; toasts dismiss-on-success or on user action.
- **Retry** preserves the original *data*, not just the *action*.
- Failure of one mutation does not block others.
- The "error" state of the four designed states (empty, loading, error, long-list) is exercised here.

### Primary User — Persistence & Durability: "Tomorrow Morning"

**Persona — Sam again, next morning.** Closed the laptop hard last night, didn't shut down the browser cleanly, and opens a different browser profile this morning by mistake.

**Opening scene.** Sam opens the wrong browser profile to `todo.local`. The list is empty — per-browser per-deployment, the opaque key in this profile's localStorage / cookie identifies a different list that doesn't exist yet. The empty state renders cleanly: no error, no spinner stuck halfway, just an empty list ready to receive input.

**Rising action.** Sam wonders briefly, then switches to their normal browser profile.

**Climax.** The correct profile loads the two items from yesterday — `pick up dry cleaning` (completed, struck-through, faded) and `email helena re: Q3 budget` (active). Both survived a hard close, a system restart, and a tab close. The persistence model held.

**Resolution.** Sam adds *prep slide for 3pm*. The list is now their plan for the morning.

**Capabilities revealed:**
- Persistence: per-browser per-deployment via opaque local key (cookie or localStorage), durable across refresh, browser restart, and tab close on the same browser; deliberately not synced across devices.
- Empty-state rendering when a fresh browser key has no list yet (no error, no spinner).
- Completed items remain in the list across sessions until explicitly deleted, and remain visually distinguished.
- Long-list rendering when many completed items accumulate (active and completed coexist; no filter to hide completed in v1).

### Secondary Stakeholder — The Trainee Reproducing v1

**Persona — Jordan, an AINE BMAD trainee.** Has done AI-assisted coding before but never followed a full BMAD pathway end-to-end. Allotted one focused workday to reproduce v1 from the artifact set.

**Opening scene.** Jordan clones the repo and opens the README. Two paragraphs explain the dual nature of the product and point to the artifact set: brief, PRD (this document), architecture, stories, test design, build, QA, containerization, AI Integration Log.

**Rising action.** Jordan reads the brief, then this PRD, then the architecture document. The Project Principles section in the PRD makes the dual identity and tiebreaker explicit; the rest of the PRD reads as a normal product spec. The "Decisions Not Made" artifact answers Jordan's first three *"but why didn't they add…"* questions in one place. Jordan moves to the stories list and implements them in order, running tests after each.

**Climax.** Within one focused workday, Jordan runs `docker compose up`, gets a healthy multi-stage non-root container set, opens the private URL, adds a todo, completes it, deletes it. The Playwright suite passes locally. The coverage report shows ≥70% meaningful.

**Resolution.** Jordan now has a green build and a working understanding of how every BMAD lifecycle stage feeds the next. The AI Integration Log shows them how the human–AI interaction worked at each stage, with prompt + output + edit summary. Jordan can apply the same workflow on a different domain.

**Capabilities revealed (for the *artifact set*, not the running app):**
- README explains dual nature in two paragraphs; first-time reader gets oriented before opening any other artifact.
- Every BMAD lifecycle stage produces a consumable artifact, addressable from the README.
- "Decisions Not Made" artifact answers refused-feature questions in one place.
- AI Integration Log is a separate, publishable document with ≥1 substantive entry per stage.
- Stories are sequenced such that completing them in order yields a green build with passing E2E.
- Reproducibility target: ≤1 focused workday with no instructor intervention.

*(Instructors and reviewers consume the same artifact set; their journeys are subsumed by the trainee journey above. They appear as success-criteria stakeholders in **Business Success** rather than as separate journeys here.)*

### Journey Requirements Summary

The four journeys above collectively reveal the v1 capability surface:

| Capability | Revealed by |
|---|---|
| One-screen, no-login web UI; input pre-focused | Happy path |
| Add via single text input + Enter | Happy path |
| Tap-to-toggle complete / uncomplete | Happy path |
| Tap-to-delete individual items | Happy path |
| Visual distinction of completed vs active rows | Happy path, persistence |
| Optimistic UI on every mutation | Happy path, rollback |
| Backend-rejection rollback + retry toast preserving payload | Optimistic-rollback recovery |
| Non-blocking error surface that doesn't gate other input | Optimistic-rollback recovery |
| Per-browser per-deployment persistence via opaque local key | Persistence, happy path |
| Empty-state render when a fresh browser key has no list | Persistence |
| Long-list render with active + completed coexisting (no filter) | Persistence |
| Designed empty / loading / error / long-list states | All three product journeys |
| Artifact set + AI Integration Log + "Decisions Not Made" | Trainee journey |
| `docker compose up` healthy from clean checkout | Trainee journey |

**Open questions surfaced by these journeys — all resolved in subsequent sections:**

- **Delete confirmation:** instant, no confirmation prompt. Recovery is via the standard rollback-with-retry-toast on backend rejection only. (FR7.)
- **Sort order:** `created_at` descending (newest first), regardless of completion status; no grouping. (FR17.)
- **256-char cap behavior:** hard limit; input refuses character 257. (FR4.)
- **Cross-device empty-list affordance:** purely visual; no "this is a different browser" messaging in v1. (FR13.)

## Web Application Specific Requirements

### Project-Type Overview

ToDo App is a single-page web application (SPA) — one screen, no routing other than the implicit "is the list loaded?" state. The frontend is decoupled from the backend via a small CRUD HTTP API. No server-side rendering pass for SEO purposes (SEO is an explicit non-goal — see below). The deployment surface is a static frontend bundle plus a backend service plus a database, all containerized.

### Browser Support Matrix

Target evergreen browsers — **last 2 major versions** of Chrome, Firefox, Safari, and Edge (desktop and mobile equivalents) at v1 release.

| Browser | Minimum target |
|---|---|
| Chrome / Edge (Chromium) | Last 2 major versions |
| Firefox | Last 2 major versions |
| Safari (macOS) | Last 2 major versions |
| Mobile Safari (iOS) | Last 2 iOS major versions |
| Mobile Chrome (Android) | Last 2 major versions |

**Explicitly NOT supported:** Internet Explorer (any version), pre-Chromium Edge, any browser without `localStorage` and `fetch`. The deployment posture is local-first / private-URL — there is no business case for legacy-browser breadth.

### Responsive Design

A single responsive layout serves desktop and mobile from the same routes and same bundle. Breakpoints (final values to be confirmed in UX design):

- **Mobile-first base:** ≤640 px width.
- **Tablet / small desktop:** 641–1024 px.
- **Desktop:** ≥1025 px.

Touch-target sizing for any interactive control on mobile: **minimum 44 × 44 CSS pixels** (iOS HIG floor; Material Design recommends 48 × 48 — design may pick the larger). Tap-to-toggle and tap-to-delete controls must clear this bar. Hit areas may exceed visible glyph size to meet it.

The four designed UI states (empty, loading, error, long-list) all render correctly across all breakpoints. Long descriptions wrap; they do not cause horizontal scroll.

### Performance Targets

See **Non-Functional Requirements → Performance** for the canonical budget table (optimistic UI round-trip, backend confirm, first load, warm load, console errors). All values are budgets, not aspirations; tests assert the relevant ones, and failing the budget fails the build.

### SEO Strategy

**Not applicable for v1.** SEO is an explicit non-goal:

- Deployment posture is local-first / private-URL by default; v1 is not exposed on the public internet.
- A no-auth durable list on the open internet is an unacceptable risk profile (see Project Principles).
- There is no marketing surface, no landing page, no content to index.

No `robots.txt`, no sitemap, no Open Graph tags, no schema.org markup, no SSR. If a future module exposes the app publicly, that module owns the SEO question (and will likely answer *still no — a personal todo app's indexable surface is harmful*).

### Real-Time Requirements

**Not applicable for v1.** No websockets, no server-sent events, no long-polling, no collaborative editing.

Persistence semantics (per-browser per-deployment via opaque local key — durable on the same browser, deliberately not synced across devices) make real-time meaningless at v1's scope: there is no second client to synchronize with. Cross-device sync is a deferred Growth feature; if it lands, real-time becomes a question for that module.

### Accessibility Level

**WCAG 2.1 AA** — full conformance target, verification gates, color-contrast ratios, and live-region politeness are in **Non-Functional Requirements → Accessibility**. Web-app-specific affordances on top of the NFR floor:

- Tab order: input field → list items in render order → any toast actions when present.
- No `outline: none` on focusable elements without a replacement focus indicator.
- Color is never the *only* signal for completion state — strike-through and reduced opacity carry the meaning alongside any color change.
- Per **Project Principles**, accessibility is a non-negotiable floor; neither identity may negotiate it down.

### Implementation Considerations

- **Bundle and packaging:** static frontend bundle served via the same backend container or a lightweight static-asset container; choice deferred to `bmad-create-architecture`.
- **No offline mode:** brief is explicit. No Service Worker, no cache-first strategy, no background sync. The app requires network reachability to its backend; on failure it shows the error state with retry.
- **No native APIs:** no Notifications API, no clipboard "share" hooks, no Push, no install-prompt UI. v1 is a web page, full stop.
- **Single bundle:** no code-splitting required at v1's scope. Whether to ship as ESM or a single bundled JS file is an architecture decision.
- **No third-party telemetry / analytics SDK in v1.** The local-first / private-URL posture and the calm-by-default stance both argue against background pings to external services. If telemetry is added later (e.g., via a successor module), it will be opt-in and locally hosted.

## Release Strategy & Risk Mitigation

### MVP Strategy & Philosophy

**MVP approach:** problem-solving + experience MVP, deliberately constrained to single-user / single-list at minimal scope. The MVP exists to validate **two distinct hypotheses simultaneously**:

1. **Product hypothesis.** For the focused individual, a deliberately-refused-features todo app feels *calmer* than the incumbents. Validation target: ≥3/5 unprompted "I'd use this" in 5-person usability test.
2. **Training hypothesis.** A small-but-complete artifact set is sufficient for a trainee to reproduce v1 in one focused workday with no instructor intervention.

The two hypotheses can pass or fail independently. The dual identity makes them both first-class. The Project Principles tiebreaker resolves *aesthetic* conflicts between them; security, accessibility, and data integrity remain floors below which neither may negotiate.

**Resource requirements.** v1 is sized to be reproducible by a single trainee in one focused workday — implying total core implementation work is on the order of low tens of hours, not multi-week. The BMAD pathway exercises 1 PM (John) + 1 architect (Winston) + 1–2 engineers (Amelia) + 1 test architect (Murat); each role's lift is small at this scope, and the artifact-set discipline is what fills the rest of the calendar time.

### Must-Have Analysis

For each v1 feature, the must-have test: *without this, does the product fail?* No "nice-to-haves" exist in v1 — anything not on this list is **deferred**, not "stretch."

| Feature | Must-have? | Without it, the failure is… |
|---|---|---|
| Add (single text input + Enter) | YES | No way to capture; product is a no-op |
| See list (default view) | YES | No way to view what was captured |
| Toggle complete (single tap) | YES | No way to mark done; product becomes write-only |
| Delete (single tap) | YES | List grows without bound; long-list state unreachable from the active set |
| Per-browser per-deployment persistence (opaque local key, durable across refresh / restart / tab close) | YES | Refresh wipes everything — unusable at the most basic level |
| Optimistic UI with explicit rollback (instant client update; backend confirm; on rejection, rollback + non-blocking toast with retry) | YES | User either waits 500 ms+ between every action (kills calm-by-default) or silent failures lose data |
| Visual completed/active distinction (struck-through, faded; not color-only) | YES | User cannot tell what's done at a glance |
| Designed empty / loading / error / long-list states | YES | One of these is the user's first impression; undesigned states break the calm stance |
| WCAG AA + keyboard-only walkthrough completing all four verbs | YES (floor) | Project Principles non-negotiable |
| ≥70% meaningful coverage + ≥5 Playwright E2E (incl. ≥1 optimistic-rollback path) | YES (floor) | Engineering bar is load-bearing for the training identity |
| Multi-stage non-root Docker Compose with health checks | YES (floor) | Same — required by training identity |
| Architectural seams (4 specified: nullable `owner_id`, ownership-check stub, request-context object, thin service layer) | YES | Paid for by training identity to demonstrate option-value; removing them collapses the dual-purpose case |
| AI Integration Log per BMAD lifecycle stage (separate publishable document) | YES | First-class training artifact; without it, the training identity is incomplete |

### Phase 1 — MVP (v1)

(See **Product Scope → MVP** for the canonical feature list. This phase ships exactly what's there, in full, against all the must-haves above.)

**Core user journeys covered:** all four mapped journeys (Happy path, Optimistic-rollback recovery, Persistence & durability, Trainee reproduces v1).

### Phase 2 — Deferred (Post-v1)

Each deferred capability is *one candidate per training module* on the same repo. The architectural seams in v1 exist precisely to absorb these without rewrites:

- **Authentication and multi-user data separation** → absorbed via `owner_id` seam, ownership-check stub, and request-context object.
- **AI capabilities (NL capture, gentle triage)** → absorbed via service-layer seam; constraint: AI complexity must never expose project / priority / tag concepts to the user.
- **Cross-device sync / multi-device editing** → replaces the per-browser-per-deployment persistence model; absorbed via request-context principal.
- **Public / internet-exposed deployment** → requires an additional security pass; authentication is a precondition.

Every deferred capability also gets a documented entry in the **"Decisions Not Made"** artifact with its one-line rationale.

### Phase 3 — Vision (Future)

(See **Product Scope → Vision** for the full description.) Two parallel tracks: privacy-first personal product track, and the BMAD reference-implementation track that compounds AI Integration Log entries across modules.

### Risk Mitigation Strategy

**Technical risks.**

- *Riskiest assumption:* that the four seams are actually shaped right to absorb future modules without rewrites — i.e., that they earn the training-identity tax we're paying. **Mitigation:** at architecture stage (`bmad-create-architecture`), sketch the *first* successor module (auth) end-to-end against the seams *as written for v1*. If the seams need to bend, fix them in v1 before merging — not later.
- *Secondary risk:* optimistic UI with explicit rollback has subtle correctness traps (mid-flight concurrent mutations, retry races, idempotency on the backend). **Mitigation:** one of the ≥5 Playwright E2E tests specifically exercises rollback under concurrent user input; the test design step makes this explicit.
- *Tertiary risk:* per-browser per-deployment persistence may surprise users on a second device. **Mitigation is informational, not technical** — the README and PRD document the model; v1 accepts the friction at private-URL scope. (A future module that adds public deployment would also add the affordance.)

**Validation / market risks.**

- *Riskiest assumption:* that calm-by-default minimalism resonates *enough* for the focused individual to choose it over Apple Reminders. **Mitigation:** the 5-person usability test is the validation. If <3/5 say they'd use it, the **product hypothesis** fails. The **training hypothesis** can still succeed independently — important given the dual identity, and no reason to let one drag the other down.
- v1 is non-commercial; conventional market risk (low conversion, failed launch) does not apply.

**Resource / contingency risks.**

- *Riskiest constraint:* the ≤1 focused workday trainee-reproduction target. If implementation drifts and reproducing v1 requires significantly more than one day, the **training hypothesis** erodes. **Mitigation:** at story-design stage, time-box the implementation story sequence; the decision rule when over budget is *cut polish, keep the floor* — never the other way around (per Project Principles).
- *Resource floor:* there is no smaller version of v1 that still satisfies the dual identity. The floor is "minimum that is still both a usable app *and* a complete training reference." Below the floor, ship-the-product and ship-the-reference both fail.

## Functional Requirements

### Task Capture

- **FR1:** User can create a new todo with a text description of 1 to 256 characters.
- **FR2:** User can submit a new todo with a single action (no separate "save" step).
- **FR3:** System rejects zero-character submissions (no empty todos created).
- **FR4:** System enforces a hard character limit of 256 on todo descriptions; input does not accept character 257.

### Task Lifecycle

- **FR5:** User can mark an active todo as complete.
- **FR6:** User can revert a completed todo back to active.
- **FR7:** User can delete an individual todo permanently. Delete is instant with no confirmation prompt; the only recovery path is the standard rollback-with-retry-toast if the backend rejects the delete request.
- **FR8:** System assigns a `created_at` timestamp at todo creation; this timestamp is immutable.
- **FR9:** System rejects mutations targeting todos that no longer exist, via the standard error path.

### Task Display

- **FR10:** User sees the full list of their todos on app load, with no login screen, no onboarding modal, no welcome pitch.
- **FR11:** User sees both active and completed todos in the same list. v1 provides no filter to hide completed.
- **FR12:** System distinguishes completed from active todos visually; the distinction does not depend on color alone (strike-through and reduced opacity carry the meaning).
- **FR13:** User sees a designed *empty* state when no todos exist for their browser key; the empty state is purely visual (no cross-browser messaging in v1).
- **FR14:** User sees a designed *loading* state during the initial fetch.
- **FR15:** User sees a designed *error* state when the backend is unreachable and the list cannot be loaded.
- **FR16:** User sees a designed *long-list* state when the list contains many items (active and completed coexisting).
- **FR17:** System renders todos sorted by `created_at` descending (newest first), regardless of completion status. No grouping by status.
- **FR18:** System renders long descriptions (up to the 256-char cap) with appropriate wrapping; long descriptions never cause horizontal scroll.

### Persistence & Identity

- **FR19:** System assigns each browser an opaque local key (cookie or localStorage) on first interaction; this key persists across page reloads, browser restarts, and tab close on the same browser.
- **FR20:** System associates every todo with the browser key of the originating request, via a nullable `owner_id` field on the todo entity (in v1, set to the opaque browser key).
- **FR21:** System returns only the todos associated with the requesting browser key.
- **FR22:** System treats an unknown browser key as a fresh, empty list (not as an error).
- **FR23:** System never synchronizes todo state across browsers or devices in v1; each browser per deployment is its own list.
- **FR24:** System persists todos durably across application restart, container restart, and transient database-connection failures, within the boundaries of the configured database.

### Optimistic UI & Error Recovery

- **FR25:** Client applies every mutation (add, complete, uncomplete, delete) to the visible UI before backend confirmation arrives.
- **FR26:** On backend rejection of any mutation, client rolls the optimistic UI change back to its prior state.
- **FR27:** On backend rejection, client surfaces a non-blocking toast describing the failure and offering a **Retry** action; the toast does not gate other input.
- **FR28:** When the user activates **Retry**, client re-issues the original mutation with the original payload (data, not just action).
- **FR29:** Failure of one mutation does not block the user from issuing other mutations concurrently.
- **FR30:** A successful retry dismisses the corresponding toast automatically.

### Accessibility & Input

- **FR31:** User can complete every interactive task (add, complete, uncomplete, delete, see, retry) using only the keyboard.
- **FR32:** System provides a visible focus indicator on every interactive element.
- **FR33:** System exposes an accessible label (visible text or ARIA) on every icon-only control.
- **FR34:** System announces transient errors to assistive technologies via a live region with appropriate politeness (`polite`, never `assertive` for routine errors).
- **FR35:** System renders correctly across mobile, tablet, and desktop breakpoints.
- **FR36:** All interactive controls on mobile meet a minimum touch-target size (specific value in NFR).

### Architectural Seams (Training-Identity Capabilities)

- **FR37:** System exposes a per-request context object that carries the principal identity (in v1, the opaque browser key); this is the single seam where a future module would inject a real authenticated user.
- **FR38:** System routes every mutating request through an ownership-check stub. In v1 the stub is a no-op, but it is invocable and pluggable; future modules replace it with a real check.
- **FR39:** System separates HTTP/transport handlers from persistence via a thin service layer; handlers do not call the database directly.
- **FR40:** The todo entity supports a nullable `owner_id` field, populated with the opaque browser key in v1 and structurally ready to receive a real user identifier in a future module.

### Containerization & Deployment

- **FR41:** System ships as a multi-stage Docker Compose stack composed of non-root containers.
- **FR42:** Each container in the stack exposes a health check the orchestrator uses to determine readiness.
- **FR43:** A clean checkout plus a single command (`docker compose up`) yields a healthy, running stack with no manual configuration steps.
- **FR44:** System defaults to a private-URL / local-first deployment posture. Public exposure on the internet requires an explicit, separately documented decision and is out of scope for v1.

### Artifact-Set Capabilities (Training Audience)

- **FR45:** Repository contains a consumable artifact for every BMAD lifecycle stage (brief, PRD, architecture, stories, test design, build, QA, containerization), addressable from the README.
- **FR46:** Repository contains a "Decisions Not Made" artifact listing every excluded feature with a one-line rationale.
- **FR47:** Repository contains an AI Integration Log document with at least one substantive entry per BMAD lifecycle stage, including prompt, output, and human-edit summary.
- **FR48:** Repository README explains the dual-purpose nature of the project (real product + canonical training reference) and orients a first-time reader to the artifact set in two paragraphs.

## Non-Functional Requirements

### Performance

| Metric | Budget | Verification |
|---|---|---|
| Optimistic UI round-trip (input → optimistic state visible) | <100 ms p95 | Local Docker, instrumented client; Playwright assertion |
| Backend confirm latency (request → server response) | <500 ms p95 | Local Docker, server-side traces; Playwright assertion |
| First load (cold cache → interactive) | <2 s | Local Docker, broadband; Lighthouse / Playwright |
| Subsequent loads (warm cache) | <500 ms | Local Docker; Playwright |
| Console errors on golden paths | 0 | Playwright with browser-console assertion |

These are *budgets*, not aspirations. Tests must assert the relevant ones; failing the budget fails the build.

### Reliability & Data Integrity

- **Persistence durability:** todos survive page refresh, browser restart, tab close, application restart, container restart, and transient database-connection failures, on the same browser. Verified by automated E2E.
- **Optimistic rollback correctness:** on backend rejection of any mutation (add, complete, uncomplete, delete), the client UI returns to its prior state with no orphaned visual artifacts; the toast surfaces the failure with retry. Concurrent mutations during a rollback do not corrupt UI state. Verified by ≥1 dedicated Playwright E2E.
- **Idempotency:** retried mutations are safe — the same payload re-issued produces neither duplicate todos nor double-applied state changes. Verified at the API-contract level in test design.
- **Zero silent failures:** every backend rejection produces a visible, actionable surface in the UI. The client never swallows an error.

### Security & Privacy

- **Threat model for v1.** Local-first / private-URL deployment posture. The opaque browser key is *not* a security boundary; it is an identity proxy for organizing one browser's list against the deployment's database. Anyone with network access to the deployment URL and a browser key can read or mutate that key's list. The model is acceptable *because* the deployment is private-URL and the key never leaves the browser-server channel.
- **Public-internet deployment is out of scope for v1.** Exposing v1 on the open internet without an additional security pass is an unacceptable risk profile. (Per Project Principles.)
- **Security review (OWASP Top 10 floor):** completed before v1 ships. Each finding triaged and either fixed or explicitly accepted in writing with rationale, signed off in the security-review document.
- **Container hygiene:** all containers run as non-root. No `latest` image tags. No host network mode. Multi-stage build ensures runtime images do not carry build-time tooling, package managers, or secrets.
- **No third-party telemetry, analytics SDK, error-tracking SDK, or background pings to external services in v1.** A future module that adds telemetry must do so opt-in and locally hosted.
- **Data residency:** all user data lives in the deployed database (and the browser's `localStorage` or cookie for the opaque key); no data leaves the deployment boundary in v1.
- **Per Project Principles, security is a non-negotiable floor; neither product polish nor training clarity may negotiate it down.**

### Accessibility

- **Conformance target:** WCAG 2.1 Level AA.
- **Verification gates (every release build):**
  - Automated scan (axe or equivalent) reports zero violations.
  - Manual keyboard-only walkthrough completes all four verbs (add, complete, uncomplete, delete) without a mouse.
- **Specific quality attributes** (referenced by FR31–FR36):
  - Visible focus indicator on every interactive element.
  - Color contrast ≥ 4.5:1 for text, ≥ 3:1 for UI components and graphical objects.
  - Touch targets ≥ 44 × 44 CSS pixels on mobile.
  - Live-region announcements for transient errors, with `polite` politeness for routine errors.
- **Per Project Principles, accessibility is a non-negotiable floor; neither identity may negotiate it down.**

### Scale & Capacity

v1 is single-user, single-list, per-browser per-deployment. Conventional scalability concerns (multi-tenant scaling, autoscaling, queue depth, sharding) do not apply. Capacity expectations are bounded by realistic personal-todo-list sizes.

- **Comfortable list size:** up to **100** active + completed items per browser key without perceptible performance degradation.
- **Degradation profile beyond 100:** linear visual rendering; no exponential slowdown, no horizontal scroll, no layout breakage.
- **No hard cap on list size in v1;** the system does not refuse the 101st todo. Long-list state is a designed UI state, not an error.
- **Database sizing assumption:** a single deployment may host up to ~100 distinct browser keys (e.g., a household sharing a private URL across personal browsers). Beyond that, performance and durability are not warranted by v1.

### Quality & Maintainability

These NFRs are load-bearing for the training identity — they define what the artifact set must look like to serve as a canonical BMAD reference.

- **Unit + integration coverage:** ≥ 70% meaningful (Vitest or Jest), where "meaningful" excludes trivial getters, framework-generated code, and the test fixtures themselves. Verified by coverage report on every CI build.
- **End-to-end coverage:** ≥ 5 Playwright E2E tests covering the golden paths *and* at least one optimistic-rollback path under concurrent input. Verified by test inventory in the repo.
- **Build reproducibility:** `docker compose up` from a clean checkout yields a healthy multi-stage non-root stack with passing health checks and no manual configuration steps. Verified on CI from a fresh runner.
- **Documentation completeness:** every BMAD lifecycle stage has at least one consumable artifact in the repo, addressable from the README (per FR45).
- **AI Integration Log substantiveness:** ≥ 1 substantive entry per BMAD lifecycle stage in the AI Integration Log, including prompt + output + human-edit summary. Verified by Log inventory check.
- **Trainee reproducibility:** a trainee following the artifact set reaches a green build and passing E2E suite within ≤ 1 focused workday, with no instructor intervention. Verified by a trainee dry-run before v1 is declared shipped.

### Compatibility

(See **Web Application Specific Requirements → Browser Support Matrix** and **Responsive Design** for canonical specifications. Targets summarized here for cross-reference:)

- **Browsers:** last 2 major versions of Chrome / Edge (Chromium), Firefox, Safari (macOS + iOS), Mobile Chrome (Android).
- **No support:** Internet Explorer, pre-Chromium Edge, browsers without `localStorage` and `fetch`.
- **Breakpoints:** mobile-first base ≤ 640 px; tablet 641–1024 px; desktop ≥ 1025 px.
- **Touch targets on mobile:** ≥ 44 × 44 CSS pixels.

### Usability

The **calm-by-default** stance has measurable signals beyond a qualitative impression:

- **First-time unaided completion:** ≥ 4/5 in a 5-person usability test complete add / view / complete / delete without instruction. Verified once by observed session before v1 declared shipped.
- **Adoption signal:** ≥ 3/5 of usability-test participants self-report (unprompted) they would use v1 as a calmer alternative to Apple Reminders or a notes app for short personal lists.
- **Friction floor:** time from app load to first user action is bounded by load time + a single click/keystroke. The app does not interpose modals, banners, or onboarding flows between load and action.
- **Synthetic-urgency mechanics are absent.** No streaks, no overdue indicators, no completion-percentage displays, no celebratory animations. Verified by inspection in QA review.
