---
stepsCompleted:
  - step-01-validate-prerequisites
  - step-02-design-epics
  - step-03-create-stories
  - step-04-final-validation
  - tea-amendments-applied
status: 'complete'
completedAt: '2026-04-29'
amendmentsAppliedAt: '2026-04-29'
totalEpics: 3
totalStories: 34
allFRsCovered: true
allUXDRsCovered: true
teaAmendmentsApplied: 9
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/ux-design-mockup.html
  - _bmad-output/planning-artifacts/product-brief-ToDo-App.md
  - _bmad-output/planning-artifacts/product-brief-ToDo-App-distillate.md
  - docs/prd-source.md
workflowType: 'epics-and-stories'
project_name: 'ToDo App'
user_name: 'Pouya'
date: '2026-04-29'
---

# ToDo App — Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for ToDo App, decomposing the requirements from the PRD, UX Design Specification, and Architecture into implementable stories.

## Requirements Inventory

### Functional Requirements

48 FRs across 8 capability areas (canonical text in PRD; reference list here):

**Task Capture (FR1–FR4)**
- FR1: User can create a new todo with a text description of 1 to 256 characters.
- FR2: User can submit a new todo with a single action (no separate "save" step).
- FR3: System rejects zero-character submissions (no empty todos created).
- FR4: System enforces a hard character limit of 256 on todo descriptions; input does not accept character 257.

**Task Lifecycle (FR5–FR9)**
- FR5: User can mark an active todo as complete.
- FR6: User can revert a completed todo back to active.
- FR7: User can delete an individual todo permanently. Delete is instant with no confirmation prompt; recovery only via rollback-with-retry-toast on backend rejection.
- FR8: System assigns a `created_at` timestamp at todo creation; this timestamp is immutable.
- FR9: System rejects mutations targeting todos that no longer exist, via the standard error path.

**Task Display (FR10–FR18)**
- FR10: User sees the full list of their todos on app load, with no login screen, no onboarding modal, no welcome pitch.
- FR11: User sees both active and completed todos in the same list. v1 provides no filter to hide completed.
- FR12: System distinguishes completed from active todos visually; the distinction does not depend on color alone (strike-through and reduced opacity carry the meaning).
- FR13: User sees a designed *empty* state when no todos exist for their browser key; the empty state is purely visual (no cross-browser messaging in v1).
- FR14: User sees a designed *loading* state during the initial fetch.
- FR15: User sees a designed *error* state when the backend is unreachable and the list cannot be loaded.
- FR16: User sees a designed *long-list* state when the list contains many items (active and completed coexisting).
- FR17: System renders todos sorted by `created_at` descending (newest first), regardless of completion status. No grouping by status.
- FR18: System renders long descriptions (up to the 256-char cap) with appropriate wrapping; long descriptions never cause horizontal scroll.

**Persistence & Identity (FR19–FR24)**
- FR19: System assigns each browser an opaque local key (cookie or localStorage) on first interaction; persists across page reloads, browser restarts, and tab close on the same browser.
- FR20: System associates every todo with the browser key of the originating request, via a nullable `owner_id` field on the todo entity (in v1, set to the opaque browser key).
- FR21: System returns only the todos associated with the requesting browser key.
- FR22: System treats an unknown browser key as a fresh, empty list (not as an error).
- FR23: System never synchronizes todo state across browsers or devices in v1.
- FR24: System persists todos durably across application restart, container restart, and transient database-connection failures.

**Optimistic UI & Error Recovery (FR25–FR30)**
- FR25: Client applies every mutation (add, complete, uncomplete, delete) to the visible UI before backend confirmation arrives.
- FR26: On backend rejection of any mutation, client rolls the optimistic UI change back to its prior state.
- FR27: On backend rejection, client surfaces a non-blocking toast describing the failure and offering a **Retry** action; toast does not gate other input.
- FR28: When the user activates **Retry**, client re-issues the original mutation with the original payload (data, not just action).
- FR29: Failure of one mutation does not block the user from issuing other mutations concurrently.
- FR30: A successful retry dismisses the corresponding toast automatically.

**Accessibility & Input (FR31–FR36)**
- FR31: User can complete every interactive task using only the keyboard.
- FR32: System provides a visible focus indicator on every interactive element.
- FR33: System exposes an accessible label (visible text or ARIA) on every icon-only control.
- FR34: System announces transient errors to assistive technologies via a live region with appropriate politeness (`polite`).
- FR35: System renders correctly across mobile, tablet, and desktop breakpoints.
- FR36: All interactive controls on mobile meet a minimum touch-target size (≥44×44 CSS px).

**Architectural Seams (FR37–FR40, training-identity capabilities)**
- FR37: System exposes a per-request context object that carries the principal identity (in v1, the opaque browser key); single seam where future authentication injects a real authenticated user.
- FR38: System routes every mutating request through an ownership-check stub. In v1 the stub is a no-op, but invocable and pluggable.
- FR39: System separates HTTP/transport handlers from persistence via a thin service layer; handlers do not call the database directly.
- FR40: The todo entity supports a nullable `owner_id` field, populated with the opaque browser key in v1, structurally ready for a future user identifier.

**Containerization & Deployment (FR41–FR44)**
- FR41: System ships as a multi-stage Docker Compose stack composed of non-root containers.
- FR42: Each container in the stack exposes a health check.
- FR43: A clean checkout plus a single command (`docker compose up`) yields a healthy, running stack with no manual configuration.
- FR44: System defaults to a private-URL / local-first deployment posture; public exposure is out of scope for v1.

**Artifact-Set Capabilities (FR45–FR48, training audience)**
- FR45: Repository contains a consumable artifact for every BMAD lifecycle stage, addressable from the README.
- FR46: Repository contains a "Decisions Not Made" artifact listing every excluded feature with a one-line rationale.
- FR47: Repository contains an AI Integration Log document with at least one substantive entry per BMAD lifecycle stage.
- FR48: Repository README explains the dual-purpose nature of the project and orients a first-time reader to the artifact set in two paragraphs.

### NonFunctional Requirements

8 categories (canonical detail in PRD; key budgets and thresholds here):

- **NFR-Performance:** <100 ms p95 optimistic UI round-trip; <500 ms p95 backend confirm; <2 s first load; <500 ms warm load; zero console errors on golden paths.
- **NFR-Reliability:** persistence durability across refresh/restart/tab close/app restart/container restart/DB blip; optimistic-rollback correctness under concurrent mutation; idempotent retry; no silent failures.
- **NFR-Security & Privacy:** local-first / private-URL only; no public-internet deployment in v1; OWASP Top 10 floor with documented triage; container hygiene (non-root, no `latest`, no host network); no third-party telemetry/analytics SDK; no data leaves the deployment boundary.
- **NFR-Accessibility:** WCAG 2.1 Level AA — automated axe scan zero-violations gate + manual keyboard walkthrough completing all four verbs; visible focus indicators; ≥4.5:1 text contrast; ≥3:1 UI component contrast; ≥44×44 touch targets.
- **NFR-Scale:** ~100 items per list, ~100 keys per deployment without degradation; no hard cap; long-list state designed.
- **NFR-Quality & Maintainability:** ≥70% meaningful Vitest coverage; ≥5 Playwright E2E including ≥1 optimistic-rollback under concurrent input; build reproducibility (`docker compose up` from clean checkout, healthy); AI Integration Log ≥1 substantive entry per BMAD stage; trainee reproducibility ≤1 focused workday.
- **NFR-Compatibility:** last 2 majors of Chrome / Edge / Firefox / Safari (desktop + mobile); `localStorage` + `fetch` required.
- **NFR-Usability:** ≥4/5 unaided completion in 5-person usability test; ≥3/5 say "I'd use this as a calmer alternative"; calm-by-default verifiable absence of streaks/badges/percentages/celebratory animations.

