---
workflowStatus: 'complete'
totalSteps: 5
stepsCompleted: ['step-01-detect-mode', 'step-02-load-context', 'step-03-risk-and-testability', 'step-04-coverage-plan', 'step-05-generate-output']
lastStep: 'step-05-generate-output'
nextStep: ''
lastSaved: '2026-04-29'
workflowType: 'testarch-test-design'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics.md
---

# Test Design for QA: ToDo App v1

**Purpose:** Test execution recipe. Defines what to test, at what level, with what priority, and what must be in place before test development starts.

**Date:** 2026-04-29
**Author:** Murat (Test Architect, AI-assisted)
**Status:** Draft — ready for review and execution
**Project:** ToDo App

**Related:** See `test-design-architecture.md` for risk assessment, testability gaps, and architectural mitigations.

---

## Executive Summary

**Scope.** Full v1 test discipline. 71 atomic test scenarios across Unit (28) / Integration (16) / E2E (18) / Manual (9). Targets: ≥70% Vitest meaningful coverage; ≥5 Playwright E2E *including ≥1 optimistic-rollback under concurrent input* (PRD floor); zero axe violations; perf budgets enforced.

**Risk Summary** (full detail in companion architecture doc):

- Total Risks: 24 (8 high-priority score ≥6, 7 medium score 4–5, 9 low score 1–3, 0 critical score 9)
- Critical Categories: TECH (3 high-priority — concurrent rollback, seam naming, idempotency), OPS (2 — clean-checkout boot + test flakiness), DATA (1 — migration), BUS (1 — trainee dry-run), SEC (1 — public-internet exposure)

**Coverage Summary:**

- **P0 tests:** 14 (4 Unit + 5 Integration + 4 E2E + 1 Manual)
- **P1 tests:** 39 (18 Unit + 8 Integration + 9 E2E + 4 Manual)
- **P2 tests:** 14 (6 Unit + 2 Integration + 4 E2E + 2 Manual)
- **P3 tests:** 4 (0 Unit + 1 Integration + 1 E2E + 2 Manual)
- **Total:** 71 scenarios — ~55–94 engineering hours, interleaved with Epic 1+2 story execution.

---

## Not in Scope

| Item | Reasoning | Mitigation |
|---|---|---|
| **Contract testing (Pact)** | No microservices; single deployable monolith with REST-ish loaders/actions | Service-layer integration tests against real Postgres cover the in-process boundary |
| **Load testing (k6, Artillery)** | At ~100 items/list and ~100 keys/deployment, scale concerns don't apply | Performance budgets cover the only meaningful metric (single-request latency) |
| **Visual-regression testing** | Vintage-Mac-System-7 design is intentionally restrained; component CSS rule presence asserted at unit level | axe + manual review catch what visual-regression would otherwise add |
| **Cross-region failover / DR** | Single-deployment scope; no multi-region in v1 | N/A |
| **Native mobile app testing** | No native apps — responsive web only | Playwright at mobile viewport widths covers the user-facing mobile experience |
| **Public-internet penetration testing** | v1 deployment posture is local-first / private-URL only | OWASP Top 10 review (Story 2.11) covers known classes; public deployment requires a separate security pass per PRD |
| **Email-flow testing** | No email path in v1 (refused per architecture) | N/A |
| **Auth / session testing** | No auth in v1 (refused per PRD) | Browser-key transport is tested; auth-specific flows are post-v1 |

**Note:** Items above are reviewed and accepted as out-of-scope. Any addition requires updating the test plan + DECISIONS-NOT-MADE.md.

---

## Dependencies & Test Blockers

**CRITICAL:** Test development cannot proceed past these gates until the items below land.

### Pre-Implementation (Architecture Already Specs These — see `test-design-architecture.md` Quick Guide)

1. **Gap I-1 semantic seam naming applied** — Story 1.5; verified by Test 1.5-UNIT-001.
2. **Idempotency contract** (client-UUID + `INSERT ... ON CONFLICT`) — Stories 1.7 + 1.10; verified by Test 1.7-INT-002.
3. **Real Postgres test DB available** — Story 2.3 env config + Story 2.2 compose; needed before Story 1.7 service tests can run.
4. **Client-side performance instrumentation** — Story 1.9 emits `performance.mark()` calls; needed before Story 2.10 perf budget assertions.
5. **`page.route()` testing pattern documented** — Test infrastructure (Story 2.7); needed before Story 1.14 concurrent-rollback spec.

