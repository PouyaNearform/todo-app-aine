---
stepsCompleted:
  - step-01-init
  - step-02-context
  - step-03-starter
  - step-04-decisions
  - step-05-patterns
  - step-06-structure
  - step-07-validation
  - step-08-complete
status: 'complete'
completedAt: '2026-04-29'
lastStep: 8
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/product-brief-ToDo-App.md
  - _bmad-output/planning-artifacts/product-brief-ToDo-App-distillate.md
  - docs/prd-source.md
documentCounts:
  prd: 1
  uxDesign: 0
  research: 0
  projectDocs: 1
  projectContext: 0
workflowType: 'architecture'
project_name: 'ToDo App'
user_name: 'Pouya'
date: '2026-04-29'
---

# Architecture Decision Document

_This document builds collaboratively through step-by-step discovery. Sections are appended as we work through each architectural decision together._

## Project Context Analysis

### Requirements Overview

**Functional Requirements — 48 FRs across 8 capability areas.** The capability surface is deliberately small. Architecturally relevant subsets:

- **Mutation surface (FR1–FR9):** four verbs — add (1–256 char, single-action submit, hard cap, no empty), complete/uncomplete toggle, delete (instant, no confirmation). Server assigns immutable `created_at`. Each verb is a single round-trip with optimistic application client-side and authoritative confirmation server-side.
- **Display surface (FR10–FR18):** single-screen SPA, no login/onboarding interposition, four designed states (empty / loading / error / long-list), `created_at` descending sort, no filter to hide completed, color-not-the-only-distinction for completion.
- **Persistence & identity (FR19–FR24):** per-browser per-deployment via opaque local key (cookie or localStorage); browser key on every request; nullable `owner_id` populated with the browser key; unknown key → empty list (not error); never sync across browsers; durable across application restart, container restart, and transient DB blips.
- **Optimistic UI & error recovery (FR25–FR30):** every mutation applied client-side *before* backend confirmation; backend rejection rolls back UI **and** surfaces a non-blocking toast with **Retry** preserving the original *payload* (data, not just action); concurrent mutations during a rollback must not corrupt UI state; successful retry auto-dismisses.
- **Accessibility & input (FR31–FR36):** keyboard-only completes every verb; visible focus on every interactive element; ARIA labels on icon-only controls; live-region announcements for transient errors (`polite`); responsive across breakpoints; touch-target floor (44 × 44).
- **Architectural seams (FR37–FR40):** four explicit seams *paid for by training identity* — request-context object carrying the principal (browser key in v1, real authenticated user later); ownership-check stub (no-op v1, pluggable); thin service layer between transport and persistence; nullable `owner_id` on the entity.
- **Containerization & deployment (FR41–FR44):** multi-stage non-root Docker Compose; per-container health checks; one-command bootstrap from a clean checkout; private-URL local-first deployment posture.
- **Artifact-set capabilities (FR45–FR48):** README + per-stage artifacts + "Decisions Not Made" + AI Integration Log — these are *repository-shape* requirements, not runtime-system requirements, but they constrain the build, the CI surface, and the trainee-reproducibility target.

**Non-Functional Requirements — 8 categories, all load-bearing for architecture:**

- **Performance budgets** — <100 ms p95 optimistic round-trip; <500 ms p95 backend confirm; <2 s first load; <500 ms warm load; zero console errors on golden paths. *Budgets, not aspirations.* Constrain stack weight, bundle size, and how much logic sits client-side.
- **Reliability & data integrity** — persistence durability across listed failure modes; optimistic-rollback correctness under concurrent mutation; idempotent retry; no silent failures. *Drives client-side state-management approach and API idempotency contract.*
- **Security & privacy** — local-first / private-URL only; no public-internet deployment in v1; OWASP Top 10 floor with documented triage; container hygiene (non-root, no `latest`, no host network); no third-party telemetry/analytics SDK; no data leaves the deployment boundary. *Drives container build, dependency vetting, and the deliberate absence of common SaaS conveniences (Sentry, GA, Mixpanel).*
- **Accessibility** — WCAG 2.1 AA with automated axe scan + manual keyboard walkthrough on every release. *Drives component-library selection or rejection, focus-management strategy, color-contrast tokens.*
- **Scale & capacity** — ~100 items per list, ~100 keys per deployment. Single-user, single-list. *Frees us from horizontal scaling, sharding, queues, multi-tenancy — none apply at v1.*
- **Quality & maintainability** — ≥70% meaningful coverage (Vitest/Jest); ≥5 Playwright E2E including ≥1 optimistic-rollback under concurrent input; build reproducibility; AI Integration Log per stage; trainee reproducibility ≤1 focused workday. *Drives test-framework choice and CI shape; constrains us toward boring tech a trainee can pick up quickly.*
- **Compatibility** — last-2-majors of evergreen browsers; `localStorage` + `fetch` required. *Frees us to use modern web APIs without legacy polyfills.*
- **Usability** — calm-by-default with verifiable absences (no streaks, badges, percentages, celebratory animations). *Architectural implication: no notification API integration, no service-worker push, no analytics pings.*

### Scale & Complexity

- **Domain complexity:** **low.** Three-field entity, four verbs, one user, one list per browser. No multi-tenancy, no real-time sync, no integrations.
- **Engineering bar:** **high.** Coverage, accessibility, security review, container hygiene, separate publishable AI Integration Log, trainee reproducibility — all load-bearing for training identity.
- **Architectural complexity:** **moderate**, not low. The asymmetry of *low domain × high quality bar × four explicit seams paid for by training identity* is unusual. Excludes "throw together an Express+SQLite app" levels of casualness; also excludes "design for future scale" levels of premature complexity. Boring-tech-with-discipline territory.
- **Primary domain:** full-stack web — SPA frontend + small CRUD backend with a real database, all containerized.
- **Estimated architectural components:** small. Frontend bundle (1), backend service (1), database (1), optionally a static-asset server / reverse proxy (0–1). **3–4 deployable units** in Docker Compose.

### Technical Constraints & Dependencies

- **Stack choice is deliberately open.** Framework, language, and database are decisions for this workflow. Optimization target: *trainee picks it up in an afternoon*, not *cutting-edge showcase*.
- **The four seams must hold whatever stack is chosen** — highest-leverage constraint. First architecture-stage validation: sketch the *first successor module (auth)* end-to-end against the seams *as written for v1*. If any seam needs to bend to absorb auth, fix it in v1 before locking architecture (per PRD risk mitigation).
- **Containerization is a hard requirement.** Multi-stage build, non-root, health checks, no `latest` tags, no host network. Dev experience target: `docker compose up` from clean checkout → healthy stack, zero manual config.
- **No third-party telemetry / analytics / error-tracking SDKs in v1.** Drives away from common "free" observability tooling (Sentry, Datadog, GA, Mixpanel). If we want observability, it must be locally hosted.
- **Latency budgets are tight but not extreme** (100 ms p95 optimistic, 500 ms p95 confirm on local Docker). Constrains us toward client-side optimistic state and away from heavy server-rendered mutation flows.
- **Bundle weight matters.** First load <2 s on broadband. Constrains framework choice toward modern but not bloated runtimes.

### Cross-Cutting Concerns