### Additional Requirements (from Architecture)

Technical requirements that impact epic and story creation:

- **Starter template:** `npx create-react-router@latest todo-app` is the **first implementation story**. Scaffolds Node-based server, Vite + TypeScript, file-based routes (loader/action). No auth, no DB shipped.
- **Stack components to add post-init:** PostgreSQL 17 (Docker container) + Drizzle ORM + drizzle-kit migrations + Zod validation + pino structured logging.
- **Runtime:** Node 22 LTS on slim Alpine base; multi-stage build with `USER node` on runtime stage.
- **Docker Compose services:** `web` (Node + Remix bundle) + `db` (Postgres 17) + optional `proxy` (Caddy/nginx for TLS). Health checks per service. Internal Docker network only; no host network mode.
- **Browser-key transport:** custom request header `X-Browser-Key: <uuid>` via thin `fetch` wrapper at `app/lib/browser-key.ts`. UUID via `crypto.randomUUID()`, persisted to `localStorage`.
- **Security headers:** Helmet-style — `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY`. Permissive CSP for v1 (single-origin).
- **Idempotency:** client-generated UUIDs for new todos; server uses `INSERT ... ON CONFLICT (id) DO NOTHING`. Retries are safe.
- **Error envelope:** discriminated union `{ ok: true, data: T } | { ok: false, error: { code, message, fieldErrors? } }`. All actions return this shape.
- **API style:** Remix loaders + actions (no separate Express/Fastify service, no GraphQL, no tRPC).
- **Path aliases:** `tsconfig.json` defines `~/components/*`, `~/services/*`, `~/middleware/*`, `~/lib/*`. No deep relative imports.
- **The four seams (FR37–40 implementation surface):**
  - `app/middleware/request-context.ts` — extracts `X-Browser-Key`, builds `RequestContext`
  - `app/middleware/ownership-check.ts` — no-op stub, pluggable
  - `app/services/todos.ts` — thin service layer
  - `db/schema.ts` — todo entity with nullable `owner_id`
- **Architecture Gap I-1 (must apply during request-context wiring):** name the principal field semantically — `ctx.ownerId` + tagged-union `principal: { kind: 'browser-key', browserKey } | { kind: 'user', userId }` — *not* `ctx.browserKey` directly. Service code consumes `ctx.ownerId`; auth modules later only change the middleware.
- **CI gate sequence (GitHub Actions):** typecheck → lint → vitest (coverage gate ≥70%) → playwright (E2E ≥5 incl. concurrent-rollback) → axe (zero violations) → docker build. Each step's failure breaks the build.
- **Repository-shape requirements:** README, CONVENTIONS.md, DECISIONS-NOT-MADE.md, AI-INTEGRATION-LOG.md (FR45–FR48).

### UX Design Requirements

UX Design specifies these implementation work items, each with story-level scope:

**Foundation**
- **UX-DR1: Design tokens.** Create `app/styles/tokens.css` with the canonical AA-verified token set: 8 color (`--color-bg`, `--color-fg`, `--color-fg-muted`, `--color-fg-faded`, `--color-border`, `--color-border-soft`, `--color-accent`, `--color-accent-fg`), 5 spacing (`--space-xs` through `--space-xl`), 6 typography (`--font-body`, `--font-mono`, 4 size tokens, line-height), 3 motion (durations + easing), 3 border/elevation. Body font stack: `"Charter", "Iowan Old Style", "Palatino", Georgia, serif`.
- **UX-DR2: Reset CSS + global base.** Reset.css + global.css using tokens; serif body, ivory background, no decorative defaults from frameworks.

**Primitive components (5)**
- **UX-DR3: TextInput primitive.** `app/components/TextInput.tsx` + `.module.css`. Pre-focused on mount (desktop only); 256-char `maxlength`; full-width; 1-px hard border; inverted-block focus ring (2-px `--color-accent` outer ring + cursor visible); placeholder `"Add a todo"` in `--color-fg-muted`; `aria-label="Add a todo"`.
- **UX-DR4: Checkbox primitive.** `app/components/Checkbox.tsx` + `.module.css`. Real `<input type="checkbox">` (hidden via `appearance: none`); 16×16 visible glyph in 1-px square frame; vintage Mac checkmark via two CSS borders rotated -45°; ≥44×44 hit area via padding wrapper; focus ring on wrapper; `--shadow-pressed` on active; `aria-label` derived from the parent ListItem's description.
- **UX-DR5: Button primitive.** `app/components/Button.tsx` + `.module.css`. Native `<button type="button">`; 1-px border, square corners, `--font-body` weight 600; default state (`--color-bg` bg, `--color-fg` text); hover-inverted (no transition); focused (accent outline ring); active (`--shadow-pressed`); used by Toast Retry + Error-state Retry.
- **UX-DR6: ListItem (TodoItem) component.** `app/components/TodoItem.tsx` + `.module.css`. Flex row: Checkbox + description + delete glyph. Active state: full-color text. Completed state: strike-through + `--color-fg-faded`. Focused state: inverted-block (entire `<li>` becomes `--color-accent` bg + `--color-accent-fg` text). Hover (desktop): delete glyph fades in via `--motion-duration-quick`. Mobile: delete glyph always visible. Delete glyph is `<button type="button">` with `aria-label="Delete: <description>"`.
- **UX-DR7: Toast component.** `app/components/Toast.tsx` + `.module.css`. Floating panel; bottom-right (desktop, 280px) / bottom-center (mobile, full-width-minus-padding); 1-px `--color-border` frame; `--shadow-toast` (hard offset 2px 2px 0); slide-in over `--motion-duration-quick`; persists indefinitely (no auto-dismiss); includes truncated description + Retry button + dismiss × glyph; `role="status"` + `aria-live="polite"` + `aria-atomic="true"`. Mounted via portal at `app/root.tsx`.

**State components (3)**
- **UX-DR8: EmptyState component.** `app/components/EmptyState.tsx`. Quiet typographic placeholder *"Nothing on the list."* in `--color-fg-muted` at `--font-size-sm`, centered horizontally, generous breathing room (`--space-xl` above and below). No CTA, no illustration.
- **UX-DR9: LoadingState component.** `app/components/LoadingState.tsx`. Static *"Loading…"* in `--color-fg-muted` at `--font-size-sm`. **No skeleton-loader pulse.** No spinner.
- **UX-DR10: ErrorState component.** `app/components/ErrorState.tsx`. Quiet text + Retry button. Input above the state remains functional (the state replaces the *list area*, not the shell).

**Layout & infrastructure**
- **UX-DR11: AppShell layout.** `app/root.tsx` mounts the page chrome (max-width 640px centered column; `--space-xl` outer padding desktop, `--space-md` mobile), the OptimisticStoreProvider, and the ToastPortal as a portal target.
- **UX-DR12: Optimistic-UI store.** `app/lib/optimistic-store.ts` — hand-rolled `useReducer` + Context + dispatch helpers (~100–200 LOC). State shape: `{ todos: Todo[], pendingMutations: Record<MutationId, PendingMutation> }`. Action types: `'addTodo' | 'toggleComplete' | 'deleteTodo' | 'confirmMutation' | 'revertMutation'`. Each pending mutation carries enough info to revert without re-fetching.
- **UX-DR13: Browser-key utility.** `app/lib/browser-key.ts` — `getBrowserKey(): string` (issues UUID via `crypto.randomUUID()` on first call, persists to `localStorage`); `fetch` wrapper that injects `X-Browser-Key` header on every request.