### Test Infrastructure Setup (Pre-Implementation, Story 2.7)

1. **Playwright config + projects per viewport**
   - `playwright.config.ts` defines projects: `mobile-chromium` (375×667), `tablet-chromium` (768×1024), `desktop-chromium` (1280×720), plus optional `firefox`, `webkit` for cross-browser nightly.
   - Each project loads `e2e/fixtures.ts` for shared fixtures.

2. **Test fixtures (`e2e/fixtures.ts`)**
   - `freshBrowserKey` — clears `localStorage` before test; Playwright fixture pattern.
   - `seededDatabase` — truncates `todos` for the test's `owner_id` after each test (cleanup discipline).
   - `forceBackendRejection(route, status, body)` — Playwright `page.route()` helper that intercepts a route and responds with the rejection envelope.
   - `injectLatency(route, ms)` — adds deterministic latency to a route (for concurrent-rollback testing).
   - `statisticalAssert(samples, percentile, threshold)` — asserts the p95 (or any percentile) of N samples is within budget.

3. **Vitest config + integration helpers**
   - `vitest.config.ts` separates unit (no DB) from integration (real Postgres) suites via test name patterns or directories.
   - Integration suite has `beforeAll` that runs migrations against a clean test DB; `afterEach` truncates per test's `owner_id`.

4. **CI workflow (`.github/workflows/ci.yml`)**
   - Sequential jobs: typecheck → lint (incl. `no-waitForTimeout` rule + Gap I-1 grep) → vitest+coverage gate ≥70% → playwright headless sharded → axe (in spec) → docker build (multi-stage non-root verification).
   - Artifacts uploaded: coverage report, Playwright trace + screenshot on failure, Lighthouse CI results.

**Example fixture pattern:**

```typescript
// e2e/fixtures.ts
import { test as base, expect } from '@playwright/test';
import { randomUUID } from 'crypto';

type AppFixtures = {
  freshBrowserKey: string;
  forceBackendRejection: (route: string, status: number, body?: unknown) => Promise<void>;
  injectLatency: (route: string, ms: number) => Promise<void>;
};

export const test = base.extend<AppFixtures>({
  freshBrowserKey: async ({ page }, use) => {
    const key = randomUUID();
    await page.addInitScript((k: string) => {
      window.localStorage.setItem('todo-app:browser-key', k);
    }, key);
    await use(key);
    // No teardown needed; per-test page isolation handles it.
  },

  forceBackendRejection: async ({ page }, use) => {
    const helper = async (route: string, status: number, body?: unknown) => {
      await page.route(route, async (req) => {
        await req.fulfill({
          status,
          contentType: 'application/json',
          body: JSON.stringify(body ?? { ok: false, error: { code: 'INTERNAL', message: 'forced' } }),
        });
      });
    };
    await use(helper);
  },

  injectLatency: async ({ page }, use) => {
    const helper = async (route: string, ms: number) => {
      await page.route(route, async (req) => {
        await new Promise((r) => setTimeout(r, ms));
        await req.continue();
      });
    };
    await use(helper);
  },
});

export { expect };
```

---

## Risk Assessment

**Note:** Full risk register in `test-design-architecture.md`. Summary here for QA test planning.

### High-Priority Risks (Score ≥6) — Direct Test Coverage

| Risk ID | Category | Description | Score | QA Test Coverage |
|---|---|---|---|---|
| **TECH-1** | TECH | Optimistic-rollback corruption under concurrent mutations | **6** | Test 1.14-E2E-001 — `concurrent-rollback.spec.ts` with deterministic `page.route()` latency injection |
| **TECH-2** | TECH | Seam-design failure (Gap I-1 violation) | **6** | Test 1.5-UNIT-001 — Vitest unit asserts `ctx.ownerId` shape; CI grep for `ctx.principal.browserKey` direct access |
| **TECH-3** | TECH | Idempotency violation on retry | **6** | Tests 1.7-INT-002 (DB-level) + 1.14-E2E-002 (UI-level retry preserves payload) |
| **SEC-4** | SEC | Public-internet exposure without security pass | **6** | Test 2.6-MAN-001 — manual README content verification (warning present, no auto public deploy) |
| **DATA-4** | DATA | Migration failure on deployment | **6** | Test 1.4-INT-001 — fresh-Postgres migration + schema-state assertion |
| **BUS-2** | BUS | Trainee fails to reproduce v1 in ≤1 workday | **6** | Test 3.5-MAN-001 — trainee dry-run with documented path and time |
| **OPS-1** | OPS | `docker compose up` from clean checkout fails | **6** | Test 2.2-INT-001 (in CI) + Test 3.5-MAN-001 |
| **OPS-3** | OPS | Test flakiness on optimistic-rollback timing | **6** | ESLint rule + statistical assertions + `page.route()` discipline (cross-cutting, not single test) |

