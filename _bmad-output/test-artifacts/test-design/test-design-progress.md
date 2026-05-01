---
workflowStatus: 'completed'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-04-29'
mode: 'system-level'
project_name: 'ToDo App'
user_name: 'Pouya'
---

# Test Design Progress — ToDo App

## Step 1: Mode Detection & Prerequisites

**Mode:** System-Level (per skill priority-A rule when both PRD/ADR + Epic/Stories are present).

**Rationale:** ToDo App's scope (3 epics, 34 stories, single product surface) benefits from a single cohesive test strategy spanning all epics rather than fragmenting into per-epic plans.

**Prerequisites verified:**

- PRD: `_bmad-output/planning-artifacts/prd.md` — 48 FRs, 8 NFR categories
- Architecture (canonical decision record): `_bmad-output/planning-artifacts/architecture.md` — stack locked, 4 seams, Gap I-1 documented
- UX Design Specification: `_bmad-output/planning-artifacts/ux-design-specification.md` — visual language, components, accessibility strategy
- Epics & Stories: `_bmad-output/planning-artifacts/epics.md` — 3 epics, 34 stories with Given/When/Then ACs
- UX Mockup: `_bmad-output/planning-artifacts/ux-design-mockup.html` — visual reference for 6 canonical states

## Step 2: Load Context & Knowledge Base

**Configuration loaded** (from `_bmad/tea/config.yaml`):
- `tea_use_playwright_utils: true`
- `tea_use_pactjs_utils: false` (no microservices in v1)
- `tea_pact_mcp: none`
- `tea_browser_automation: auto`
- `test_stack_type: auto`
- `risk_threshold: p1`
- `test_design_output: _bmad-output/test-artifacts/test-design`

**Detected stack:** `fullstack` — TypeScript end-to-end + React Router 7 (frontend) + Drizzle/Postgres (backend), per architecture lock-in. (No code yet exists; stack detection from architecture document.)

**Project artifacts loaded for System-Level Mode:**
- PRD ✓ (FRs + 8 NFR categories)
- Architecture ✓ (canonical decision record with stack, seams, Gap I-1)
- Architecture/tech-spec ✓ (same document; serves both roles)
- Epics ✓ (3 epics, 34 stories for scope)
- UX spec ✓ (component-level test surfaces)

**Tech stack & dependencies (test-relevant):**
- Test frameworks: Vitest (unit + integration), Playwright (E2E + axe accessibility)
- Build: Vite (Vitest is Vite-native)
- DB: PostgreSQL 17 (real DB integration tests, not mocked)
- ORM: Drizzle (parameterized queries — A03 Injection mitigated by design)
- API: Remix loaders/actions returning discriminated-union envelopes
- Logging: pino (structured JSON to stdout)
- Container: Multi-stage non-root Docker, GitHub Actions CI
- Validation: Zod (server-side at every action boundary)

**Integration points:**
- **None external** — no third-party APIs, no webhooks, no email, no telemetry SDKs (refused by NFR Security & Privacy)
- **Internal:** browser ↔ Remix loaders/actions ↔ middleware (request-context, ownership-check) ↔ service layer (`app/services/todos.ts`) ↔ Drizzle ↔ Postgres

**NFRs (test-driving):**
- **Performance:** <100 ms p95 optimistic UI round-trip; <500 ms p95 backend confirm; <2 s first load; zero console errors on golden paths
- **Reliability:** persistence durability across all listed failure modes; optimistic-rollback correctness under concurrent mutation; idempotent retry; no silent failures
- **Security & Privacy:** OWASP Top 10 floor; container hygiene (non-root, no `latest`); no third-party SDKs; no data leaves deployment boundary
- **Accessibility:** WCAG 2.1 AA — axe scan + keyboard walkthrough, ≥4.5:1 contrast, ≥44×44 touch targets
- **Scale:** ~100 items/list, ~100 keys/deployment (no horizontal scaling needed)
- **Quality & Maintainability:** ≥70% Vitest meaningful coverage; ≥5 Playwright E2E *including ≥1 optimistic-rollback under concurrent input* (PRD risk-mitigation gate); trainee reproducibility ≤1 focused workday