**Cross-cutting**
- **UX-DR14: Responsive cascade.** Mobile-first base CSS + `@media (min-width: 641px)` and `@media (min-width: 1025px)` progressive enhancement. Three breakpoints only. No `max-width` queries.
- **UX-DR15: Accessibility verification.** Every primitive's component test asserts native semantic element + required ARIA + keyboard activation paths + focus-indicator CSS rule presence. Axe-core in CI gate.
- **UX-DR16: Reduced-motion handling.** Global `@media (prefers-reduced-motion: reduce)` collapses all transitions to 0ms.
- **UX-DR17: Mobile capture-submit affordance.** Icon button on right edge of TextInput on mobile (where soft keyboard's Enter may not reliably submit). Uses Checkbox-style chrome (1-px border, square, ≥44×44 hit area). Hidden on desktop.
- **UX-DR18: Visual mockup artifact.** Static `_bmad-output/planning-artifacts/ux-design-mockup.html` (already exists from UX Step 9) ships with the artifact set as the first visual reference for trainees and reviewers.

### FR Coverage Map

| FR | Epic | Notes |
|---|---|---|
| FR1–4 | Epic 1 | Task Capture (TextInput + validation + char cap) |
| FR5–9 | Epic 1 | Task Lifecycle (toggle, delete, immutable created_at, 404 handling) |
| FR10–18 | Epic 1 | Task Display (loader, designed states, sort, completion visual, wrapping) |
| FR19–24 | Epic 1 | Persistence & Identity (browser key, schema, owner_id filtering, durability) |
| FR25–30 | Epic 1 | Optimistic UI & Recovery (store, rollback, Toast, retry, idempotency) |
| FR31–36 | Epic 1 | Accessibility & Input (keyboard, focus, ARIA, live region, responsive, touch targets) |
| FR37–40 | Epic 1 | Architectural Seams (request-context with Gap I-1, ownership-check stub, service layer, owner_id) |
| FR41–44 | Epic 2 | Containerization & Deployment (multi-stage Docker, health checks, one-command bootstrap, private-URL posture) |
| FR45 | Epic 3 | Per-stage artifacts addressable from README |
| FR46 | Epic 3 | Decisions Not Made artifact |
| FR47 | Epic 3 | AI Integration Log per BMAD lifecycle stage |
| FR48 | Epic 3 | README dual-nature explanation in two paragraphs |

All 48 FRs covered. NFRs are cross-cutting acceptance criteria across stories, not separate epic items.

## Epic List

### Epic 1: Use Your List — The Running App

**User outcome.** Sam can capture, see, complete, and clear personal tasks via `npm run dev` (the full v1 experience as a local-development deliverable). All four verbs work, all four designed UI states render, optimistic UI with explicit rollback is wired end-to-end, the four architectural seams (request-context with Gap I-1 semantic naming, ownership-check stub, service layer, nullable `owner_id`) hold, the entire UI is keyboard-completable, and the visual design follows the vintage-Mac-System-7 direction with WCAG 2.1 AA verified.

**FRs covered:** FR1–FR40.

**Cross-cutting acceptance criteria (apply to every story in this epic):**
- Token discipline: every CSS rule consumes `var(--token-name)` from `app/styles/tokens.css`; no raw hex values, no magic numbers in component CSS.
- Import discipline: `db/*` imports nothing from `app/*`; `app/services/*` never imports from `app/routes/*` or `app/middleware/*`; `app/components/*` never imports from `app/services/*`, `app/middleware/*`, or `db/*`.
- Story passes `pnpm typecheck` + `pnpm lint`; all unit/integration tests for touched files pass.
- Color is never the only signal for any state; visible focus indicator on every interactive element added; native HTML semantic element preferred over ARIA.
- Optimistic UI rollback contract (apply to every mutation story): client applies optimistically, on failure reverts AND surfaces non-blocking Toast with payload-preserving Retry; idempotency guaranteed (client-UUID + `INSERT ... ON CONFLICT` for create; natural for toggle/delete).
- **Data-testid discipline (UI stories 1.10–1.17):** every interactive element exposes a stable `data-testid` attribute per the TEA handoff document's Data-TestId Requirements table — `data-testid="todo-input"`, `data-testid="todo-checkbox-${id}"`, `data-testid="todo-item-${id}"`, `data-testid="todo-delete-${id}"`, `data-testid="toast"`, `data-testid="toast-retry"`, `data-testid="empty-state"`, `data-testid="loading-state"`, `data-testid="error-state"`, `data-testid="error-retry"`. Prevents fragile E2E selector drift on CSS changes. (TEA amendment M-2.)

### Epic 2: Container & Quality Gates

**User outcome.** Anyone with a clean checkout of the repo can run `docker compose up` and get a healthy, multi-stage non-root container stack serving the app on a private URL — and every CI gate (typecheck → lint → ≥70% Vitest coverage → ≥5 Playwright E2E including concurrent-rollback → axe zero violations → docker build) passes on a fresh runner. Someone other than the developer can trust the deliverable.

**FRs covered:** FR41–FR44 (containerization) + cross-cutting NFR achievement (Quality & Maintainability, Security, Reliability budgets).

**Cross-cutting acceptance criteria:**
- All container images run as non-root; no `latest` tags; no host network mode; multi-stage build separates build-time tooling from runtime.
- Helmet-style security headers applied; OWASP Top 10 review completed; findings triaged or accepted in writing.
- Per-container health checks; `web` depends on `db`'s health.
- Env vars validated by Zod at process start; `.env.example` documents required vars; no secrets hardcoded.
- pino structured JSON to stdout; no third-party log aggregation SDKs.

### Epic 3: Artifact-Set & Training Identity

**User outcome.** Trainees, instructors, and reviewers consuming the repo as a BMAD training reference find every lifecycle-stage artifact addressable from a two-paragraph README, can read the "Decisions Not Made" artifact to re-derive scope under different constraints, and can study the per-stage AI Integration Log to understand how the human–AI partnership produced each artifact. A trainee following the artifact set reaches a green build + passing E2E suite within ≤1 focused workday with no instructor intervention.

**FRs covered:** FR45–FR48.

**Cross-cutting acceptance criteria:**
- All artifacts addressable from `README.md`'s table of contents.
- Every refused feature (from PRD + Architecture + UX) has a one-line rationale in `DECISIONS-NOT-MADE.md`.
- AI Integration Log has at least one substantive entry per BMAD lifecycle stage (brief, PRD, architecture, UX, stories, build, QA, containerization), with prompt + output + human-edit summary.
- Closing verification: trainee dry-run succeeds against the artifact set in ≤1 focused workday.

## Epic 1: Use Your List — The Running App

Sam can capture, see, complete, and clear personal tasks. The full v1 experience as a `npm run dev` deliverable. All four verbs work, all four designed UI states render, optimistic UI with explicit rollback is wired end-to-end, the four architectural seams hold (with Gap I-1 semantic naming applied), the entire UI is keyboard-completable, and the visual design follows the vintage-Mac-System-7 direction with WCAG 2.1 AA verified.

### Story 1.1: Project Initialization

As a trainee following the artifact set,
I want a scaffolded React Router 7 (Framework Mode) project with TypeScript strict mode and path aliases,
So that I can `npm run dev` and see a working RR7 default page on first boot.

**Acceptance Criteria:**

**Given** a clean working directory
**When** I run `npx create-react-router@latest todo-app` and accept defaults (Node-based template)
**Then** the project scaffolds with TypeScript, Vite, and file-based routing under `app/routes/`
**And** `tsconfig.json` enables `strict: true` and defines path aliases `~/components/*`, `~/services/*`, `~/middleware/*`, `~/lib/*`
**And** `git init` is run; `.gitignore` covers `node_modules/`, `.env`, build outputs
**And** `pnpm install && pnpm dev` serves the default RR7 page at `localhost:5173`
**And** `pnpm typecheck` and `pnpm lint` pass

### Story 1.2: Design Tokens & AppShell Foundation

As a developer building UI,
I want the canonical AA-verified design-token set + `AppShell` layout in place,
So that every subsequent component consumes tokens via `var(--token-name)` and renders inside the centered, max-width-640px column.

**Acceptance Criteria:**

**Given** the project initialized in Story 1.1
**When** I implement `app/styles/tokens.css`, `app/styles/reset.css`, `app/styles/global.css`
**Then** tokens.css contains the canonical 25 tokens (8 color, 5 spacing, 6 typography, 3 motion, 3 border) per UX spec Visual Foundation
**And** body font stack is `"Charter", "Iowan Old Style", "Palatino", Georgia, serif`
**And** every color token combination has been AA-verified (≥4.5:1 for text, ≥3:1 for UI)
**And** `app/root.tsx` mounts the `AppShell` with `max-width: 640px` centered column, `--space-xl` outer padding desktop, `--space-md` mobile
**And** the rendered page shows the ivory background and serif body font

### Story 1.3: Browser Key Utility & Fetch Wrapper

As Sam (the user),
I want my browser to be assigned a stable opaque identifier on first interaction,
So that the backend can distinguish my list from any other browser's list.

**Acceptance Criteria:**

**Given** an initialized project
**When** I implement `app/lib/browser-key.ts` exporting `getBrowserKey(): string` and a `fetch` wrapper
**Then** `getBrowserKey()` reads from `localStorage`; if absent, generates a UUID via `crypto.randomUUID()` and persists it
**And** the same browser session returns the identical key on every subsequent call
**And** the `fetch` wrapper injects `X-Browser-Key: <uuid>` header on every request
**And** unit tests cover: first-call persistence, second-call returns same value, header injection on every request
**And** the utility is server/client-safe (no Node-only or browser-only APIs without a runtime guard)

### Story 1.4: Database Schema & Initial Migration

As a developer building the persistence layer,
I want the `todos` table created with the seam-shape schema (nullable `owner_id`),
So that subsequent stories can read and write through Drizzle against a real Postgres instance.

**Acceptance Criteria:**

**Given** an initialized project + Postgres reachable per `.env`
**When** I add Drizzle ORM (+ `drizzle-kit`) and `pg` (or `postgres.js`) and define `db/schema.ts`
**Then** the `todos` table has columns: `id` (uuid PK, default `gen_random_uuid()`), `description` (varchar, NOT NULL), `completion_status` (boolean, NOT NULL, default `false`), `created_at` (timestamptz, NOT NULL, default `now()`), `owner_id` (uuid, **nullable**)
**And** `db/migrations/0001_init.sql` is generated by `drizzle-kit generate` and applied
**And** index `idx_todos_owner_id_created_at` on `(owner_id, created_at DESC)` exists
**And** Drizzle schema declares column-name aliases so the boundary maps snake_case (DB) ↔ camelCase (TS)
**And** `db/client.ts` exports a single Drizzle connection; integration test confirms a SELECT query works
**And** **CI migration test** (Test 1.4-INT-001): a CI step spins up a fresh Postgres 17 container, runs all migrations from `0001_init.sql` onward, asserts schema state — column types match, `owner_id` is nullable, `idx_todos_owner_id_created_at` index is present. *Mitigates DATA-4 (migration failure on deployment, score 6).* (TEA amendment M-1.)

### Story 1.5: Request-Context Middleware (with Gap I-1 Semantic Naming)

As an architect honoring the four seams,
I want a request-context middleware that builds a `RequestContext` with semantically-named fields,
So that future auth modules can replace the principal source without changing service-layer call sites.

**Acceptance Criteria:**

**Given** Stories 1.3 and 1.4 are complete
**When** I implement `app/middleware/request-context.ts` exporting `buildRequestContext(request): RequestContext`
**Then** `RequestContext` has shape `{ requestId: string, principal: Principal, ownerId: string }`
**And** `Principal` is a tagged union: `{ kind: 'browser-key', browserKey: string } | { kind: 'user', userId: string }` (the `'user'` variant is *declared but not constructed* in v1)
**And** `ownerId` is derived from `principal.browserKey` when `kind === 'browser-key'`
**And** the middleware reads `X-Browser-Key` header from the request; if absent, generates a new UUID server-side as a fallback (logs a warning)
**And** unit tests cover: header present (uses it), header absent (generates fallback), `ownerId` derived correctly
**And** **service code consumes `ctx.ownerId` (never `ctx.principal.browserKey` directly)** — Gap I-1 fix applied
**And** **CI grep enforcement** (TEA amendment m-1): a CI step runs `grep -r 'ctx.principal.browserKey' app/services/` and fails the build on any match. Static enforcement of Gap I-1 semantic-naming discipline. *Companion to Story 2.7 lint infrastructure.*

### Story 1.6: Ownership-Check Stub Middleware

As an architect honoring the seams,
I want an ownership-check middleware function in the request pipeline as a no-op pass-through,
So that future auth/permission modules can replace it without touching every action.

**Acceptance Criteria:**

**Given** Story 1.5 is complete
**When** I implement `app/middleware/ownership-check.ts` exporting `checkOwnership(ctx: RequestContext, resourceOwnerId: string | null): void`
**Then** in v1 the function is a no-op pass-through (returns void without throwing)
**And** the function signature is pluggable — a future auth module can replace the body to throw `UnauthorizedError` if `ctx.principal.kind !== 'user'` or if `resourceOwnerId !== ctx.ownerId`
**And** every action in the codebase calls `checkOwnership(ctx, resourceOwnerId)` before invoking the service layer
**And** unit test confirms current no-op behavior; comment documents the future-extension contract
**And** **Vitest middleware test** (TEA amendment m-2, Test 1.6-UNIT-001): asserts `checkOwnership(ctx, resourceOwnerId)` is called before any service-layer invocation in every action handler. Pattern verification for the seam invocation discipline.

### Story 1.7: Service Layer — listTodos

As a developer wiring data access,
I want a `listTodos(ctx)` service function that returns todos filtered by `ownerId`,
So that the loader can read the user's list through the thin service-layer seam.

**Acceptance Criteria:**

**Given** Stories 1.4, 1.5 are complete
**When** I implement `app/services/todos.ts` exporting `listTodos(ctx: RequestContext): Promise<Todo[]>`
**Then** the function queries Drizzle for todos where `owner_id = ctx.ownerId`, ordered by `created_at` DESC
**And** unknown `ownerId` returns `[]` (not an error) — FR22
**And** `Todo` TypeScript type is shared via `app/types/todo.ts`
**And** integration test runs against a real Postgres test DB, asserting: empty case returns `[]`, single-todo case returns 1 item, two-todo case returns them in DESC order, foreign `ownerId` returns `[]`

### Story 1.8: Read List End-to-End (Loader + State Components + ListItem read-only)

As Sam,
I want to open the URL and see my list (or the empty/loading/error state),
So that I have visual confirmation the app loads correctly across all four states.

**Acceptance Criteria:**

**Given** Stories 1.1–1.7 are complete
**When** I implement `app/routes/_index.tsx` with a `loader` and the four state components (`EmptyState`, `LoadingState`, `ErrorState`, `ListItem` read-only)
**Then** the loader calls `buildRequestContext(request)` → `checkOwnership(ctx, null)` → `listTodos(ctx)` and returns the discriminated-union envelope
**And** during the fetch, the `LoadingState` ("Loading…" in `--color-fg-muted`) is rendered — no skeleton-loader pulse
**And** when the list is empty, `EmptyState` ("Nothing on the list.") renders
**And** when the loader returns todos, the list renders with `ListItem` components in `created_at` DESC order
**And** when the loader errors (5xx or unreachable), `ErrorState` renders ("Couldn't load the list.") — input above is still functional
**And** long descriptions wrap; no horizontal scroll
**And** an integration test asserts each state renders correctly given the appropriate loader response

### Story 1.9: Optimistic UI Store (Foundation)

As a developer wiring client-side state,
I want a hand-rolled optimistic-UI store mounted at the AppShell level,
So that subsequent verb-implementation stories have a single state primitive to dispatch through.

**Acceptance Criteria:**

**Given** Story 1.8 is complete
**When** I implement `app/lib/optimistic-store.ts` (`useReducer` + Context + dispatch helpers)
**Then** state shape is `{ todos: Todo[], pendingMutations: Record<MutationId, PendingMutation> }`
**And** action types are `'addTodo' | 'toggleComplete' | 'deleteTodo' | 'confirmMutation' | 'revertMutation'`
**And** each `PendingMutation` carries enough info to revert without re-fetching
**And** `OptimisticStoreProvider` is mounted in `app/root.tsx` and seeded from `loaderData.todos`
**And** unit tests cover: each action type's reducer logic, concurrent pending mutations don't corrupt state, revert restores prior status correctly
**And** failure of one pending mutation never blocks dispatching another (FR29)

### Story 1.10: TextInput Primitive + Capture (Add) End-to-End

As Sam,
I want to type a todo, press Enter, and see it appear at the top of the list instantly,
So that I can capture thoughts with zero friction.

**Acceptance Criteria:**

**Given** Stories 1.4, 1.5, 1.7, 1.9 are complete
**When** I implement `TextInput` primitive + `createTodo` service + the `_index.tsx` action handler
**Then** `TextInput` renders 1-px hard border, pre-focused on desktop mount, placeholder "Add a todo" in `--color-fg-muted`, accent focus ring (2-px outer ring + visible cursor)
**And** `maxlength="256"` silently rejects character 257 (FR4)
**And** Enter submits; whitespace-only is silently rejected (FR3)
**And** action validates payload via Zod (`description: z.string().min(1).max(256)`); on failure returns `400 { ok: false, error: { code: 'VALIDATION', fieldErrors } }`
**And** action calls `checkOwnership(ctx, null)` → `createTodo(ctx, { id, description })` (id client-generated UUID); service uses `INSERT ... ON CONFLICT (id) DO NOTHING` for idempotency
**And** on submit, client dispatches `addTodo` action with client-generated UUID; field clears + remains focused; new todo appears at top of list optimistically
**And** on success, dispatches `confirmMutation`; on rejection, dispatches `revertMutation` (Toast wiring is Story 1.13/1.14)
**And** integration test asserts add → optimistic render → server confirm; unit test asserts the action's envelope shape

### Story 1.11: Checkbox Primitive + Toggle Complete End-to-End

As Sam,
I want to tap a checkbox to mark a todo complete (or undo it),
So that the list reflects what I've finished — instantly, with visible strike-through.

**Acceptance Criteria:**

**Given** Story 1.10 is complete
**When** I implement `Checkbox` primitive + `toggleComplete` service + `todos.$id.tsx` PATCH action
**Then** `Checkbox` is a real `<input type="checkbox">` (hidden via `appearance: none`); 16×16 visible glyph in 1-px frame; vintage Mac checkmark via two CSS borders rotated -45°; ≥44×44 hit area via wrapper padding
**And** focus state shows accent ring on the wrapper (not the glyph); `aria-label` is set from the parent ListItem's description
**And** action calls `checkOwnership(ctx, todo.owner_id)` → `toggleComplete(ctx, id, completed)` service
**And** service is naturally idempotent (UPDATE to same value is a no-op)
**And** `ListItem` renders strike-through + `--color-fg-faded` text when `completion_status === true` (color is *not* the only signal — strike-through carries the meaning, FR12)
**And** tap dispatches `toggleComplete` action; optimistic update flips state immediately; on success `confirmMutation`; on rejection (404 / 5xx) `revertMutation` restores previous status
**And** Playwright E2E asserts the optimistic flip happens within 100 ms of tap

### Story 1.12: Delete Glyph + Delete End-to-End

As Sam,
I want to tap a × glyph to delete a todo permanently with no confirmation prompt,
So that clearing the list is single-tap-fast — recovery happens via Toast on backend rejection only.

**Acceptance Criteria:**

**Given** Story 1.11 is complete
**When** I implement the delete glyph affordance on `ListItem` + `deleteTodo` service + `todos.$id.tsx` DELETE action
**Then** delete glyph (`×`) renders right-aligned in `ListItem`, 18-px in `--color-fg-muted`, ≥44×44 hit area
**And** glyph is hidden by default on desktop (opacity 0), reveals on row hover via `--motion-duration-quick`; always visible at ≤640px breakpoint (FR / mobile)
**And** `aria-label="Delete: <description>"` so screen-reader users know what they're deleting
**And** action calls `checkOwnership(ctx, todo.owner_id)` → `deleteTodo(ctx, id)` service
**And** service treats not-found as success (idempotent — already-gone is the desired state)
**And** tap dispatches `deleteTodo` action; row removed optimistically; on success `confirmMutation`; on transient 5xx `revertMutation` restores the row at its `created_at` position
**And** **no confirmation prompt** (FR7); recovery is via Toast (Story 1.13 + 1.14)

### Story 1.13: Toast Component

As Sam,
I want a calm recovery surface when a mutation fails on the backend,
So that I see what failed, can retry, and don't lose the data I typed.

**Acceptance Criteria:**

**Given** Story 1.9 is complete
**When** I implement `Toast.tsx` + `Toast.module.css` mounted via portal at `app/root.tsx`
**Then** Toast floats at bottom-right (desktop, 280px wide) or bottom-center (mobile, full-width-minus-padding)
**And** chrome: 1-px `--color-border` frame, `--shadow-toast` (`2px 2px 0` hard offset, no blur), `--color-bg` background, square corners
**And** layout inside: bold heading row + dismiss × glyph, body line with truncated description (≤40 chars + ellipsis) in single quotes, Retry button aligned right
**And** slides in over `--motion-duration-quick` from below the viewport edge
**And** persists indefinitely until acted on (Retry / Dismiss); does **not** auto-dismiss
**And** accessibility: `role="status"`, `aria-live="polite"`, `aria-atomic="true"`; Retry button has `aria-label="Retry: <description>"`; dismiss has `aria-label="Dismiss"`; `prefers-reduced-motion: reduce` collapses slide-in to instant
**And** does not trap focus (Tab moves through toast actions, then back to underlying UI)
**And** unit test confirms ARIA + role attributes; Playwright E2E asserts slide-in + persistence

### Story 1.14: Wire Optimistic Rollback + Retry Across All Three Mutations

As Sam,
I want every failed mutation (add, toggle, delete) to revert the optimistic state and surface a Toast with payload-preserving Retry,
So that I never lose data and recovery is one tap away.

**Acceptance Criteria:**

**Given** Stories 1.10, 1.11, 1.12, 1.13 are complete
**When** I wire the optimistic store's `revertMutation` action to spawn a Toast entry, and the Toast's Retry button to re-dispatch the original mutation
**Then** every backend rejection (`{ ok: false }` envelope or transient 5xx) triggers a `revertMutation` dispatch
**And** the Toast displays the truncated description ('pick up dry cleaning' for add; the existing description for toggle/delete)
**And** **Retry preserves the original payload** (the same UUID for add — making `INSERT ... ON CONFLICT` idempotent; the same target id for toggle/delete)
**And** failure of one pending mutation never blocks dispatching another concurrently (FR29)
**And** successful retry auto-dismisses the corresponding Toast (FR30)
**And** if a Toast is dismissed without retrying, the payload is discarded (no further auto-retry)
**And** Playwright E2E `optimistic-rollback.spec.ts` covers: rollback fires within 500 ms of failure, Toast appears with correct description, Retry preserves the data
**And** Playwright E2E `concurrent-rollback.spec.ts` covers: mid-flight concurrent mutations during a rollback do not corrupt UI state (the load-bearing risky-assumption test from PRD risk mitigation)
**And** **`concurrent-rollback.spec.ts` uses Playwright `page.route()` to inject deterministic 800 ms latency on POST `/todos`; dispatches a second mutation while the first is in flight; asserts no UI corruption after both resolve. ZERO `waitForTimeout` calls anywhere in the spec.** *Mitigates OPS-3 (test flakiness on rollback timing, score 6) by enforcing deterministic-timing discipline.* (TEA amendment M-3.)

### Story 1.15: Mobile Capture-Submit Affordance

As Sam on mobile,
I want a tappable submit affordance on the right edge of the input field,
So that I can submit without relying on the soft keyboard's Enter key (which doesn't reliably submit on iOS/Android).