### Medium / Low-Priority Risks — Cross-Cutting Coverage

| Risk ID | Category | Description | Score | QA Test Coverage |
|---|---|---|---|---|
| SEC-1 | SEC | Browser-key leakage in logs | 4 | Vitest integration asserts pino truncates browserKey to 8 chars |
| SEC-3 | SEC | CSRF on state-changing actions | 4 | Vitest integration asserts requests without `X-Browser-Key` header are rejected |
| PERF-1 | PERF | Optimistic UI round-trip >100 ms p95 | 4 | Test 2.10-E2E — statistical assertion N=20 samples |
| DATA-2 | DATA | Two-tab race condition | 4 | Test P3 manual exploration — last-write-wins acceptable (documented) |
| BUS-1 | BUS | Calm-by-default broken by accidental urgency mechanic | 4 | QA checklist verifies absence of streak/badge/percentage mechanics |
| BUS-3 | BUS | Usability test < 3/5 calmer-alternative | 4 | Test 2.12-MAN-001 (Story 2.12) |
| OPS-2 | OPS | CI gate sequence too slow | 4 | CI metrics; sharded Playwright; cross-cutting |
| TECH-4 | TECH | localStorage corruption / unavailability | 2 | Documented; private-mode degrades gracefully |
| SEC-2 | SEC | SQL injection | 3 | Documented; Drizzle parameterized queries by design |
| SEC-5 | SEC | Container running as root | 3 | Test 2.1-INT-001 verifies `User: node` |
| SEC-6 | SEC | Third-party SDK supply-chain | 3 | Documented; no third-party SDKs in v1 |
| PERF-2 | PERF | First-load >2 s | 2 | Documented; bundle-size budget covers regressions |
| PERF-3 | PERF | Backend confirm >500 ms p95 under load | 2 | Documented; not relevant at v1 scale |
| PERF-4 | PERF | Long-list rendering | 1 | Documented; ~100 items below virtualization threshold |
| DATA-1 | DATA | Persistence durability on container restart | 3 | Test 1.8-E2E-001 covers refresh/restart/tab-close; container-restart partial |
| DATA-3 | DATA | UUID collision | 3 | Documented; astronomically improbable |

---

## Entry Criteria

**Test development cannot begin until ALL of the following are met:**

- [ ] Architecture document signed off (test-design-architecture.md acknowledged by Pouya).
- [ ] Story 1.1 (project init) merged.
- [ ] Story 2.7 (CI pipeline + test infrastructure) acceptance criteria drafted (config files, fixtures, lint rules).
- [ ] Postgres 17 reachable for integration tests (local install or `docker compose up db`).
- [ ] Node 22 LTS local environment.
- [ ] `@axe-core/playwright` package selected and added to dev deps.

**Stories 1.5+ tests cannot begin until:**

- [ ] Test infrastructure (Story 2.7 setup work) lands.
- [ ] `page.route()` testing pattern documented in `e2e/fixtures.ts`.

## Exit Criteria

**Testing phase is complete (and v1 declared shipped) when ALL of the following are met:**

- [ ] All 14 P0 tests passing.
- [ ] ≥95% of 39 P1 tests passing (failures triaged with documented investigation).
- [ ] ≥70% Vitest meaningful coverage (line + branch).
- [ ] axe-core scan reports zero violations on every release build.
- [ ] Performance budgets met: 100 ms p95 optimistic, 500 ms p95 confirm, <2 s first load, 0 console errors.
- [ ] Container hygiene verified in CI: non-root, no `latest` tags, no host network mode.
- [ ] OWASP Top 10 review complete with documented triage (Story 2.11).
- [ ] 5-person usability test: ≥4/5 unaided completion + ≥3/5 unprompted "calmer alternative" affirmation (Story 2.12).
- [ ] **Trainee dry-run** reaches green build + passing E2E within ≤1 focused workday (Story 3.5 — closing v1 gate).