**Browser exploration:** SKIPPED — greenfield project, no app deployed yet. Test design proceeds from documents.

**Knowledge fragments loaded (System-Level required + relevant):**
- `risk-governance.md` ✓ (scoring matrix 1–9, gate decisions PASS/CONCERNS/FAIL/WAIVED)
- `probability-impact.md` ✓ (P×I scale, action thresholds 1-3 DOCUMENT, 4-5 MONITOR, 6-8 MITIGATE, 9 BLOCK)
- `test-levels-framework.md` ✓ (Unit / Integration / E2E selection rules; Test ID format `{EPIC}.{STORY}-{LEVEL}-{SEQ}`)
- `test-priorities-matrix.md` ✓ (P0-P3 priority assignment; risk score → priority mapping)
- `test-quality.md` ✓ (Definition of Done: deterministic, isolated, explicit, focused, fast)

**Skipped fragments (not relevant):**
- `pactjs-utils-*` — no microservices, contract testing not applicable
- `email-auth.md` — no email flow in v1
- `feature-flags.md` — no flags in v1
- `contract-testing.md` — same as Pact (no microservice contracts)

## Step 3: Testability Review & Risk Assessment

### Testability Concerns (actionable)

- **T-1:** Concurrent-rollback testing requires deterministic timing via Playwright `page.route()` latency injection.
- **T-2:** Backend-rejection injection via Playwright `page.route()` (avoid test-only middleware).
- **T-3:** Time-sensitive assertions must be statistical (N=20 samples, assert p95) not single-shot.
- **T-4:** Browser-key isolation per test via `storageState: undefined` + defensive `localStorage.clear()`.
- **T-5:** DB isolation under parallel runners via per-test unique `owner_id`.
- **T-6:** `prefers-reduced-motion: reduce` testing via `test.use({ contextOptions: { reducedMotion: 'reduce' } })`.
- **T-7:** Color-blindness verification combines axe-core (structural rule) + manual DevTools verification.
- **T-8:** Performance instrumentation needs `performance.mark()`/`performance.measure()` in client code; Playwright reads via `page.metrics()` or `page.evaluate(() => performance.getEntriesByName(...))`.

### Testability Assessment Summary (strong)

- Hand-rolled optimistic store, fully unit-testable (pure reducer)
- Discriminated-union envelope makes mocks trivial
- No third-party SDKs to mock
- Drizzle parameterized queries make SQL injection structurally impossible
- Idempotency by design (client-UUID + ON CONFLICT) — retries safe to test
- Single-screen single-route — small Playwright spec count
- Real Postgres in container for integration tests
- Vite + Vitest tightly integrated
- pino JSON logs are stable for assertions
- Storage-state-based browser-key seeding via Playwright fixtures

### ASRs (Architecturally Significant Requirements)

- **ASR-1 ACTIONABLE:** Optimistic UI rollback under concurrent mutations → `concurrent-rollback.spec.ts`
- **ASR-2 ACTIONABLE:** Per-browser-per-deployment persistence durability → `persistence.spec.ts`
- **ASR-3 ACTIONABLE:** Idempotent retry (client-UUID + ON CONFLICT) → integration test + E2E
- **ASR-4 ACTIONABLE:** Request-context tagged-union principal (Gap I-1) → Vitest unit + service-layer grep
- **ASR-5 FYI:** Ownership-check stub invocation → Vitest middleware test
- **ASR-6 FYI:** Container hygiene → CI `docker inspect` step
- **ASR-7 ACTIONABLE:** Three-breakpoint responsive → Playwright projects per viewport
- **ASR-8 ACTIONABLE:** WCAG 2.1 AA → axe gate + manual keyboard walkthrough
- **ASR-9 ACTIONABLE:** Trainee reproducibility ≤1 workday → Story 3.5 dry-run