These touch multiple components and need a coherent architectural answer, not per-component improvisation:

- **Browser-key lifecycle.** Issued on first interaction; persisted client-side; sent on every request; populated into the request-context object server-side; used as the v1 `owner_id`. Touches: client persistence layer, HTTP client, server middleware, service layer, schema.
- **Optimistic-UI rollback contract.** Client applies mutation immediately; server confirms or rejects; on rejection client reverts AND posts a toast preserving the *payload*. Mid-flight concurrent mutations during rollback must not corrupt state. Touches: client state-management library, action-dispatch model, API error shape and idempotency contract, UI toast surface, accessibility live region.
- **Designed UI states.** Empty / loading / error / long-list each have explicit specs (FR13–FR16). Touches every screen render path; the loading state in particular interacts with the <2 s first-load budget.
- **Accessibility integration.** Focus order, live regions, contrast, touch targets, ARIA. Touches every interactive control; the toast surface in particular must not break AA verification gates.
- **CI shape.** Coverage gate + Playwright gate + axe gate + container-build gate, all on every push. Touches build pipeline, artifact set, trainee-reproducibility target.
- **AI Integration Log discipline.** Every BMAD stage produces ≥1 substantive entry. *Architectural decisions count as a stage — this very document needs an AI Integration Log entry.*
- **"Decisions Not Made" artifact.** Already canonical from the PRD; architecture decisions that refuse a tempting pattern (e.g., no Redux, no SSR, no microservices) extend the same artifact.
- **Calm-by-default verification.** Architectural choices must support QA-time inspection that confirms the *absence* of synthetic-urgency mechanics. Drives away from frameworks/libraries that ship "engagement" features by default.

## Starter Template Evaluation

### Primary Technology Domain

Full-stack web application — single-page React UI + small server-side data layer (loaders for reads, actions for mutations) + PostgreSQL in a separate container. Multi-stage Docker Compose ties them together.

### Starter Options Considered