---

## Project Team

Single-developer cadence. Pouya is the implementer for v1 with AI assistance (Claude as the multi-role agent across PM, Architect, UX, Test Architect, Dev). Roles overlap; testing responsibilities sit with the same person who implements.

---

## Test Coverage Plan

**IMPORTANT:** P0/P1/P2/P3 = priority and risk level (what to focus on if time-constrained), NOT execution timing. See "Execution Strategy" for when tests run.

### P0 (Critical — 14 scenarios)

**Criteria:** Blocks core functionality + High risk (≥6) + No workaround + Affects majority of users.

| Test ID | Requirement | Test Level | Risk Link | Notes |
|---|---|---|---|---|
| **1.5-UNIT-001** | `RequestContext` exposes `ctx.ownerId`; service code never uses `ctx.principal.browserKey` directly | Unit | TECH-2 | Vitest + CI grep static check |
| **1.6-UNIT-001** | `checkOwnership` invoked before every `todoService.*` call | Unit | ASR-5 | Vitest middleware test |
| **1.7-INT-001** | `listTodos(ctx)` filters by `ownerId`; foreign / unknown returns `[]` | Integration | FR21, FR22 | Vitest + real Postgres |
| **1.7-INT-002** | `createTodo` with same client-UUID twice produces single row | Integration | TECH-3 | Vitest + real Postgres + idempotency assertion |
| **1.4-INT-001** | drizzle-kit migrations apply cleanly against fresh Postgres; schema-state asserted | Integration | DATA-4 | CI step against fresh DB |
| **2.1-INT-001** | `docker inspect` confirms `User: node`; no `latest` tags | Integration | ASR-6, FR41 | CI step |
| **1.10-E2E-001** | Happy-path capture: type → Enter → optimistic render → backend confirms; field clears + stays focused | E2E | FR1-4, FR25 | Playwright |
| **1.14-E2E-001** | **Concurrent-rollback under load** — the load-bearing risky-assumption test | E2E | TECH-1, OPS-3 | Playwright + `injectLatency` + `forceBackendRejection` |
| **1.14-E2E-002** | Optimistic-rollback Retry preserves payload (idempotent retry, Toast auto-dismiss) | E2E | TECH-3, FR27, FR28, FR30 | Playwright |
| **1.8-E2E-001** | Persistence durability across refresh / restart / tab close / container restart | E2E | DATA-1, ASR-2, FR24 | Playwright |
| **1.17-E2E-001** | axe-core zero violations on Default, Empty, Loading, Error, Long-list, Toast states | E2E | NFR Accessibility, ASR-8 | `@axe-core/playwright` |
| **1.17-MAN-001** | Keyboard-only walkthrough completes all four verbs | Manual | NFR Accessibility, FR31 | Documented in `docs/keyboard-walkthrough.md` |
| **2.6-MAN-001** | README explicitly warns against public-internet exposure; no auto public-deploy config | Manual | SEC-4, FR44 | Pre-release review |
| **3.5-MAN-001** | Trainee dry-run reaches green build + passing E2E within ≤1 focused workday | Manual | BUS-2, NFR Quality, Story 3.5 | Closing v1 gate |

**Total P0:** 14 scenarios.

---

### P1 (High — 39 scenarios)

**Criteria:** Important features + Medium risk (3–4) + Common workflows + Workaround exists but difficult.

#### Unit (18) — Optimistic-store, browser-key, validation, components