**Acceptance Criteria:**

**Given** Story 1.10 is complete
**When** I add the icon-button submit affordance inside `TextInput` for mobile
**Then** at `≤640px` viewport, an icon button appears on the right edge of the input field
**And** it uses Checkbox-style chrome (1-px border, square corners, ≥44×44 hit area)
**And** tapping it triggers the same submit handler as Enter
**And** at `≥1025px` viewport, the affordance is hidden (Enter on physical keyboard suffices)
**And** at `641–1024px` (tablet), affordance is hidden — assumes attached keyboard available
**And** Playwright E2E covers: mobile viewport submits via tap; desktop viewport submits via Enter

### Story 1.16: Responsive Layout & Long-List State

As Sam,
I want the app to render correctly on any device size and handle long lists smoothly,
So that the experience is consistent across phone, tablet, and desktop.

**Acceptance Criteria:**

**Given** Stories 1.1–1.15 are complete
**When** I add the responsive cascade (mobile-first base + `@media (min-width: 641px)` + `@media (min-width: 1025px)`)
**Then** at `≤640px`, the layout is edge-to-edge column with `--space-md` outer padding, `ListItem` uses `--space-sm` (8px) vertical padding
**And** at `641–1024px`, `max-width: 640px` centered column, `--space-md` outer padding
**And** at `≥1025px`, same `max-width`, `--space-xl` (40px) outer padding, `ListItem` uses `--space-md` (16px) vertical padding
**And** the input field is sticky at the top of the viewport (`position: sticky`) when the list scrolls long-list
**And** all layouts use `min-width` queries only (no `max-width` queries)
**And** Playwright projects test at three viewport widths (375px, 768px, 1280px); each renders correctly
**And** with 50+ todos, the long-list state scrolls cleanly without layout breakage or horizontal overflow