### Risk Assessment Matrix

**24 risks identified.** No score-9 BLOCK risks.

**MITIGATE risks (score 6–8) — 8:**
- TECH-1 Optimistic-rollback corruption under concurrent mutations (P=2, I=3)
- TECH-2 Seam-design failure (request-context bends under auth) (P=2, I=3)
- TECH-3 Idempotency violation on retry (P=2, I=3)
- SEC-4 Public-internet exposure without security pass (P=2, I=3)
- DATA-4 Migration failure on deployment (P=2, I=3)
- BUS-2 Trainee fails to reproduce v1 in ≤1 workday (P=2, I=3)
- OPS-1 `docker compose up` from clean checkout fails (P=2, I=3)
- OPS-3 Test flakiness on optimistic-rollback timing (P=3, I=2)

**MONITOR risks (score 4–5) — 7:**
- SEC-1 Browser-key leakage in logs (mitigated by 8-char truncation)
- SEC-3 CSRF on state-changing actions (mitigated by same-origin + custom header)
- PERF-1 Optimistic UI round-trip >100 ms p95
- DATA-2 Two-tab race condition (last-write-wins acceptable in v1)
- BUS-1 Calm-by-default broken by accidental urgency mechanic
- BUS-3 Usability test < 3/5 calmer-alternative
- OPS-2 CI gate sequence too slow

**DOCUMENT risks (score 1–3) — 9:** TECH-4, SEC-2, SEC-5, SEC-6, PERF-2, PERF-3, PERF-4, DATA-1, DATA-3.

### Highest-Priority Mitigations (drive Step 4 priorities)

1. **TECH-1** → P0 `concurrent-rollback.spec.ts` with deterministic `page.route()` timing.
2. **TECH-2** → P0 Vitest unit asserting `ctx.ownerId` consumption pattern.
3. **TECH-3** → P0 integration test against real Postgres for retry idempotency.
4. **OPS-3** → P0 testing pattern: deterministic timing, statistical assertions, zero `waitForTimeout`.

## Step 4: Coverage Plan & Execution Strategy

### Coverage Matrix Summary

71 atomic test scenarios across 4 levels:

| Level | P0 | P1 | P2 | P3 | Total |
|---|---|---|---|---|---|
| Unit (Vitest) | 4 | 18 | 6 | 0 | 28 |
| Integration (Vitest + real Postgres) | 5 | 8 | 2 | 1 | 16 |
| E2E (Playwright) | 4 | 9 | 4 | 1 | 18 |
| Manual / Verification | 1 | 4 | 2 | 2 | 9 |
| **Total** | **14** | **39** | **14** | **4** | **71** |

E2E count of 18 substantially exceeds the PRD's ≥5 floor (concurrent-rollback alone is one of those 5; the others cover persistence, designed states, responsive viewports, axe).

### P0 Scenarios (14)