| Test ID | Requirement | Test Level |
|---|---|---|
| 1.9-UNIT-001 | Optimistic store reducer: `addTodo` action applies tempTodo at top, registers pendingMutation | Unit |
| 1.9-UNIT-002 | Optimistic store reducer: `toggleComplete` action flips status, stores previousStatus | Unit |
| 1.9-UNIT-003 | Optimistic store reducer: `deleteTodo` action removes todo, stores previousTodo | Unit |
| 1.9-UNIT-004 | Optimistic store reducer: `confirmMutation` replaces tempTodo with server data, clears pending | Unit |
| 1.9-UNIT-005 | Optimistic store reducer: `revertMutation` restores prior state, clears pending | Unit |
| 1.9-UNIT-006 | Optimistic store: concurrent pending mutations don't corrupt state | Unit |
| 1.3-UNIT-001 | `getBrowserKey()` issues UUID via `crypto.randomUUID()` on first call, persists to localStorage | Unit |
| 1.3-UNIT-002 | `getBrowserKey()` second call returns same key | Unit |
| 1.3-UNIT-003 | Fetch wrapper injects `X-Browser-Key` header on every request | Unit |
| 1.10-UNIT-001 | `TodoCreateSchema` (Zod) accepts 1–256 char description, rejects empty / >256 | Unit |
| 1.11-UNIT-001 | `TodoUpdateSchema` (Zod) accepts boolean `completionStatus` | Unit |
| 2.3-UNIT-001 | Env Zod schema rejects missing `DATABASE_URL` with clear error | Unit |
| 2.4-UNIT-001 | pino logger config emits standard fields per request log | Unit |
| 2.4-UNIT-002 | pino logger truncates `browserKey` to first 8 chars | Unit |
| 1.10-UNIT-002 | TextInput component: Enter dispatches submit; whitespace-only doesn't dispatch | Unit |
| 1.11-UNIT-002 | Checkbox component: tap dispatches toggle action | Unit |
| 1.13-UNIT-001 | Toast component: Retry button dispatches retry action with original payload | Unit |
| 1.13-UNIT-002 | Toast component: Dismiss × hides without retry | Unit |

#### Integration (8) — Service layer + DB + middleware

| Test ID | Requirement | Test Level |
|---|---|---|
| 1.7-INT-003 | `createTodo` inserts new row with provided `id` and `ownerId` | Integration |
| 1.7-INT-004 | `toggleComplete` updates row only when `ownerId` matches | Integration |
| 1.7-INT-005 | `deleteTodo` removes row only when `ownerId` matches; returns success on already-deleted (404 → success at semantic level) | Integration |
| 1.10-INT-001 | POST `/todos` action returns `201 { ok: true, data: createdTodo }` envelope | Integration |
| 1.10-INT-002 | POST `/todos` rejection returns `400 { ok: false, error: { code: 'VALIDATION', fieldErrors } }` envelope | Integration |
| 1.11-INT-001 | PATCH `/todos/:id` returns `404 { ok: false, error: { code: 'NOT_FOUND' } }` for nonexistent id | Integration |
| 2.5-INT-001 | Security headers middleware applies `X-Content-Type-Options`, `Referrer-Policy`, `X-Frame-Options` to every response | Integration |
| 2.4-INT-001 | Logger emits standard fields per request lifecycle (request-start + request-end) | Integration |

#### E2E (9) — Toggle, delete, designed states, rollback per verb, responsive, Toast non-blocking

| Test ID | Requirement | Test Level |
|---|---|---|
| 1.11-E2E-001 | Toggle complete → strike-through visible; toggle again → reverts to active | E2E |
| 1.12-E2E-001 | Delete glyph removes row instantly; 404 treated as success | E2E |
| 1.13-E2E-001 | Empty state renders "Nothing on the list." for fresh browser key | E2E |
| 1.13-E2E-002 | Loading state renders "Loading…" during initial fetch | E2E |
| 1.13-E2E-003 | Error state renders "Couldn't load. Retry" + functional input above | E2E |
| 1.14-E2E-003 | Add rollback: backend rejection → optimistic add reverts + Toast appears with description | E2E |
| 1.14-E2E-004 | Toggle rollback: backend rejection → completion state reverts + Toast | E2E |
| 1.14-E2E-005 | Delete rollback: transient 5xx → row restored at original position + Toast | E2E |
| 1.14-E2E-006 | Toast is non-blocking: capture another todo while a Toast is up | E2E |

#### Manual (4) — Performance, usability, security review, cross-browser smoke

| Test ID | Requirement | Test Level |
|---|---|---|
| 2.10-MAN-001 | Statistical performance assertion: optimistic round-trip <100 ms p95 (N=20 samples) | Manual / Playwright |
| 2.11-MAN-001 | OWASP Top 10 review with documented triage | Manual |
| 2.12-MAN-001 | 5-person usability test: ≥4/5 unaided + ≥3/5 calmer-alternative | Manual |
| 2.7-MAN-001 | Cross-browser smoke: Chrome / Firefox / Safari (mac+iOS) / Edge — all 6 canonical states render | Manual |

**Total P1:** 39 scenarios.

---

### P2 (Medium — 14 scenarios)

**Criteria:** Secondary features + Low risk (1–2) + Edge cases + Regression prevention.