### Story 1.17: Accessibility Pass — Focus, ARIA, Live Regions, Reduced Motion

As any user — keyboard-only, screen-reader, color-blind, motion-sensitive,
I want every verb completable without barriers and every state perceivable without color alone,
So that the WCAG 2.1 AA floor is met *visibly* and the calm-by-default discipline holds for accessibility too.

**Acceptance Criteria:**

**Given** Stories 1.1–1.16 are complete
**When** I run the accessibility audit pass
**Then** Tab order: TextInput → ListItem 1's checkbox → ListItem 1's delete glyph → ListItem 2's checkbox → ... → Toast Retry / Dismiss when present → loops back to TextInput
**And** every interactive element has a visible focus indicator (inverted-block at `--color-accent` for ListItem; accent ring for primitives)
**And** every icon-only control has an `aria-label` (Checkbox from parent description, delete glyph as "Delete: <description>", Toast dismiss as "Dismiss")
**And** Toast `role="status"` + `aria-live="polite"` + `aria-atomic="true"` confirmed
**And** color-only state cues do not exist anywhere — completion = strike-through + opacity, focus = inverted-block + accent ring, error = text + button (verified via DevTools deuteranopia/protanopia simulation)
**And** `prefers-reduced-motion: reduce` collapses every transition to 0ms (Toast slide-in, ListItem fade-on-revert, hover-revealed delete glyph)
**And** axe-core scan via `@axe-core/playwright` reports **zero violations** on Default, Empty, Loading, Error, Long-list, and Toast states
**And** manual keyboard-only walkthrough completes all four verbs (add, complete, uncomplete, delete) without any mouse interaction; checklist documented at `docs/keyboard-walkthrough.md`