Five candidates evaluated against three filters: (1) does it ship auth (we don't want that in v1); (2) does it ship third-party SDKs (Sentry/GA/etc., explicitly forbidden by Security & Privacy NFR); (3) does its idiom match our seam discipline (request-context, ownership-check, service-layer, `owner_id`)?

| Starter | Auth shipped? | 3rd-party SDKs shipped? | Fit for seams? | Verdict |
|---|---|---|---|---|
| **T3 Stack** (`create-t3-app`) | NextAuth/Auth.js v5 | None inherent, but tRPC adds an RPC layer | tRPC procedures complicate the "thin service layer" seam story | **Reject** — auth + tRPC overhead |
| **Epic Stack** (Kent C. Dodds) | Yes (custom auth) | Sentry, Resend, Fly.io, Grafana | Strong otherwise — but ships exactly the SDKs we forbid | **Reject** — third-party SDKs violate NFR |
| **Next.js bare** (`create-next-app`) | No | No | App Router RSC patterns add SSR complexity that buries the request-context seam for trainees | Possible but adds unhelpful complexity |
| **React Router v7 Framework Mode** (`create-react-router`) | No | No | Loader/action pattern maps cleanly to optimistic-rollback contract; service-layer seam fits naturally | **STRONG FIT** |
| **SvelteKit** (`sv create`) | No | No | Server routes match seam story; smaller bundle | Strong fit; smaller community |

### Selected Starter: React Router v7 (Framework Mode)

**Rationale.** Ships *framework choices* (file-based routing, loader/action pattern, TypeScript, Vite-based build) but leaves *architectural choices* (DB, auth, observability) to us. That's the right shape for ToDo App — starter convenience without burying decisions a trainee needs to see derived. Separately, the loader/action pattern is an excellent built-in teaching example for the optimistic-rollback contract: **actions return ok/error JSON; the client decides whether to keep or revert the optimistic update**.

React over Svelte: more trainee familiarity at the cost of larger bundle. The bundle cost is acceptable at v1's scope (single screen, well under the <2 s first-load budget on broadband).

**Initialization Command:**

```bash
npx create-react-router@latest todo-app
```

This runs the interactive prompt and scaffolds the **default** template (Node-based server, Vite + TypeScript, file-based routes).

### What the Starter Provides

- **TypeScript** by default; `tsconfig.json` configured for the framework.
- **Vite** dev server with HMR; production build via `react-router build`.
- **File-based routes** under `app/routes/`. Each route can export `loader` (read), `action` (mutate), `default` (UI), `meta` (head metadata).
- **Built-in `Form` component** for progressive-enhancement-friendly mutations — pairs well with the WCAG AA floor.
- **Standard scripts**: `npm run dev`, `npm run build`, `npm run start`.
- **Code organization**: `app/` source, `app/routes/` route modules, `public/` static assets, `react-router.config.ts`, `vite.config.ts`.

### What We Will Add (Subsequent Decisions)

Listed here so the trainee can see which decisions the starter made and which it deferred:

- **Database & ORM** — PostgreSQL in its own container; ORM choice (Drizzle / Kysely) at the next step.
- **The four seams** — request-context middleware, ownership-check stub, service layer (utility modules called from loaders/actions), nullable `owner_id` on the entity.
- **Test frameworks** — Vitest (unit + integration) + Playwright (E2E ≥5 incl. optimistic-rollback under concurrent input).
- **Container orchestration** — multi-stage non-root `Dockerfile`, `docker-compose.yaml` with frontend/backend/Postgres + per-container health checks.
- **Linting / formatting** — TypeScript strict mode, ESLint config, Prettier.
- **Browser-key client utility** — opaque local key issued via `crypto.randomUUID()`, persisted in `localStorage` (or a cookie), sent on every request via a small `fetch` wrapper.
- **Optimistic-UI store** — small client-side state primitive handling the "apply → await → confirm-or-revert + toast" contract. Hand-rolled (recommended for trainee readability) over a library at this scope.
- **Toast surface** — accessible live region (`polite`); hand-rolled in ~30 LOC.

### What We Explicitly Refuse (extends "Decisions Not Made")

Each entry belongs in the **"Decisions Not Made"** artifact alongside the PRD's refusals:

- **NextAuth / Auth.js** — auth deferred; request-context + ownership-check seams cover the future need without shipping it now.
- **tRPC** — Remix loaders/actions already provide a typed RPC surface; adding tRPC is duplication.
- **Tailwind CSS** — defer to UX design step; not load-bearing for v1 architecture.
- **Storybook** — not load-bearing for v1; the artifact set is the documentation surface.
- **Sentry / Datadog / Grafana / GA / Mixpanel** — all third-party telemetry forbidden by NFR Security & Privacy.
- **Resend / SendGrid / SMTP** — no email path in v1; deferred indefinitely.
- **GraphQL / Apollo** — REST + loader/action is sufficient; GraphQL adds layers without a justifying need.

**Note:** Project initialization using `npx create-react-router@latest todo-app` should be the first implementation story.

## Core Architectural Decisions

### Decision Priority Analysis

**Critical (block implementation):** database engine, ORM/data layer, validation library, optimistic-UI store shape, browser-key issuance + transport.

**Important (shape architecture):** HTTP error envelope + idempotency contract, logging shape, CSS approach, migration tooling.

**Deferred (post-MVP, with rationale):** auth provider (deferred per PRD; seams ready), cache layer (unneeded at v1's scale), CDN/static-asset host (private-URL doesn't need it), multi-region topology (single-deployment scope), rate limiting (private-URL, single user — irrelevant).

### Data Architecture

- **Database: PostgreSQL 17** in its own container. Mid-lifecycle stability (supported through 2029); exercises the multi-container Compose stack. Postgres 18 (Feb 2026) is acceptable; pick at story-init time. **Rejected:** SQLite (collapses the multi-container Compose story), MySQL (no upside), MongoDB (we have a structured entity with constraints).
- **ORM: Drizzle ORM.** Schema-in-TypeScript, type-safe queries that read like SQL, built-in migration tooling. Crossed Prisma in 2025 downloads. *SQL-first design is good for trainee transparency.* **Rejected:** Kysely (no migration tool), Prisma (heavier client + binary engine), raw `pg` (no type safety).
- **Migration tooling:** **`drizzle-kit`** — migrations as plain SQL files in `db/migrations/`, trainee-readable directly.
- **Validation: Zod.** De-facto TS standard for runtime+compile-time schemas. Server-side at every action boundary; client-side to keep optimistic payloads honest. `drizzle-zod` shares schema across DB and validation, eliminating drift. **Rejected:** Yup, Joi, Valibot.
- **Caching: none in v1.** ~100 keys × ~100 items doesn't need it; adding a cache layer creates correctness traps for the optimistic-rollback contract.

### Authentication & Security

- **Authentication: none in v1.** The opaque browser key is an *identity proxy*, not a security boundary. The request-context seam carries the principal — replaceable with a real authenticated user later, no downstream code changes.
- **Browser-key issuance:** **`crypto.randomUUID()`** on first interaction, persisted to **`localStorage`**. Web Platform standard, 128-bit unguessability sufficient for an identity proxy.
- **Browser-key transport:** custom request header **`X-Browser-Key: <uuid>`** sent by a thin `fetch` wrapper that all client→server calls go through. **Rejected:** cookie transport (forces SameSite/HttpOnly considerations that don't help when client JS reads the key anyway), URL/query-param transport (logging + caching risks).
- **Security middleware:** Helmet-style response headers (`X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY`); permissive CSP for v1 (single-origin, no third-party scripts); CSRF risk mitigated by the same-origin policy + the requirement of the custom `X-Browser-Key` header (which a cross-origin form post would not send); same-origin only (no CORS); TLS via reverse proxy at deploy time, not in v1's `docker-compose.yaml`.
- **Container hygiene:** non-root, multi-stage, no `latest` tags, no host network. (PRD-locked.)
- **Security review:** OWASP Top 10 coverage; findings triaged or accepted in writing. (PRD-locked.)

### API & Communication Patterns

- **API style:** **Remix loaders & actions** (JSON over HTTP). No separate backend service; each route's `loader` reads, `action` mutates. **Rejected:** GraphQL (no justifying need), tRPC (duplicates loader/action), separate Express/Fastify service (over-architected at this scope).
- **Error envelope:** discriminated union — `{ ok: false, error: { code: string, message: string, fieldErrors?: Record<string, string[]> } }` on failure; `{ ok: true, data: ... }` on success. The client's optimistic store branches on `ok`; TypeScript narrows naturally.
- **Idempotency contract:** every mutation is idempotent by design.
  - `POST /todos`: **client generates the new todo's UUID `id`** and sends it in the payload; server's insert is `INSERT ... ON CONFLICT (id) DO NOTHING`. Retry of the same payload re-issues the same `id`, produces no duplicate.
  - `PATCH /todos/:id` toggle: naturally idempotent (setting state to itself is a no-op).
  - `DELETE /todos/:id`: naturally idempotent (deleting a deleted todo returns 200).
  - **Why this matters:** the optimistic-rollback retry path *requires* this; without it, retries on flaky networks risk duplicate creates or double-toggles.
- **Validation:** server-side at every action boundary via Zod; client-side via the same schemas before issuing the optimistic update.
- **Rate limiting: none in v1.** Single user, private URL, no cost-driving ops.
- **API documentation: route handlers serve as the spec.** Typed loader/action signatures; `react-router typegen` generates client types. No OpenAPI doc in v1 (no external clients).

### Frontend Architecture

- **State management: hand-rolled optimistic store** on React's built-in primitives (~100–200 LOC; `useReducer` + Context, possibly `useSyncExternalStore`). **Rationale:** the optimistic-rollback contract is the load-bearing client behavior — hand-rolling makes it *trainee-readable*. **Rejected:** Redux Toolkit (overkill), Zustand (no clear win at this scope), TanStack Query (mismatched — designed for server-state caching, not optimistic *replacement*).
- **Component architecture:** functional components + hooks; presentational components in `app/components/`; route components own list state (loader-fed) and dispatch via the optimistic store.
- **Styling: vanilla CSS with CSS Modules** (`*.module.css`). Color-contrast tokens in `app/styles/tokens.css` support the WCAG AA contrast floor. **Rejected:** Tailwind (large vocabulary trainee must learn, defers concerns), styled-components/emotion (runtime cost, lock-in).
- **Bundle:** Vite defaults; no manual code-splitting at v1's scope; no service worker (offline is an explicit non-goal).
- **Browser-key utility:** `app/lib/browser-key.ts` exports `getBrowserKey(): string` + a `fetch` wrapper that injects `X-Browser-Key`. Single point of truth for the client side of the seam.

### Infrastructure & Deployment

- **Container runtime: Node 22 LTS** on slim Alpine base. Multi-stage build; runtime stage runs as `USER node`. Node 24 LTS also acceptable (longer tail, less battle-tested).
- **`docker-compose.yaml`:** three services — **`web`** (Node + Remix bundle), **`db`** (Postgres 17), optional **`proxy`** (Caddy/nginx for TLS termination if the deployer chooses). Each with health checks; shared internal Docker network; no host-network mode.
- **CI/CD: GitHub Actions** (most trainee-recognizable). Gate sequence: typecheck → lint → Vitest (≥70% meaningful coverage) → Playwright headless (≥5 incl. concurrent-rollback) → axe accessibility scan → Docker build. All must pass for merge. Provider is replaceable; *the gate shape* is what's load-bearing for training.
- **Environment configuration:** `.env` files (gitignored), validated by Zod at process start; missing vars fail fast with a helpful error. `docker-compose.yaml` references env names, never hardcodes secrets.
- **Logging: structured JSON to stdout** via **`pino`**. Production deployers pipe stdout to whatever they self-host. **No third-party log aggregation** (NFR).
- **Monitoring: none in v1**, beyond container health checks. (NFR forbids third-party monitoring SDKs.)

### Decision Impact Analysis

**Implementation sequence (story ordering, suggestive):**

1. Project init via `npx create-react-router@latest todo-app`.
2. Add Postgres 17 + Drizzle + initial migration (todo entity with nullable `owner_id`).
3. Wire **request-context middleware** + **ownership-check stub** (no-op pass-through).
4. Implement first verb (list-read) end-to-end through the seams.
5. Implement remaining verbs (add/toggle/delete) one at a time.
6. Implement **optimistic store** + rollback + retry toast.
7. Wire **designed states** (empty/loading/error/long-list).
8. Accessibility pass — focus, ARIA, live regions, contrast, keyboard.
9. Multi-stage Dockerfile + `docker-compose.yaml` + health checks.
10. Test discipline closure: ≥70% Vitest meaningful coverage; ≥5 Playwright E2E incl. concurrent-rollback.
11. Security review + Decisions Not Made + AI Integration Log entries.

**Cross-component dependencies:**

- **Browser-key utility ↔ request-context middleware ↔ ownership-check stub ↔ `owner_id` field.** These four form *the seam* — review them as a unit; touching one without the others breaks the contract.
- **Optimistic store ↔ error envelope ↔ idempotency contract.** Client decides rollback on `ok: false`; idempotency makes Retry safe; envelope shape is the wire contract. Lock them at the same time.
- **CI gate set ↔ trainee-reproducibility target.** A slow gate (e.g., 10-minute Playwright) jeopardizes the ≤1 workday target. Keep gates fast; parallelize.

## Implementation Patterns & Consistency Rules

### Naming Patterns

**Database (Postgres + Drizzle):**

| Element | Convention | Example |
|---|---|---|
| Table names | lowercase plural snake_case | `todos` |
| Column names | lowercase snake_case | `description`, `completion_status`, `created_at`, `owner_id` |
| Primary keys | `id` (UUID v4 from client) | `id uuid primary key` |
| Foreign keys | `<entity>_id` | `owner_id` |
| Indexes | `idx_<table>_<columns>` | `idx_todos_owner_id_created_at` |
| Migration files | `<NNNN>_<short_slug>.sql` | `0001_init.sql`, `0002_add_owner_id.sql` |

**API (HTTP + JSON):**

| Element | Convention | Example |
|---|---|---|
| REST endpoints | plural nouns | `GET /todos`, `POST /todos`, `PATCH /todos/:id`, `DELETE /todos/:id` |
| Route params | `:param` (Remix convention) | `/todos/:id` |
| JSON keys | **camelCase** (TS-natural) | `completionStatus`, `createdAt`, `ownerId` |
| Custom request headers | `X-Foo-Bar` (PascalCase + `X-` prefix) | `X-Browser-Key` |
| Date format on the wire | ISO 8601 strings | `"2026-04-29T15:39:38.928Z"` |
| ID format | UUID v4 with dashes | `"550e8400-e29b-41d4-a716-446655440000"` |

**Note on the snake_case ↔ camelCase boundary:** the database stores snake_case (Postgres convention); the API serves camelCase (TypeScript convention). Drizzle handles the mapping via column-name aliases declared once in the schema. The transformation lives at one boundary, not scattered across handlers.

**TypeScript code:**

| Element | Convention | Example |
|---|---|---|
| File names — modules/utilities | kebab-case | `browser-key.ts`, `optimistic-store.ts` |
| File names — React components | PascalCase | `TodoItem.tsx`, `Toast.tsx` |
| File names — route modules | per RR7 conventions | `_index.tsx`, `todos.$id.tsx` |
| Variables / functions | camelCase | `getBrowserKey`, `currentTodos` |
| Constants | SCREAMING_SNAKE_CASE | `MAX_DESCRIPTION_LENGTH` |
| Type / interface names | PascalCase | `Todo`, `TodoActionResult` |
| Type aliases for unions | PascalCase | `MutationStatus = 'pending' \| 'confirmed' \| 'failed'` |
| Test files (unit/integration) | `*.test.ts(x)` colocated next to source | `optimistic-store.test.ts` |
| Test files (E2E) | `*.spec.ts` under `e2e/` | `e2e/happy-path.spec.ts` |

### Structure Patterns

```
todo-app/
├── app/                          # RR7 app source
│   ├── routes/                   # File-based routes (loader/action/UI)
│   │   ├── _index.tsx            # The single screen
│   │   └── todos.$id.tsx         # Per-item mutation routes (PATCH/DELETE)
│   ├── components/               # Presentational components, flat (small scale)
│   │   ├── TodoItem.tsx
│   │   ├── TodoInput.tsx
│   │   └── Toast.tsx
│   ├── services/                 # The thin service layer (FR39)
│   │   └── todos.ts              # listTodos / createTodo / toggleComplete / deleteTodo
│   ├── middleware/               # Server-side request pipeline
│   │   ├── request-context.ts    # Extracts browser key, builds context (FR37)
│   │   └── ownership-check.ts    # No-op stub in v1, pluggable (FR38)
│   ├── lib/                      # Client + shared utilities
│   │   ├── browser-key.ts        # Issuance + fetch wrapper
│   │   ├── optimistic-store.ts   # Reducer + Context + dispatch helpers
│   │   └── validation.ts         # Zod schemas shared client/server
│   ├── styles/
│   │   ├── tokens.css            # Color/spacing/contrast tokens
│   │   └── *.module.css          # CSS Modules per component
│   └── root.tsx                  # App shell
├── db/
│   ├── schema.ts                 # Drizzle schema (todos table, owner_id seam)
│   ├── migrations/               # Sequential SQL files
│   └── client.ts                 # Pool + Drizzle connection
├── e2e/                          # Playwright specs
│   └── *.spec.ts
├── public/                       # Static assets
├── docker-compose.yaml
├── Dockerfile                    # Multi-stage, non-root
├── react-router.config.ts
├── vite.config.ts
├── drizzle.config.ts
├── playwright.config.ts
├── vitest.config.ts
├── .env.example                  # Documents required env vars
├── CONVENTIONS.md                # Pointer to this section + lint rules
└── README.md                     # Dual-nature explanation, artifact orientation
```

**Rules:**

- **Tests colocated with source** for unit/integration; **E2E in `e2e/`** for separate orchestration.
- **Components flat in `app/components/`** at v1's scale (~5 components total). Move to feature folders only if we exceed ~10 components.
- **Service layer files exactly mirror the entity name** — `todos.ts` exports `listTodos`, `createTodo`, etc.
- **Middleware files exactly mirror their concern** — one file per seam.
- **Path aliases** in `tsconfig.json`: `~/components/*`, `~/services/*`, `~/middleware/*`, `~/lib/*`. No deep relative imports (`../../../`).

### Format Patterns

- **API success/error envelope:** discriminated union (canonical in *Core Architectural Decisions → API & Communication*).
  - Success: `{ ok: true, data: T }`
  - Failure: `{ ok: false, error: { code: ErrorCode, message: string, fieldErrors?: Record<string, string[]> } }`
  - `ErrorCode` is a string-literal union: `'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'INTERNAL'`.
- **HTTP status codes:**
  - `200` — read or update success.
  - `201` — create success (returns the created entity).
  - `400` — validation failure (`code: 'VALIDATION'`).
  - `404` — entity not found (`code: 'NOT_FOUND'`).
  - `409` — idempotent-conflict that surfaces (rare; e.g., delete-on-deleted returns 200, not 409).
  - `500` — unhandled (`code: 'INTERNAL'`); the full stack is logged server-side, never returned in the body.
- **Booleans:** `true` / `false` — never `1`/`0`, never `"true"`/`"false"`.
- **Null vs undefined:**
  - **At API boundaries:** use `null` for "explicitly absent." Never serialize `undefined`.
  - **In TS code:** use `undefined` for "not provided." Avoid mixing `null` and `undefined` in the same field.
- **Empty arrays:** return `[]`, never `null`.
- **Field omission:** never. If a field is conceptually absent, return `null`. (Predictable shapes for trainee parsing.)

### Communication Patterns

**No event bus in v1.** Communication is direct: client dispatches via the optimistic store; the store calls the `fetch` wrapper; the server runs the action; the action returns the envelope; the client either confirms or reverts. Props down, callbacks up — no global event emitter.

**State management (client):**

- **Immutable reducer pattern** via `useReducer`.
- **Action shape:** `{ type: ActionType, payload: ... }` with `ActionType` a string-literal union.
- **Action naming:** imperative verb, present tense — `'addTodo'`, `'toggleComplete'`, `'deleteTodo'`, `'confirmMutation'`, `'revertMutation'`.
- **Store layout:**
  ```ts
  type State = {
    todos: Todo[];
    pendingMutations: Record<MutationId, PendingMutation>;
  };
  type PendingMutation =
    | { kind: 'add'; tempTodo: Todo }
    | { kind: 'toggle'; id: string; previousStatus: boolean }
    | { kind: 'delete'; previousTodo: Todo };
  ```
  Each pending mutation carries enough info to revert without re-fetching. Conceptual; final shape lives in `app/lib/optimistic-store.ts`.

### Process Patterns

**Error handling — three layers, one envelope.**

| Layer | Cause | Server response | Client response |
|---|---|---|---|
| Validation | Zod parse fails at the action boundary | `400 { ok: false, error: { code: 'VALIDATION', fieldErrors } }` | Roll back; toast with field-level message |
| Domain | Service-layer typed error (`NotFoundError`, `ConflictError`) | `404 / 409 { ok: false, error: { code, message } }` | Roll back; generic toast with retry |
| Unhandled | Anything else (DB down, transient bug) | `500 { ok: false, error: { code: 'INTERNAL', message: 'Something went wrong' } }` | Roll back; generic toast with retry; full stack logged server-side via pino |

**Optimistic-mutation lifecycle (client):**

```
dispatch(addTodo) → state has tempTodo + pendingMutations[id] = pending
   ↓
fetch returns ok:true → dispatch(confirmMutation, id) → tempTodo replaced with server's authoritative todo; pending cleared
   ↓ (or)
fetch returns ok:false → dispatch(revertMutation, id) → tempTodo removed; toast surfaces with retry
```

**Loading states (initial fetch):** Remix's built-in navigation state via `useNavigation()`. No global loading store; the route owns its loading UI.

**Logging — `pino` structured JSON to stdout.**

- **Levels used:** `debug` (verbose dev), `info` (normal request lifecycle), `warn` (recoverable issues), `error` (unhandled exceptions).
- **Standard fields per request log:** `level`, `time`, `msg`, `requestId`, `browserKey` (truncated to first 8 chars), `route`, `durationMs` (where applicable).
- **Privacy hygiene:** browser keys are truncated in logs even though they aren't PII per se — establishes the discipline for when real user identifiers replace them.
- **No request body logging by default.** Add per-route opt-in if a debugging session needs it.

### Enforcement Guidelines

**All AI agents (and trainees) MUST:**

- Read `CONVENTIONS.md` before writing code in this repo. `CONVENTIONS.md` is a thin file pointing back to this Implementation Patterns section.
- Use **camelCase in API JSON** and **snake_case in DB**. Drizzle handles the mapping; do not hand-rewrite the boundary.
- Return the **discriminated-union envelope** from every action; never raw `data` or raw `error`.
- Use **client-generated UUIDs** for new todos to preserve idempotency.
- Log via **`pino`** with the standard fields above; never `console.log` in server code.
- Co-locate unit tests next to source; put E2E specs in `e2e/`.
- **Never** introduce a new convention without updating `CONVENTIONS.md` *in the same PR*.

**Pattern enforcement (automated where possible):**

- **TypeScript strict mode** — catches most structural issues at compile time.
- **ESLint config** — enforces import paths, no relative `../../../`, naming-convention plugin for variables/types, `no-console` for server code.
- **Prettier** — formatting baseline; no debate on style.
- **CI gate** — typecheck + lint must pass before tests run; failing convention is a build break, not a code-review nit.

**Pattern violations (when they happen):**

- Document in the PR description: *what convention was violated, why, and whether the convention should change.*
- If the convention should change, update `CONVENTIONS.md` and this Architecture document in the same PR.
- If the violation is a one-off, the PR is rejected. (Boring tech with discipline.)

### Pattern Examples — Good and Anti

**Good — discriminated union in an action:**

```ts
// app/routes/todos.$id.tsx
export async function action({ request, params, context }: ActionFunctionArgs) {
  const result = TodoUpdateSchema.safeParse(await request.json());
  if (!result.success) {
    return Response.json(
      { ok: false, error: { code: 'VALIDATION', message: 'Invalid input', fieldErrors: result.error.flatten().fieldErrors } },
      { status: 400 }
    );
  }
  const updated = await todoService.toggleComplete(context.requestContext, params.id, result.data.completed);
  return Response.json({ ok: true, data: updated }, { status: 200 });
}
```

**Anti — raw response (rejected in code review):**

```ts
// ❌ no envelope, mixed shapes, no idempotency contract
export async function action({ request, params }: ActionFunctionArgs) {
  const body = await request.json();
  const updated = await db.update(todos).set({ completion_status: body.completed }).where(eq(todos.id, params.id));
  return Response.json(updated);
}
```

**Good — client-generated UUID for create:**

```ts
// app/lib/optimistic-store.ts
function addTodo(description: string) {
  const tempTodo: Todo = {
    id: crypto.randomUUID(),  // client-generated; preserves idempotency
    description,
    completionStatus: false,
    createdAt: new Date().toISOString(),
  };
  dispatch({ type: 'addTodo', payload: tempTodo });
  fetchWrapper.post('/todos', tempTodo).then(handleEnvelope(tempTodo.id));
}
```

**Anti — server-generated ID (rejected: breaks idempotency for retries):**

```ts
// ❌ if the network fails after the server creates the todo,
// the retry creates a second todo with a different id.
function addTodo(description: string) {
  fetchWrapper.post('/todos', { description }).then(/* ... */);
}
```

## Project Structure & Boundaries

### Complete Project Directory Structure

```
todo-app/
├── README.md                          # Dual-nature explanation, artifact orientation (FR48)
├── CONVENTIONS.md                     # Pointer to Implementation Patterns
├── DECISIONS-NOT-MADE.md              # First-class refused-features artifact (FR46)
├── AI-INTEGRATION-LOG.md              # Per-stage prompt/output/edit-summary log (FR47)
├── package.json
├── pnpm-lock.yaml                     # (or package-lock.json — pick at init)
├── tsconfig.json                      # Strict mode + path aliases (~/components, ~/services, etc.)
├── react-router.config.ts
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── drizzle.config.ts
├── eslint.config.js                   # Flat config; naming rules; no-console for server
├── .prettierrc
├── .gitignore
├── .dockerignore
├── .env.example                       # Documents required env vars (DB_URL, NODE_ENV, ...)
├── docker-compose.yaml                # web + db (+ optional proxy) with health checks
├── Dockerfile                         # Multi-stage non-root (FR41)
├── .github/
│   └── workflows/
│       └── ci.yml                     # typecheck → lint → vitest → playwright → axe → docker build
├── app/                               # RR7 application source
│   ├── root.tsx                       # App shell; ToastProvider + OptimisticStoreProvider mount here
│   ├── routes/                        # File-based routes (loader/action/UI)
│   │   ├── _index.tsx                 # Single screen — loader (list), action (add)
│   │   └── todos.$id.tsx              # PATCH (toggle), DELETE per item
│   ├── components/                    # Presentational components, flat (small scale)
│   │   ├── TodoItem.tsx
│   │   ├── TodoItem.module.css
│   │   ├── TodoItem.test.tsx
│   │   ├── TodoInput.tsx
│   │   ├── TodoInput.module.css
│   │   ├── TodoInput.test.tsx
│   │   ├── Toast.tsx
│   │   ├── Toast.module.css
│   │   ├── Toast.test.tsx
│   │   ├── EmptyState.tsx             # FR13
│   │   ├── LoadingState.tsx           # FR14
│   │   └── ErrorState.tsx             # FR15
│   ├── services/                      # Thin service layer (FR39) — server-only
│   │   ├── todos.ts                   # listTodos / createTodo / toggleComplete / deleteTodo
│   │   └── todos.test.ts              # Integration tests against a real Postgres
│   ├── middleware/                    # Server-side request pipeline
│   │   ├── request-context.ts         # Browser-key extraction → context (FR37)
│   │   ├── request-context.test.ts
│   │   ├── ownership-check.ts         # No-op stub, pluggable (FR38)
│   │   └── ownership-check.test.ts
│   ├── lib/                           # Client + shared utilities
│   │   ├── browser-key.ts             # crypto.randomUUID + localStorage + fetch wrapper (FR19)
│   │   ├── browser-key.test.ts
│   │   ├── optimistic-store.ts        # Reducer + Context + dispatch helpers (FR25–FR30)
│   │   ├── optimistic-store.test.ts
│   │   ├── validation.ts              # Zod schemas (TodoCreate, TodoUpdate, …)
│   │   ├── validation.test.ts
│   │   └── logger.ts                  # pino instance with standard fields
│   ├── styles/
│   │   ├── tokens.css                 # Color/spacing/contrast tokens (WCAG AA)
│   │   ├── reset.css
│   │   └── global.css
│   └── types/
│       └── todo.ts                    # Shared TS types (Todo, MutationStatus, ErrorCode, …)
├── db/
│   ├── schema.ts                      # Drizzle schema; todos table with nullable owner_id (FR40)
│   ├── client.ts                      # Pool + Drizzle connection
│   └── migrations/
│       ├── 0001_init.sql              # todos table + idx_todos_owner_id_created_at
│       └── meta/                      # drizzle-kit metadata
├── e2e/                               # Playwright specs (≥5 mandatory)
│   ├── fixtures.ts                    # Browser-key seed, DB seed, page-object helpers
│   ├── happy-path.spec.ts             # add → view → complete → delete
│   ├── persistence.spec.ts            # refresh / restart / tab close preservation
│   ├── empty-state.spec.ts            # fresh browser key → empty list (no error)
│   ├── optimistic-rollback.spec.ts    # backend rejection → UI revert + retry toast
│   ├── concurrent-rollback.spec.ts    # mid-flight concurrent mutations during rollback
│   └── accessibility.spec.ts          # axe scan + keyboard-only walkthrough of all four verbs
├── public/
│   └── favicon.ico
└── scripts/
    └── db-seed.ts                     # Optional dev-only seed
```

### Requirements-to-Structure Mapping

| FR group | Primary files | Secondary files |
|---|---|---|
| **Task Capture** (FR1–FR4) | `app/routes/_index.tsx` (action) | `app/services/todos.ts::createTodo`, `app/lib/validation.ts::TodoCreateSchema`, `app/components/TodoInput.tsx` |
| **Task Lifecycle** (FR5–FR9) | `app/routes/todos.$id.tsx` (action) | `app/services/todos.ts::toggleComplete/deleteTodo`, `app/lib/validation.ts::TodoUpdateSchema` |
| **Task Display** (FR10–FR18) | `app/routes/_index.tsx` (loader + UI) | `app/components/TodoItem.tsx`, `app/components/EmptyState.tsx`, `app/components/LoadingState.tsx`, `app/components/ErrorState.tsx`, `app/styles/tokens.css` |
| **Persistence & Identity** (FR19–FR24) | `app/lib/browser-key.ts`, `app/middleware/request-context.ts`, `db/schema.ts`, `db/migrations/0001_init.sql` | `app/services/todos.ts` (uses ctx for filtering) |
| **Optimistic UI & Recovery** (FR25–FR30) | `app/lib/optimistic-store.ts`, `app/components/Toast.tsx`, `app/lib/browser-key.ts` (fetch wrapper) | All routes consume the store |
| **Accessibility & Input** (FR31–FR36) | `app/styles/tokens.css`, `app/root.tsx` (live region mount), individual components | `app/components/Toast.tsx` (live-region announcements), `app/components/*.module.css` (focus indicators) |
| **Architectural Seams** (FR37–FR40) | `app/middleware/request-context.ts`, `app/middleware/ownership-check.ts`, `app/services/todos.ts`, `db/schema.ts` | All actions go through this seam stack |
| **Containerization & Deployment** (FR41–FR44) | `Dockerfile`, `docker-compose.yaml`, `.github/workflows/ci.yml` | `.dockerignore`, `.env.example` |
| **Artifact-Set Capabilities** (FR45–FR48) | `README.md`, `CONVENTIONS.md`, `DECISIONS-NOT-MADE.md`, `AI-INTEGRATION-LOG.md` | This Architecture document; PRD; future stories/test design |

### Architectural Boundaries (Import Discipline)

The boundaries are stated as *one-way import rules*. ESLint enforces these where possible (`import/no-restricted-paths` plugin); the rest is code-review discipline.

```
        ┌─────────────────────────┐
        │ app/components/  app/routes/ (UI)   │     ← client-side
        └────────────┬────────────┘
                     │ may import
                     ▼
        ┌─────────────────────────┐
        │ app/lib/                │     ← shared (client + server safe)
        │  - optimistic-store     │
        │  - browser-key          │
        │  - validation           │
        │  - types                │
        └─────────────────────────┘

        ┌─────────────────────────┐
        │ app/routes/ (loaders/actions) │     ← server-side
        └────────────┬────────────┘
                     │ may import
                     ▼
        ┌─────────────────────────┐
        │ app/middleware/         │
        └────────────┬────────────┘
                     │ may import
                     ▼
        ┌─────────────────────────┐
        │ app/services/           │
        └────────────┬────────────┘
                     │ may import
                     ▼
        ┌─────────────────────────┐
        │ db/                     │
        └─────────────────────────┘
```

**Rules — never violated:**

1. **`db/*` imports nothing from `app/*`.** The DB layer is independent of HTTP.
2. **`app/services/*` imports `db/*` and `app/lib/types`, never `app/routes/*` or `app/middleware/*`.** Services are pure domain logic.
3. **`app/middleware/*` imports `app/lib/*` and is imported by `app/routes/*`.** Middleware is request-pipeline glue.
4. **`app/routes/*` is the only place that imports `app/services/*` and `app/middleware/*`.** Routes orchestrate; they don't implement.
5. **`app/components/*` and route-component-default-exports never import `app/services/*`, `app/middleware/*`, or `db/*`.** Client-side code stays client-side.
6. **`app/lib/*` is the *only* code shared between client and server.** Anything in `lib/` must work in both environments — no Node-only or browser-only APIs without a runtime guard.

### Data Flow — Request Lifecycle

The full request lifecycle for a mutation (e.g., toggling a todo complete) — every layer the request passes through:

```
1. UI event (TodoItem onChange)
2. → optimistic-store.dispatch({ type: 'toggleComplete', payload: { id, completed } })
3. → reducer applies optimistic update; state.pendingMutations[id] = { kind: 'toggle', previousStatus }
4. → fetch wrapper: PATCH /todos/:id  (headers: { 'X-Browser-Key': <uuid>, 'Content-Type': 'application/json' })
5. → RR7 router dispatches to app/routes/todos.$id.tsx → action()
6.   → request-context middleware: extracts X-Browser-Key, builds RequestContext = { browserKey, requestId }
7.   → ownership-check middleware: passes through in v1 (no-op stub); future module replaces with real check
8.   → Zod validation: TodoUpdateSchema.safeParse(body) — on failure, return 400 envelope, exit
9.   → todoService.toggleComplete(ctx, id, completed)
10.    → db.update(todos).set({ completion_status: completed }).where(and(eq(todos.id, id), eq(todos.owner_id, ctx.browserKey))).returning()
11.    → Postgres applies UPDATE
12.  → service returns updated row
13. → action returns Response.json({ ok: true, data: updated }, { status: 200 })
14. → fetch wrapper resolves with envelope
15. → optimistic-store.dispatch({ type: 'confirmMutation', payload: { id, serverTodo: data } })
16. → reducer replaces optimistic state with authoritative server data; pending cleared
17. → UI re-renders with confirmed state
```

**Failure branch (server returns `ok: false`):**
- step 14 receives `{ ok: false, error: { code, message } }`
- step 15 dispatches `{ type: 'revertMutation', payload: { id, error } }` instead
- reducer restores `previousStatus` from the pending record; pending cleared
- Toast component reads from a separate slice (or context) — surfaces error.message + Retry button
- Retry resends the same payload (steps 4–17 again with the same id/payload — idempotent by design)

### Integration Points

- **External integrations: none in v1.** No third-party APIs, no webhooks, no email, no telemetry SDKs (per NFR Security & Privacy).
- **Internal integration — frontend ↔ backend:** single Origin; HTTP+JSON via Remix loaders/actions; `X-Browser-Key` header; discriminated-union envelope.
- **Internal integration — backend ↔ database:** Drizzle ORM as the only DB access path; no raw SQL outside `db/migrations/`. Connection pool initialized once in `db/client.ts`.
- **Container integration — `docker-compose.yaml`:**
  ```
  web (Node 22 + Remix bundle) ←→ db (Postgres 17)
            ↑
            optional: proxy (Caddy/nginx for TLS termination at deploy time)
  ```
  Internal Docker network only; no host-network mode; web depends on db's health check passing.

### Development Workflow Integration

- **`pnpm dev`** — Vite dev server with HMR; serves Remix routes; expects Postgres reachable per `.env`. Trainee runs `docker compose up db` separately, or uses the full stack via `docker compose up`.
- **`pnpm test`** — Vitest watch mode for unit + integration tests. Integration tests against a real Postgres (uses `db/client.ts` pointed at a test DB). No mocked DB.
- **`pnpm test:e2e`** — Playwright headed locally; headless in CI. E2E spins up the full stack via `docker compose`, seeds the DB, runs against `http://localhost:3000`.
- **`pnpm lint`** — ESLint flat config; the import-boundary rules above; `no-console` for server code.
- **`pnpm typecheck`** — `tsc --noEmit`; runs `react-router typegen` first.
- **`pnpm build`** — `react-router build`; produces the production bundle. Used by the Dockerfile build stage.
- **`docker compose up`** — runs the full stack; the trainee should hit a green build from a clean checkout in ≤1 workday (NFR target).
- **CI pipeline order** (`.github/workflows/ci.yml`):
  1. `typecheck` (fast fail)
  2. `lint`
  3. `vitest run --coverage` (≥70% meaningful coverage gate)
  4. `playwright test` (≥5 specs incl. `concurrent-rollback.spec.ts`)
  5. `axe` accessibility scan (zero violations)
  6. `docker build` (multi-stage, non-root verification)

  Each step's failure breaks the build; merge requires all green.

## Architecture Validation Results

### Coherence Validation ✅

**Decision compatibility.** All technology choices integrate cleanly: TypeScript ↔ React Router 7 ↔ Vite ↔ Drizzle ↔ Postgres 17 ↔ Vitest ↔ Playwright ↔ Docker Compose. RR7 framework mode runs on Node 22 LTS; Drizzle uses `node-postgres` or `postgres.js`; Vitest is Vite-native; Playwright connects to any HTTP target. No version conflicts.

**Pattern consistency.** snake_case at DB / camelCase at API is idiomatic and Drizzle handles the boundary in one place. Discriminated-union envelope supports TypeScript narrowing. Idempotency contract is internally consistent (client-UUID + ON CONFLICT for create; natural for toggle/delete).

**Structure alignment.** The directory tree supports every architectural decision. Import boundaries (db/* ← services/* ← middleware/* ← routes/*) are enforceable via ESLint and align with the four seams.

### Requirements Coverage Validation ✅

**Functional Requirements — all 48 FRs have a structural home.** Spot-check by group:

| FR group | Covered by |
|---|---|
| Task Capture (FR1–4) | `app/routes/_index.tsx` action + `app/services/todos.ts::createTodo` + `app/lib/validation.ts::TodoCreateSchema` |
| Task Lifecycle (FR5–9) | `app/routes/todos.$id.tsx` + service + validation |
| Task Display (FR10–18) | `app/routes/_index.tsx` loader/UI + EmptyState/LoadingState/ErrorState components + `app/styles/tokens.css` |
| Persistence & Identity (FR19–24) | `app/lib/browser-key.ts` + `app/middleware/request-context.ts` + `db/schema.ts` (`owner_id`) + Drizzle queries filtered by `owner_id` |
| Optimistic UI & Recovery (FR25–30) | `app/lib/optimistic-store.ts` (reducer) + `app/components/Toast.tsx` (live region) + fetch wrapper preserves payload |
| Accessibility & Input (FR31–36) | `app/styles/tokens.css` (contrast) + `app/root.tsx` (live-region mount) + per-component ARIA + responsive CSS |
| Architectural Seams (FR37–40) | `request-context.ts`, `ownership-check.ts`, `app/services/todos.ts`, `db/schema.ts` (one-to-one with seam list) |
| Containerization (FR41–44) | `Dockerfile` (multi-stage, non-root) + `docker-compose.yaml` (health checks) + private-URL posture in deployment notes |
| Artifact-Set (FR45–48) | `README.md`, `CONVENTIONS.md`, `DECISIONS-NOT-MADE.md`, `AI-INTEGRATION-LOG.md` |

**Non-Functional Requirements — all 8 categories addressed.**

| NFR category | Architectural support |
|---|---|
| Performance | Playwright assertions on 100 ms / 500 ms / 2 s budgets; Vite production bundle |
| Reliability & Data Integrity | `optimistic-rollback.spec.ts` + `concurrent-rollback.spec.ts` + idempotency contract + Postgres durability |
| Security & Privacy | Helmet headers + custom-header CSRF mitigation + non-root containers + no third-party SDKs in dependencies |
| Accessibility | tokens.css contrast tokens + axe gate in CI + keyboard walkthrough Playwright spec |
| Scale & Capacity | No scaling architecture needed at v1; long-list state designed; `idx_todos_owner_id_created_at` covers query pattern |
| Quality & Maintainability | ≥70% coverage gate + ≥5 Playwright + Docker reproducibility + AI Integration Log + trainee dry-run target |
| Compatibility | Browser matrix in PRD enforced by Playwright projects; `localStorage` + `fetch` are baseline browser deps |
| Usability | Calm-by-default verified by *absence* in QA review (no telemetry SDKs, no streak code paths, no celebratory animations) |

### Implementation Readiness Validation ✅

**Decision completeness.** All critical decisions have a documented choice and rationale. Versions: Postgres 17 (or 18), Node 22 LTS (or 24), Drizzle latest, Zod latest, RR7 latest. "Latest" is acceptable here because the project init resolves to a specific version pinned in lockfiles.

**Structure completeness.** Every directory and config file is named. The trainee can match each FR group to a file path. CI pipeline shape is concrete and enforceable.

**Pattern completeness.** Naming, structure, format, communication, and process patterns each have an explicit rule with examples. The discriminated-union envelope and idempotency contract are spelled out with code samples.

### Gap Analysis Results

**Critical gaps:** **none.**

**Important gaps — one found:**

#### Gap I-1: Request-context field naming bends the seam more than necessary

**Symptom.** The architecture currently calls the principal field `ctx.browserKey` (mechanism-named). When the auth module lands, that field name becomes wrong — it's no longer a browser key, it's a user ID — so every service-layer caller has to be edited to use `ctx.userId` or some new field.

**Severity.** Important (not Critical). The seam still works, but adding auth would require touching every service callsite. This is exactly the kind of "bending" the PRD's risk-mitigation step specifically called out.

**Recommended fix (cheap, before story-writing begins).** Name the field semantically — what it *means* (the entity owner) rather than what it *is* (the browser key):

```ts
// app/middleware/request-context.ts
type Principal =
  | { kind: 'browser-key'; browserKey: string }
  | { kind: 'user'; userId: string }; // populated by future auth module

type RequestContext = {
  requestId: string;
  principal: Principal;
  ownerId: string;        // ← derived: equal to browserKey in v1, userId after auth
};
```

Services consume `ctx.ownerId` for filtering and `INSERT`. The middleware populates both `principal` (who they are) and `ownerId` (which `owner_id` value to use in the DB). Auth then changes only the middleware (adds the `user` variant and computes `ownerId` from `userId`). **Service code is unchanged. The seam doesn't bend.**

**Effort to apply:** ~10 lines across 3 files. Should be done as part of the request-context middleware story, *not* as a separate story.

**Nice-to-have gaps:** none worth surfacing as a separate item — the architecture is dense enough.

### Validation Issues Addressed

The single Important gap (I-1, request-context field naming) is documented above with a recommended fix. I'm noting it as a refinement to apply during implementation rather than re-editing earlier sections of this document; the fix is small and trainee-friendly.

### Architecture Completeness Checklist

**Requirements Analysis**

- [x] Project context thoroughly analyzed
- [x] Scale and complexity assessed
- [x] Technical constraints identified
- [x] Cross-cutting concerns mapped

**Architectural Decisions**

- [x] Critical decisions documented with versions
- [x] Technology stack fully specified
- [x] Integration patterns defined
- [x] Performance considerations addressed

**Implementation Patterns**

- [x] Naming conventions established
- [x] Structure patterns defined
- [x] Communication patterns specified
- [x] Process patterns documented

**Project Structure**

- [x] Complete directory structure defined
- [x] Component boundaries established
- [x] Integration points mapped
- [x] Requirements to structure mapping complete

### Architecture Readiness Assessment

**Overall Status:** **READY WITH MINOR GAPS** — Gap I-1 (request-context field naming) is non-blocking but should be applied during implementation. All 16 checklist items are checked; the single Important gap has a documented fix.

**Confidence Level:** **high.** Coherence holds; coverage is complete; the riskiest assumption (do the seams earn their tax?) was specifically validated by sketching the auth-module absorption — and surfaced one cheap refinement that buys real future-readiness.

**Key Strengths:**

- **Seam-first design** — request-context, ownership-check, service-layer, `owner_id` are colocated with the mechanism, named, and tested.
- **Idempotency built in** — client-UUID + ON CONFLICT eliminates retry-duplicate risk.
- **Discriminated-union envelope** — TypeScript narrowing carries through to the client store.
- **No third-party SDKs** — every decision honors the calm-by-default + no-telemetry stance.
- **CI gate sequence** — typecheck → lint → vitest → playwright → axe → docker — fast-fails early, slow checks late.
- **Trainee-readable choices** — Drizzle (SQL-first), CSS Modules (vanilla), hand-rolled optimistic store, RR7 loader/action over tRPC. Every decision is re-derivable.

**Areas for Future Enhancement (post-v1):**

- **Observability** — when telemetry policy relaxes, `pino` JSON to stdout is the cheapest hook for self-hosted log shipping (Loki/Vector/Grafana stack).
- **Testing depth** — story-level test design (`bmad-testarch-test-design`) will add the explicit risk-based test plan; v1 has the gates, not the strategy.
- **Auth module** — the seams are ready (after the I-1 fix); the next BMAD module on this repo can add it without rewrites.

### Implementation Handoff

**AI agent guidelines:**

- Follow all architectural decisions in this document exactly.
- Use implementation patterns consistently across all components — they are *not* defaults to override.
- Respect import boundaries (the diagram in *Project Structure → Architectural Boundaries*).
- Refer to this document and `CONVENTIONS.md` for all architectural questions; do not improvise naming, structure, or response shapes.
- Apply Gap I-1's recommended fix when wiring `request-context.ts` (semantic field naming: `ctx.ownerId` + `ctx.principal` tagged union).

**First implementation priority:**

```bash
npx create-react-router@latest todo-app
```

Then, in order: add Postgres + Drizzle (with the seam schema) → wire request-context middleware (apply Gap I-1 fix) → ownership-check stub → first verb (list-read) end-to-end → remaining verbs → optimistic store → designed states → accessibility pass → multi-stage Dockerfile + Compose → test discipline closure → security review + Decisions Not Made + AI Integration Log.