| Test ID | Requirement | Test Level | Notes |
|---|---|---|---|
| 1.7-UNIT-001 | `listTodos` returns todos in `created_at` DESC order | Unit | FR17 |
| 1.16-UNIT-001 | `prefers-reduced-motion: reduce` CSS rule presence in component CSS | Unit | NFR Accessibility / Motion |
| 1.13-UNIT-003 | Toast: live region `role="status"` and `aria-live="polite"` attributes present | Unit | FR34 |
| 1.2-UNIT-001 | AppShell mounts ToastProvider + OptimisticStoreProvider | Unit | UX-DR11 |
| 1.2-UNIT-002 | `Stack` and `Inline` layout containers apply `--space-*` tokens correctly | Unit | UX-DR1 |
| 1.10-UNIT-003 | TextInput pre-focused on desktop mount only (not mobile) | Unit | UX-DR3 |
| 2.3-INT-001 | Process exits fast on missing `DATABASE_URL` env var | Integration | Story 2.3 AC |
| 1.16-INT-001 | Static asset cache headers correct on built bundle | Integration | Cache strategy |
| 1.17-E2E-002 | Reduced-motion: Toast slide-in collapses to instant; ListItem fade-on-revert is instant | E2E | NFR Accessibility |
| 1.16-E2E-001 | Long-list state with sticky input on scroll (50+ items) | E2E | FR16 |
| 1.15-E2E-001 | Mobile capture-submit affordance tappable (≤640 px viewport) | E2E | UX-DR17, FR2 |
| 1.12-E2E-002 | Hover-revealed delete glyph on desktop only; always visible on mobile | E2E | UX-DR / FR7 |
| 1.17-MAN-002 | Color-blindness simulation (deuteranopia, protanopia, tritanopia, achromatopsia) | Manual | NFR Accessibility |
| 2.7-MAN-002 | Typographic rendering smoke check across OSes (Charter / Iowan Old Style / Palatino fallback chain) | Manual | UX-DR12 |

**Total P2:** 14 scenarios.

---

### P3 (Low — 4 scenarios)

**Criteria:** Nice-to-have + Exploratory + Performance benchmarks + Documentation validation.

| Test ID | Requirement | Test Level | Notes |
|---|---|---|---|
| 1.16-INT-002 | Cross-tab race condition exploration (open two tabs, mutate from each, observe last-write-wins) | Integration / Manual | DATA-2 documented |
| 2.10-E2E-001 | Bundle-size regression budget via Lighthouse CI on first-load | E2E | PERF-2 |
| 2.8-MAN-001 | Coverage-report drift inspection (every PR review) | Manual | NFR Quality |
| 1.17-MAN-003 | Accessibility deep-dive with screen reader (NVDA / VoiceOver) — informational, beyond AA floor | Manual | Beyond AA |

**Total P3:** 4 scenarios.

---

## Execution Strategy

**Philosophy:** Run everything in PRs unless infrastructure overhead forces deferral. Sharded Playwright keeps E2E under 5 minutes; full PR sequence target <10 min to honor trainee-reproducibility budget.

**Organized by execution tier (not tool type, since v1 uses one toolchain):**

### Every PR (target <10 min total)

| Stage | What runs | Time budget |
|---|---|---|
| 1. typecheck | `tsc --noEmit` after `react-router typegen` | <30 s |
| 2. lint | ESLint flat config + Prettier + `no-waitForTimeout` rule + Gap I-1 grep | <30 s |
| 3. Vitest unit + integration with coverage | 28 unit + 16 integration scenarios; coverage gate ≥70% | <2 min |
| 4. Playwright E2E headless | 18 specs sharded across 4 workers (mobile / tablet / desktop / firefox-or-webkit) | <5 min |
| 5. axe gate | Bundled inside `accessibility.spec.ts` (no separate step) | counted in 4 |
| 6. Docker build | `docker build .` (multi-stage non-root verification) | <2 min |

Each step's failure breaks the build. Total target ~10 min. **All P0/P1/P2 functional tests run in PRs.**

### Nightly (longer-running, lower-yield-per-run)

- **Statistical performance regression:** N=20-sample runs of optimistic round-trip, backend confirm, first-load. Catch drift across PRs that single-shot Playwright assertions can't.
- **Cross-browser matrix:** Playwright projects for Chrome / Firefox / Safari (mac+iOS) / Edge × desktop+mobile. Catches browser-specific bugs not in the per-PR shard set.
- **Bundle-size budget:** Lighthouse CI regression report. Alert on regression beyond budget.