## Epic 2: Container & Quality Gates

The app ships as `docker compose up` from a clean checkout, passing every CI gate. Someone other than the developer can trust the deliverable.

### Story 2.1: Multi-Stage Non-Root Dockerfile

As a deployer,
I want a slim multi-stage Docker image that runs as a non-root user,
So that the runtime container has no build tooling and minimum attack surface.

**Acceptance Criteria:**

**Given** Epic 1 is complete and the app builds via `pnpm build`
**When** I author the `Dockerfile` with explicit build + runtime stages
**Then** build stage uses `node:22-alpine` (or pinned variant), runs `pnpm install --frozen-lockfile && pnpm build`
**And** runtime stage uses `node:22-alpine`, copies only `package.json`, lockfile, build output, and `node_modules` (production-only)
**And** runtime stage runs `USER node` (non-root) — verified by `docker inspect`
**And** no `latest` tags anywhere (`:22-alpine` or pinned digest); build args parameterize Node version
**And** `.dockerignore` excludes `node_modules`, `.git`, `.env*`, build outputs, IDE files
**And** `docker build .` succeeds without warnings; runtime image size <200 MB

### Story 2.2: Docker Compose Stack with Health Checks

As a deployer or trainee,
I want `docker compose up` from a clean checkout to bring up the full app + Postgres stack,
So that I can run the entire system with zero manual configuration.

**Acceptance Criteria:**

**Given** Story 2.1 is complete
**When** I author `docker-compose.yaml` with `web` and `db` services
**Then** `web` service builds from local `Dockerfile`, exposes the app port, depends on `db` with `condition: service_healthy`
**And** `db` service uses `postgres:17-alpine`; PGDATA volume; `POSTGRES_PASSWORD` from env; runs migrations on startup (or `web` runs them on boot)
**And** both services have `HEALTHCHECK` directives — `web` checks app endpoint readiness; `db` runs `pg_isready`
**And** internal Docker bridge network only — no `network_mode: host`
**And** clean checkout + `docker compose up` from project root produces a healthy stack within 30 seconds; the app is reachable at the configured port
**And** trainee dry-run target: <5 minutes from clone to healthy stack

### Story 2.3: Environment Configuration with Zod Validation

As a developer or operator,
I want missing/malformed env vars to fail fast at process start with a helpful error,
So that I never debug a misconfigured deployment by reading symptoms.

**Acceptance Criteria:**

**Given** Story 1.1 is complete
**When** I implement `app/lib/env.ts` exporting a Zod schema for required env vars
**Then** schema validates `DATABASE_URL` (URL format), `NODE_ENV` (`development | production | test`), and any other required vars
**And** validation runs in `app/entry.server.ts` (or equivalent) at process start
**And** missing var causes immediate exit with descriptive `pino` error log
**And** `.env.example` documents every required var with comments
**And** `.env` is `.gitignore`'d
**And** no secret values are hardcoded in `docker-compose.yaml` (references env-var names only)

### Story 2.4: pino Structured Logging

As an operator inspecting logs,
I want every server-side request lifecycle to produce structured JSON to stdout,
So that I can pipe logs into any self-hosted aggregation without parsing prose.

**Acceptance Criteria:**

**Given** Stories 1.5 and 2.3 are complete
**When** I implement `app/lib/logger.ts` exporting a configured pino instance
**Then** standard fields per request log: `level`, `time`, `msg`, `requestId`, `browserKey` (truncated to first 8 chars for privacy), `route`, `durationMs` (where applicable)
**And** every loader/action emits a request-start and request-end log entry
**And** ESLint rule `no-console` is enforced for files under `app/` (excluding tests) — server code uses pino, not console
**And** no third-party log aggregation SDK (Sentry, Datadog, etc.) is added
**And** integration test asserts log output structure for a sample request