| Test ID | Level | Scenario | Source |
|---|---|---|---|
| 1.5-UNIT-001 | Unit | `RequestContext` exposes `ctx.ownerId` derived from `principal.browserKey`; service-layer code consumes `ctx.ownerId` (not `ctx.principal.browserKey` directly) | TECH-2 / ASR-4 / Gap I-1 |
| 1.6-UNIT-001 | Unit | `checkOwnership` invoked before every `todoService.*` call | ASR-5 / FR38 |
| 1.7-INT-001 | Integration | `listTodos(ctx)` filters by `ownerId` (real Postgres); foreign / unknown owner returns `[]` | FR21, FR22 |
| 1.7-INT-002 | Integration | `createTodo` with same client-UUID twice produces single row (idempotent `INSERT ... ON CONFLICT`) | TECH-3 / ASR-3 |
| 1.4-INT-001 | Integration | `drizzle-kit` migrations apply cleanly against fresh Postgres; schema state asserted post-migration | DATA-4 |
| 2.1-INT-001 | Integration | `docker inspect` of runtime image confirms `User: node`; no `latest` tags | ASR-6 / FR41 |
| 1.10-E2E-001 | E2E | Happy-path capture: type → Enter → optimistic render → backend confirms; field clears + stays focused | FR1-4, FR25 |
| 1.14-E2E-001 | E2E | **Concurrent-rollback under load** — the load-bearing risky-assumption test | TECH-1 / OPS-3 |
| 1.14-E2E-002 | E2E | Optimistic-rollback Retry preserves payload (idempotent retry, Toast auto-dismiss) | TECH-3 / FR27, FR28, FR30 |
| 1.8-E2E-001 | E2E | Persistence durability across refresh / restart / tab close / container restart | DATA-1 / ASR-2 / FR24 |
| 1.17-E2E-001 | E2E | axe-core zero violations on all 6 canonical states | NFR Accessibility / ASR-8 |
| 1.17-MAN-001 | Manual | Keyboard-only walkthrough completes all four verbs | NFR Accessibility / FR31 |
| 2.6-MAN-001 | Manual | README deployment-posture warning verified | SEC-4 / FR44 |
| 3.5-MAN-001 | Manual | Trainee dry-run: ≤1 focused workday to green build + passing E2E | BUS-2 / NFR Quality / Story 3.5 |

### P1 / P2 / P3 Scenarios (compact)

**P1 (39):** Optimistic-store reducer per action type, browser-key utility, Zod schemas, env validation, pino field shape, per-component logic (Unit-18); service layer per verb against real Postgres, error envelope discriminated union, 404 handling, security headers middleware, logging fields (Integration-8); toggle/delete flows, designed Empty/Loading/Error/Long-list states, rollback for each of add/toggle/delete, Toast non-blocking, responsive layout per viewport (E2E-9); performance budget verification, 5-person usability test, security review documented triage, cross-browser smoke (Manual-4).

**P2 (14):** Service-layer sort order, RR7 typegen sanity, reduced-motion CSS rule, log truncation, AppShell provider mount, layout containers (Unit-6); reduced-motion path, env fails-fast (Integration-2); reduced-motion behavior, sticky input on long-list, mobile-submit, hover-revealed glyph (E2E-4); color-blindness simulation, typographic rendering smoke (Manual-2).

**P3 (4):** Cross-tab race exploration (Integration-1); bundle-size budget regression (E2E-1); coverage drift inspection, screen-reader deep dive (Manual-2).

### Execution Strategy (PR / Nightly)

**Per-PR (target <10 min):** typecheck → lint → Vitest+coverage gate ≥70% → Playwright headless 18 specs sharded → axe (in accessibility.spec.ts) → docker build. Each step's failure breaks the build.

**Nightly:** statistical performance regression (N=20 runs); cross-browser matrix (Chromium/Firefox/Safari/Edge × desktop/mobile); bundle-size Lighthouse CI; periodic color-blindness + typographic rendering checks.

**Pre-release one-time:** OWASP Top 10 review (Story 2.11); 5-person usability test (Story 2.12); trainee dry-run (Story 3.5).

### Resource Estimates (engineering-hour ranges)

- P0 (14 scenarios): ~12–20 hours
- P1 (39 scenarios): ~25–40 hours
- P2 (14 scenarios): ~6–12 hours
- P3 (4 scenarios): ~2–4 hours
- Test infrastructure (Playwright config, fixtures, helpers, CI workflow): ~10–18 hours
- **Total:** **~55–94 hours**

Spread across Epic 1 stories (per-story tests, cross-cutting) + Epic 2 stories (CI, perf, security, usability gates).

### Quality Gates (PR Decision)

- **PASS:** All P0 green, P1 ≥95%, coverage ≥70% meaningful, axe zero, perf budgets met, container hygiene clean.
- **CONCERNS:** P0 green; P1 has ≤5% failures with documented investigation; conditional merge with owner+deadline; do not mute.
- **FAIL:** Any P0 failure / axe violation / perf budget breach / container hygiene violation. Block merge.