### Pre-release (one-time, closing v1 gates)

- **OWASP Top 10 review** — Story 2.11; outputs `docs/security-review.md` with documented triage.
- **5-person usability test** — Story 2.12; outputs `docs/usability-test.md`.
- **Trainee dry-run** — Story 3.5; outputs `docs/trainee-dry-run.md`. **Closing v1 gate.**

### Manual

- Color-blindness simulation (DevTools).
- Typographic rendering smoke (across OSes).
- Coverage drift inspection (every PR code review).
- Accessibility deep-dive with screen reader (informational, beyond AA floor).

---

## QA Effort Estimate

Engineering-hour ranges; AI-assisted speed reduces lower bounds, iteration may push upper:

| Priority | Count | Effort Range | Notes |
|---|---|---|---|
| **P0** | 14 | ~12–20 hours | Includes the load-bearing concurrent-rollback spec (slowest single spec, ~3–5 hrs alone) + AA gate setup + container hygiene + Gap I-1 unit |
| **P1** | 39 | ~25–40 hours | Optimistic store reducer suite, all four verbs E2E, service layer integration, designed states, responsive viewports, Toast surface, browser-key utility, Zod schemas |
| **P2** | 14 | ~6–12 hours | Reduced-motion path + sticky input + mobile-submit + hover-reveal-glyph + log-truncation + manual checks |
| **P3** | 4 | ~2–4 hours | Cross-tab race exploration + bundle-size budget + coverage drift + screen-reader deep dive |
| **Test infrastructure** (separate) | — | ~10–18 hours | Playwright config + projects per viewport + fixtures + lint rules + statistical-assertion helper + CI workflow |
| **Total v1 test discipline** | 71 | **~55–94 hours** | Spread across Epic 1 stories (cross-cutting) + Epic 2 stories (CI + gates) |

**Assumptions:**

- AI-assisted test generation (e.g., Murat-or-equivalent agent for spec scaffolding); humans iterate.
- Test infrastructure (Story 2.7) is a foundation pass before Story 1.10 dev starts.
- No team coordination overhead at this scope (single developer).

**Dependencies from other roles (n/a here — Pouya is the role):**

- N/A — single-implementer cadence; tests are co-developed with feature work.

---

## Implementation Planning Handoff

| Work item | Owner | Target milestone | Dependencies / Notes |
|---|---|---|---|
| Test infrastructure (Story 2.7 setup work) | Pouya | Before Story 1.10 dev | Playwright config, fixtures, lint rules, ESLint `no-waitForTimeout` rule, `page.route()` helpers |
| Static-analysis grep for Gap I-1 | Pouya | Before Story 1.7 service tests | CI step that fails on `ctx.principal.browserKey` direct access |
| Performance instrumentation in optimistic store | Pouya (Story 1.9) | During Story 1.9 dev | `performance.mark()` calls in dispatch path |
| `concurrent-rollback.spec.ts` design review | Pouya | Before Story 1.14 dev | Confirms test pattern (deterministic timing via `page.route()`) |
| Trainee recruit for Story 3.5 | Pouya | Pre-release | Person outside Pouya's head who can clone repo cold |

---

## Tooling & Access

| Tool / Service | Purpose | Access required | Status |
|---|---|---|---|
| Vitest | Unit + integration testing | npm dependency | Pending Story 1.1 |
| Playwright | E2E + axe wrapper | npm dependency + browser binaries | Pending Story 2.7 |
| `@axe-core/playwright` | Accessibility gate | npm dependency | Pending Story 2.7 |
| PostgreSQL 17 | Real DB for integration tests | Local install or Docker | Pending Story 2.2 |
| GitHub Actions | CI provider | GitHub repo | Pending Story 2.7 |
| Lighthouse CI | Bundle-size regression budget | npm dependency + GitHub Action | Pending Story 2.10 |

**Access requests needed:** None. All tooling is open-source and self-hosted.

---

## Interworking & Regression

**Services and components impacted:** v1 is a single deployable monolith with no external integrations. Regression scope = the full test suite per PR.