### Story 2.5: Helmet-Style Security Headers

As a security-conscious operator,
I want every server response to include defense-in-depth browser security headers,
So that common browser-side attack vectors are mitigated by default.

**Acceptance Criteria:**

**Given** Story 1.1 is complete
**When** I implement security-header middleware in `app/middleware/security-headers.ts`
**Then** every response includes `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY`
**And** Content-Security-Policy is permissive for v1 (single-origin, allows inline styles for Vite hydration); documented for tightening post-v1
**And** `Strict-Transport-Security` is set when env var indicates HTTPS context (added by reverse proxy in deployment)
**And** integration test asserts headers present on every action and loader response

### Story 2.6: Private-URL Deployment Posture (Documentation + Optional Proxy)

As a deployer,
I want clear documentation of v1's private-URL / local-first posture,
So that I don't accidentally expose a no-auth durable-list app on the public internet.

**Acceptance Criteria:**

**Given** Story 2.2 is complete
**When** I add the deployment section to README + an optional `proxy` service example
**Then** README has a "Deployment" section explaining: v1 is local-first / private-URL by default; public-internet exposure is out of scope and an unacceptable risk profile per Project Principles
**And** `docker-compose.yaml` includes a commented-out `proxy` service (Caddy or nginx) example for TLS termination at deploy time
**And** README warns: "Adding the proxy service publishes the app to the network. Use a private network, VPN, or Tailscale tailnet — never `0.0.0.0`."
**And** no automatic public-internet deployment configuration is provided

### Story 2.7: GitHub Actions CI Pipeline

As any contributor,
I want every push and PR to run the full gate sequence,
So that broken builds, failing tests, or accessibility regressions never merge.

**Acceptance Criteria:**

**Given** the test infrastructure exists (Vitest + Playwright + axe)
**When** I author `.github/workflows/ci.yml`
**Then** the workflow runs on `push` to `main` + every `pull_request`
**And** jobs run sequentially: `typecheck` → `lint` → `vitest --coverage` (gate ≥70%) → `playwright test --headed=false` (≥5 specs) → `axe` accessibility scan (zero violations) → `docker build`
**And** any job failure breaks the build; merge to main requires all green
**And** workflow uses pinned action versions (no `@latest`)
**And** Playwright runs against the multi-stage Docker stack (compose up; run; compose down)
**And** coverage report is uploaded as a CI artifact
**And** **ESLint flat-config rule `no-restricted-syntax` flags any `waitForTimeout` call in `e2e/**`** — lint failure breaks the build. Enforces deterministic-timing discipline across all E2E specs. *Mitigates OPS-3.* (TEA amendment M-4.)
**And** **CI step `grep -r 'ctx.principal.browserKey' app/services/`** fails the build on any match. Enforces Gap I-1 semantic-naming discipline across all service-layer code. *Mitigates TECH-2.* (TEA amendment M-4 / m-1.)
**And** **Test fixture `e2e/fixtures.ts`** exports `forceBackendRejection`, `injectLatency`, `freshBrowserKey`, and `statisticalAssert` helpers per the TEA handoff fixture pattern. These helpers are required by Stories 1.10–1.17 for deterministic backend-rejection injection, latency injection, browser-key isolation, and N=20-sample p95 assertions. (TEA amendment M-4.)
**And** **Sequencing note (TEA amendment M-6):** the test-infrastructure components above (ESLint rules, CI grep step, `e2e/fixtures.ts` helpers) are *foundation work that may be implemented before Epic 2 begins* — specifically, before Story 1.10 dev starts. This unblocks Epic 1 stories from improvising less-disciplined test patterns. The `.github/workflows/ci.yml` workflow itself is the closing Epic 2 piece.

### Story 2.8: Achieve ≥70% Vitest Meaningful Coverage

As a trainee inspecting the test suite,
I want unit + integration tests covering at least 70% of meaningful code,
So that the test discipline matches the engineering bar load-bearing for the training identity.

**Acceptance Criteria:**

**Given** Stories 1.1–1.17 + 2.1–2.7 are complete
**When** I run `pnpm test:coverage`
**Then** Vitest coverage report shows ≥70% line coverage and ≥70% branch coverage across `app/**`
**And** "meaningful" is enforced: trivial getters, framework-generated code, and test fixtures themselves are excluded from coverage measurement
**And** coverage gate is enforced in CI (fails the build if either threshold drops below 70)
**And** uncovered code is justified in code review (e.g., genuinely dead branches) — no exemptions for laziness

### Story 2.9: Playwright E2E Suite (≥5 specs including concurrent-rollback)

As a trainee or reviewer,
I want a Playwright suite covering the golden paths *and* the riskiest assumption (concurrent rollback),
So that the load-bearing behaviors are continuously verified.

**Acceptance Criteria:**

**Given** Stories 1.1–1.17 + 2.1–2.7 are complete
**When** I implement specs under `e2e/`
**Then** the following specs exist and pass:
  - `happy-path.spec.ts` — add → see → complete → uncomplete → delete
  - `persistence.spec.ts` — page refresh / browser restart / tab close preserves the list
  - `empty-state.spec.ts` — fresh browser key (no localStorage) shows empty state, not error
  - `optimistic-rollback.spec.ts` — backend rejection triggers UI revert + Toast with payload-preserving Retry
  - `concurrent-rollback.spec.ts` — mid-flight concurrent mutations during a rollback do not corrupt UI state (the load-bearing risky-assumption test)
  - `accessibility.spec.ts` — axe scan + keyboard-only walkthrough of all four verbs
**And** specs run headless in CI; headed locally via `pnpm test:e2e:headed`
**And** each spec uses a clean database state (truncate-on-setup or per-test schema)
**And** total E2E runtime under 5 minutes (per trainee-reproducibility budget)

### Story 2.10: Performance Budget Verification

As a trainee or operator,
I want the latency budgets from PRD asserted as automated tests,
So that performance regressions break the build instead of degrading silently.

**Acceptance Criteria:**

**Given** Story 2.9 is complete
**When** I add performance assertions to Playwright specs
**Then** `optimistic-rollback.spec.ts` asserts the optimistic state appears within ≤100 ms of the user action (p95 across 20 attempts)
**And** an integration test asserts the backend confirm round-trip ≤500 ms p95
**And** a Lighthouse run (or equivalent) on first load asserts <2 s on local Docker, <500 ms warm load
**And** zero console errors on golden paths is asserted via `page.on('console')` listener in Playwright
**And** any budget failure breaks the CI build
**And** **all performance assertions are statistical, not single-shot:** N=20 samples per metric, assert p95 against budget via `statisticalAssert(samples, 95, threshold)` helper from `e2e/fixtures.ts` (Story 2.7). Single-shot timing assertions are forbidden — they're flaky on CI runners with variable load. *Prevents PERF-1 false positives and OPS-3 flakiness.* (TEA amendment M-5.)

### Story 2.11: Security Review with Documented Triage

As a security-conscious reviewer,
I want OWASP Top 10 coverage with each finding either fixed or accepted in writing,
So that no class of risk is silently ignored at v1.

**Acceptance Criteria:**

**Given** Epic 1 + Stories 2.1–2.10 complete
**When** I conduct the OWASP Top 10 review and write `docs/security-review.md`
**Then** each of A01–A10 has an explicit entry: applicable / not applicable / mitigated / accepted
**And** specifically addressed: A01 Broken Access Control (ownership-check stub + `owner_id` filtering), A03 Injection (Drizzle parameterized queries throughout), A05 Misconfiguration (Helmet headers, container hygiene), A07 Auth/Identity (browser-key threat model: identity proxy, not security boundary), A08 Software/Data Integrity (no third-party SDKs to compromise supply chain), A10 SSRF (no server-side outbound HTTP)
**And** every finding either has a linked PR/commit fixing it OR a written rationale for accepting the risk
**And** the document is signed off by the user (Pouya) before v1 declared shipped
**And** the artifact is referenced from README's table of contents