| Service / Component | Impact | Regression scope | Validation steps |
|---|---|---|---|
| `app/lib/optimistic-store.ts` | Touched by every mutation story (1.10–1.14) | All optimistic-rollback tests | Re-run unit + E2E rollback specs on every change |
| `app/middleware/request-context.ts` | Touched by every action handler | All Gap I-1 + ownership tests | Re-run static-analysis grep + Test 1.5-UNIT-001 |
| `db/schema.ts` | Touched by migration stories | All integration tests | Re-run `1.4-INT-001` migration test on every schema change |
| `app/styles/tokens.css` | Touched by visual stories | axe + manual contrast verification | Re-run accessibility spec |

**Regression test strategy:**

- All P0 + P1 tests must pass on every merge to main.
- P2 tests may have ≤5% failure tolerance with documented investigation.
- P3 tests are informational — failures don't block merge but are tracked.
- No test is muted without root-cause analysis. Quarantine = "investigate next sprint," not "ignore forever."

---

## Appendix A: Code Examples & Tagging

**Playwright tags for selective execution:**

```typescript
// e2e/concurrent-rollback.spec.ts
import { test, expect } from './fixtures';

test.describe('Concurrent rollback @P0 @TECH-1 @load-bearing', () => {
  test('mid-flight mutation B during rollback of A does not corrupt state', async ({
    page,
    forceBackendRejection,
    injectLatency,
    freshBrowserKey,
  }) => {
    await injectLatency('**/todos', 800); // POST takes 800ms
    await forceBackendRejection('**/todos', 500); // ...then rejects
    
    await page.goto('/');
    
    // Dispatch mutation A (POST add)
    const inputA = page.getByPlaceholder('Add a todo');
    await inputA.fill('first todo');
    await inputA.press('Enter');
    
    // While A is in flight, dispatch mutation B (PATCH or another POST)
    await inputA.fill('second todo'); // The route is still mocked
    await inputA.press('Enter');
    
    // Wait for both to resolve
    await page.waitForResponse((resp) => resp.url().includes('/todos') && resp.status() === 500);
    
    // Assert: both reverted; UI is consistent; no corrupt state
    await expect(page.locator('li')).toHaveCount(0); // both rolled back
    await expect(page.locator('[role="status"]')).toHaveCount(2); // two toasts
  });
});

// e2e/idempotency.spec.ts
import { test, expect } from './fixtures';

test.describe('Idempotent retry @P0 @TECH-3', () => {
  test('retry preserves payload and produces no duplicate', async ({
    page,
    forceBackendRejection,
    freshBrowserKey,
  }) => {
    let callCount = 0;
    await page.route('**/todos', async (req) => {
      callCount++;
      if (callCount === 1) {
        await req.fulfill({ status: 500, body: JSON.stringify({ ok: false, error: { code: 'INTERNAL', message: 'fail' } }) });
      } else {
        await req.continue();
      }
    });
    
    await page.goto('/');
    await page.getByPlaceholder('Add a todo').fill('persist this');
    await page.getByPlaceholder('Add a todo').press('Enter');
    
    // First attempt fails; toast appears
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
    
    // Click retry
    await page.getByRole('button', { name: /retry/i }).click();
    
    // Second attempt succeeds; toast auto-dismisses; single todo in list
    await expect(page.getByRole('button', { name: /retry/i })).toBeHidden();
    await expect(page.getByText('persist this')).toHaveCount(1);
  });
});
```

**Run by tag:**

```bash
# P0 only (must-pass, ~3 min)
npx playwright test --grep @P0

# P0 + P1 (full PR set, ~5 min)
npx playwright test --grep "@P0|@P1"

# Full regression (PR + nightly, ~10 min)
npx playwright test
```

---

## Appendix B: Knowledge Base References

- **Risk Governance** — `risk-governance.md` (scoring matrix, gate decisions)
- **Probability & Impact** — `probability-impact.md` (1-3 scale, threshold rules)
- **Test Levels Framework** — `test-levels-framework.md` (Unit/Integration/E2E selection)
- **Test Priorities Matrix** — `test-priorities-matrix.md` (P0–P3 criteria, risk mapping)
- **Test Quality DoD** — `test-quality.md` (deterministic, isolated, explicit, focused, fast)

---

**Generated by:** TEA (Test Architect) under the bmad-testarch-test-design workflow.
**Workflow version:** 4.0 (BMad v6).
**Companion document:** `test-design-architecture.md` (architectural concerns, blockers, risk mitigations).