### Story 2.12: 5-Person Usability Test

As a product owner,
I want validation that ≥4/5 first-time users complete add/view/complete/delete unaided,
So that the user-facing hypothesis (calm-by-default beats incumbents for the focused individual) is empirically tested.

**Acceptance Criteria:**

**Given** the app is reachable at a private URL (Story 2.6 deployment)
**When** I run usability sessions with 5 first-time users
**Then** each participant is given the URL only — no instructions, no demo
**And** observer logs whether they unaided-complete: add a todo, see it in the list, mark it complete, delete it
**And** ≥4/5 complete all four verbs without prompting (NFR Usability target)
**And** observer also logs unprompted answers to "Would you use this as a calmer alternative to your current todo app?" — target ≥3/5 say yes (NFR Usability adoption signal)
**And** results documented at `docs/usability-test.md` including method, observations, and any flagged improvements

## Epic 3: Artifact-Set & Training Identity

The repo ships with the full BMAD training reference. Trainees can reproduce v1 in ≤1 focused workday; instructors can cite per-stage artifacts; reviewers can sign off on the artifact set.

### Story 3.1: README with Dual-Nature Explanation and Artifact Index

As a first-time reader,
I want a two-paragraph explanation of the dual-nature followed by a navigable index of every BMAD lifecycle artifact,
So that I can orient myself in the repo within five minutes.

**Acceptance Criteria:**

**Given** Epics 1 and 2 are complete (most artifacts exist)
**When** I author `README.md` at the repo root
**Then** the opening section is exactly two paragraphs explaining the dual identity (real personal todo product + canonical AINE BMAD training reference) and the tiebreaker (training clarity wins, with security/a11y/data-integrity floors)
**And** a "Quick Start" section gives the commands: `git clone`, `docker compose up`, `pnpm test:e2e`
**And** a Table of Contents links to every BMAD lifecycle artifact:
  - `_bmad-output/planning-artifacts/product-brief-ToDo-App.md`
  - `_bmad-output/planning-artifacts/prd.md`
  - `_bmad-output/planning-artifacts/architecture.md`
  - `_bmad-output/planning-artifacts/ux-design-specification.md`
  - `_bmad-output/planning-artifacts/ux-design-mockup.html`
  - `_bmad-output/planning-artifacts/epics.md`
  - `_bmad-output/test-artifacts/test-design.md` (post Step 4 of TD workflow)
  - `docs/security-review.md`
  - `docs/usability-test.md`
  - `docs/keyboard-walkthrough.md`
  - `CONVENTIONS.md`, `DECISIONS-NOT-MADE.md`, `AI-INTEGRATION-LOG.md`
**And** README is reviewed against the "trainee orientation in two paragraphs" target — verified by a non-developer reviewer

### Story 3.2: CONVENTIONS.md Pointer File

As an AI agent or trainee writing code,
I want a thin file pointing at the canonical naming/structure/format conventions,
So that I don't improvise patterns that conflict with the codebase.

**Acceptance Criteria:**

**Given** Architecture and UX specs exist
**When** I author `CONVENTIONS.md`
**Then** the file lists each enforcement rule from Architecture's Implementation Patterns section (camelCase JSON / snake_case DB; discriminated-union envelope; client-UUIDs for create; pino-not-console; co-located unit tests; token discipline; no `outline: none`; etc.)
**And** each rule links to its canonical specification in `architecture.md` or `ux-design-specification.md`
**And** the file's opening line is: *"Read this before writing code. Source of truth for all conventions in this repo."*
**And** length stays under 200 lines (it's a pointer, not the canonical doc)

### Story 3.3: DECISIONS-NOT-MADE.md (Refused Features Catalog)

As a trainee re-deriving scope under different constraints,
I want every excluded feature documented with a one-line rationale,
So that I can re-derive what would change if a constraint shifted.

**Acceptance Criteria:**

**Given** PRD + Architecture + UX specs exist (each contains refusal lists)
**When** I author `DECISIONS-NOT-MADE.md`
**Then** the document is organized by source: PRD refusals, Architecture refusals, UX refusals
**And** PRD refusals include (at minimum): user accounts, multi-user data separation, collaboration/sharing, priorities/due-dates/recurring, notifications, tags/projects/sub-tasks, cross-device sync, native mobile apps, AI features, public-internet deployment without security pass
**And** Architecture refusals include (at minimum): NextAuth/Auth.js v5, tRPC, Tailwind CSS, Storybook, Sentry/Datadog/Grafana/GA/Mixpanel, Resend/SendGrid, GraphQL/Apollo
**And** UX refusals include (at minimum): confirmation dialogs, multi-button hierarchy, success/warning/info toasts, inline form validation, required-field markers, helper text under fields, auto-dismiss on Toast, navigation chrome, search/filter, onboarding, tooltips, GDPR/cookie banners, long-press menus, modals beyond Toast
**And** each refusal has a one-line rationale; total document length 50–100 entries
**And** entries are linkable (anchor IDs) for cross-referencing from other artifacts
**And** **two-tab race condition (DATA-2)** is documented as a known v1 limitation: *"Two browser tabs sharing the same browser key produce last-write-wins behavior; v1 accepts this; a future sync module would resolve it."* (TEA amendment m-3.)

### Story 3.4: AI-INTEGRATION-LOG.md (Per-Stage Methodology Record)

As a trainee studying AI-assisted methodology,
I want one substantive entry per BMAD lifecycle stage including prompt + output + human-edit summary,
So that I can study how the human–AI partnership produced each artifact.

**Acceptance Criteria:**

**Given** all upstream BMAD lifecycle stages are complete (Brief → PRD → Architecture → UX → Epics+Stories → Test Design → Build → QA → Containerization)
**When** I author `AI-INTEGRATION-LOG.md`
**Then** the document has one section per BMAD lifecycle stage
**And** each section contains:
  - **Stage name + date completed**
  - **Prompts used** (the meaningful invocations driving the stage; not every micro-prompt)
  - **Representative output excerpts** (key artifact passages where the AI's contribution was load-bearing)
  - **Human-edit summary** — what the AI got right, what was changed and why, and what's worth replicating in future training modules
**And** entries are publishable — no embarrassing prompts, no leaking confidential context, no internal jargon trainees couldn't parse
**And** the log is referenced from README (Story 3.1) and CONVENTIONS.md
**And** `AI-INTEGRATION-LOG.md` is treated as a first-class deliverable per FR47, not internal busywork

### Story 3.5: Trainee Dry-Run Verification

As a product owner declaring v1 shipped,
I want a real trainee (not the original developer) to follow the artifact set and reach a green build + passing E2E within ≤1 focused workday,
So that the training-identity hypothesis is empirically validated.

**Acceptance Criteria:**

**Given** all of Epic 1, Epic 2, and Stories 3.1–3.4 are complete
**When** I have a trainee (someone who hasn't seen the code) clone the repo and follow the artifact set
**Then** the trainee reaches a healthy `docker compose up` stack within their first hour
**And** the trainee runs `pnpm test:e2e` and gets all specs passing within their first 4 hours
**And** the total time from clone to "I understand what every BMAD lifecycle stage produced and why" is ≤1 focused workday (8 hours)
**And** the trainee receives no instructor intervention — only the artifact set
**And** the experience documented at `docs/trainee-dry-run.md` including the path taken, time per stage, and any friction points encountered (which become future improvement candidates)
**And** v1 is **not declared shipped** until this story passes; if the trainee gets stuck, fix the artifact set before declaring done
