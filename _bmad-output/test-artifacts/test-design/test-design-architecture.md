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
  - _bmad-output/planning-artifacts/ux-design-mockup.html
---

# Test Design for Architecture: ToDo App v1

**Purpose:** Architectural concerns, testability gaps, and NFR requirements that frame the test plan. Serves as the contract between Test Architecture and Implementation on what must be addressed before tests can be written.

**Date:** 2026-04-29
**Author:** Murat (Test Architect, AI-assisted)
**Status:** System-level test design complete; ready for story execution
**Project:** ToDo App
**PRD Reference:** `_bmad-output/planning-artifacts/prd.md`
**Architecture Reference:** `_bmad-output/planning-artifacts/architecture.md`
**UX Reference:** `_bmad-output/planning-artifacts/ux-design-specification.md`
**Epics & Stories Reference:** `_bmad-output/planning-artifacts/epics.md`

---

## Executive Summary

**Scope.** Full v1 of ToDo App — single-screen, full-stack web application with four verbs (add, see, complete, delete), three-field todo entity, per-browser per-deployment persistence via opaque local key, optimistic UI with explicit rollback. Dual-purpose v1: real personal todo product **and** canonical AINE BMAD training reference.

**Business context (from PRD):**
- **Product hypothesis:** for the focused individual, a deliberately-refused-features todo app feels *calmer* than incumbents (Apple Reminders, Todoist, etc.).
- **Training hypothesis:** a small-but-complete artifact set lets a trainee reproduce v1 in ≤1 focused workday.
- **Both audiences are first-class** per Project Principles. Tiebreaker on conflict: training clarity wins. Non-negotiable floors: security, accessibility, data integrity.

**Architecture highlights (from architecture.md):**
- **Stack:** TypeScript end-to-end + React Router 7 (Framework Mode) + Drizzle ORM + PostgreSQL 17 + Node 22 LTS + Vitest + Playwright + Zod + pino + CSS Modules + Docker Compose multi-stage non-root.
- **Four architectural seams** paid for by the training identity: (1) request-context object carrying the principal, (2) ownership-check stub middleware, (3) thin service layer between transport and persistence, (4) nullable `owner_id` column on the todo entity.
- **Architecture Gap I-1 — must apply during request-context wiring:** name the principal field semantically — `ctx.ownerId` + tagged-union `principal: { kind: 'browser-key', browserKey } | { kind: 'user', userId }` — *not* `ctx.browserKey` directly. Service code consumes `ctx.ownerId`; future auth modules only change the middleware.

**Expected scale:**
- ~100 items per list, ~100 keys per deployment. Single-user, single-list, single-screen.
- No horizontal scaling needed; no multi-tenancy; no real-time sync.

**Risk Summary:**
- **Total risks identified:** 24
- **High-priority (score ≥6):** 8 risks requiring active mitigation
- **No score-9 BLOCK risks.** The PRD's load-bearing assumption (concurrent-rollback under the seams) lands at score 6 MITIGATE — architecture's idempotency contract and Gap I-1 fix already shaped probability down from "Likely" to "Possible."
- **Test effort:** ~71 atomic test scenarios across 4 levels; ~55–94 engineering hours total (interleaved with story execution, not phase-end).

---

## Quick Guide

### 🚨 BLOCKERS — Implementation Prerequisites (Must Resolve Before Test Development)

**Pre-implementation critical path** — these MUST be addressed before tests for Stories 1.5+ can be written:

1. **Gap I-1 — Semantic seam naming applied during request-context wiring** — Story 1.5 must use `ctx.ownerId` + tagged-union `principal`. Service code in subsequent stories *must not* reference `ctx.principal.browserKey` directly. Owner: implementer of Story 1.5; verified by **Test 1.5-UNIT-001** before merging Story 1.5.
2. **Idempotency contract — Client-UUID generation + `INSERT ... ON CONFLICT (id) DO NOTHING`** — Story 1.10 (Add E2E) must generate UUIDs client-side; Story 1.7 (createTodo service) must use `ON CONFLICT DO NOTHING`. Verified by **Test 1.7-INT-002** before merging Story 1.10.
3. **Real Postgres test database** — Integration tests need a real Postgres (no mocked DB per architecture). Story 2.2 (Compose stack) provides this for CI; local dev needs a Postgres test DB available before Story 1.7 service tests can be written. Owner: Story 2.3 env config; document `DATABASE_TEST_URL`.
4. **Performance instrumentation** — Client code must emit `performance.mark()`/`performance.measure()` around dispatch → render so Playwright can read the 100 ms p95 budget via `page.evaluate(() => performance.getEntriesByName(...))`. Owner: Story 1.9 (optimistic store implementation).
5. **`page.route()` testing pattern documented** — Tests TECH-1 (concurrent rollback) and TECH-3 (rollback retry) need deterministic backend-rejection injection via Playwright `page.route()`. Pattern must be documented in a shared fixture before Story 1.14 testing starts. Owner: Test infrastructure (Story 2.7 CI scaffolding setup).

**What's needed to unblock:** Items 1–5 are part of stories already in the plan; this lists them as a pre-test-development checklist so they don't get deferred until QA-time.

---

### ⚠️ HIGH PRIORITY — Validate Before Test Authoring

1. **TECH-1 (concurrent rollback)** — Recommendation: implement `concurrent-rollback.spec.ts` first among E2E specs after the optimistic store lands (Story 1.14). The spec design uses Playwright `page.route()` to inject deterministic 800 ms latency on a POST while another mutation dispatches in parallel, then asserts UI state after both resolve. Approve the spec design before Story 1.14 dev starts.
2. **TECH-2 (Gap I-1 seam naming)** — Recommendation: a Vitest unit test asserts the *consumption pattern* — `ctx.ownerId` is what services read. Approve the test approach: it could be a runtime assertion on a sample service call, *or* a static-analysis check (grep for `ctx.principal.browserKey`). The static check is cheaper and more reliable; recommend that approach.
3. **OPS-3 (test flakiness on rollback timing)** — Recommendation: zero `waitForTimeout` in any test. Use `page.waitForResponse()`, `page.waitForFunction()`, or response interception. Statistical assertions (N=20 samples) for any p95 budget; never single-shot.

---

### 📋 INFO ONLY — Solutions Provided

1. **Test strategy:** 28 Unit / 16 Integration / 18 E2E / 9 Manual = 71 scenarios. Inverted pyramid is *appropriate* here because v1 has minimal pure logic to unit-test (the optimistic store reducer is the bulk of unit coverage); the integration band needs real Postgres for service-layer correctness; E2E covers the user-facing contract end-to-end.
2. **Tooling:** Vitest (unit + integration), Playwright (E2E + axe), `@axe-core/playwright` (a11y gate), Drizzle (parameterized queries by design), pino (log assertions). No Pact, no third-party SDK mocking.
3. **Tiered CI/CD:** **Per-PR** sequence (target <10 min): typecheck → lint → vitest+coverage → Playwright headless 18 specs sharded → axe (in spec) → docker build. **Nightly:** statistical performance regression, cross-browser matrix, bundle-size budget. **Pre-release:** OWASP Top 10 review, 5-person usability test, trainee dry-run.
4. **Coverage:** ~71 test scenarios prioritized P0–P3 with risk-based classification. P0 = 14, P1 = 39, P2 = 14, P3 = 4.
5. **Quality gates:** P0 = 100%, P1 ≥ 95%, coverage ≥ 70% meaningful, axe = 0 violations, perf budgets met, container hygiene clean. Trainee dry-run ≤1 workday is the closing v1 gate.

---

## For Architects and Devs — Open Topics 👷

### Risk Assessment

**Total risks identified:** 24 (8 high-priority score ≥6, 7 medium score 4–5, 9 low score 1–3, 0 critical score 9)

#### High-Priority Risks (Score ≥6) — Immediate Attention

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner | Timeline |
|---|---|---|---|---|---|---|---|---|
| **TECH-1** | TECH | Optimistic-rollback corruption under concurrent mutations | 2 | 3 | **6** | Dedicated `concurrent-rollback.spec.ts` (Test 1.14-E2E-001) with deterministic `page.route()` timing injection | Story 1.14 implementer | Before v1 ship |
| **TECH-2** | TECH | Seam-design failure (request-context bends under auth, violating Gap I-1) | 2 | 3 | **6** | Vitest unit test (Test 1.5-UNIT-001) asserts `ctx.ownerId` consumption pattern; static-analysis grep for `ctx.principal.browserKey` direct access | Story 1.5 implementer | Before merging Story 1.5 |
| **TECH-3** | TECH | Idempotency violation on retry (duplicate todos / double-toggle) | 2 | 3 | **6** | Integration test (Test 1.7-INT-002) re-issues same payload, asserts single row; client-UUID generation in Story 1.10 AC; `INSERT ... ON CONFLICT` in Story 1.7 AC | Stories 1.7 + 1.10 | Before Story 1.10 merge |
| **SEC-4** | SEC | Public-internet exposure without security pass | 2 | 3 | **6** | Story 2.6 README explicit warning + no automated public-deployment config; Test 2.6-MAN-001 verifies README content | Story 2.6 implementer | Pre-release |
| **DATA-4** | DATA | Migration failure on deployment (drizzle-kit fails on edge schema state) | 2 | 3 | **6** | CI step: spin up fresh Postgres, run all migrations from `0001_init.sql`, assert schema state (Test 1.4-INT-001) | Stories 1.4 + 2.7 | Before Story 1.4 merge |
| **BUS-2** | BUS | Trainee fails to reproduce v1 in ≤1 workday | 2 | 3 | **6** | Story 3.5 (Trainee Dry-Run Verification); failure invalidates v1 release until artifact set is fixed (Test 3.5-MAN-001) | Story 3.5 | Pre-release closing gate |
| **OPS-1** | OPS | `docker compose up` from clean checkout fails | 2 | 3 | **6** | Story 2.2 health checks; CI step: clone to fresh runner → `docker compose up` → assert app healthy within 30s | Story 2.2 + CI | Story 2.7 |
| **OPS-3** | OPS | Test flakiness on optimistic-rollback timing | 3 | 2 | **6** | Deterministic `page.route()` for forced delays (zero `waitForTimeout`); statistical assertions across N=20 samples; max 1 auto-retry per spec then quarantine | Test infrastructure | Story 2.7 |

#### Medium-Priority Risks (Score 3–5)

| Risk ID | Category | Description | Probability | Impact | Score | Mitigation | Owner |
|---|---|---|---|---|---|---|---|
| SEC-1 | SEC | Browser-key leakage in logs | 2 | 2 | 4 | pino logs truncate `browserKey` to 8 chars (Story 2.4 AC); integration test asserts truncation | Story 2.4 |
| SEC-3 | SEC | CSRF on state-changing actions | 2 | 2 | 4 | Same-origin policy + custom `X-Browser-Key` header (cross-origin form posts can't send custom headers without CORS preflight, which fails since CORS is same-origin only); integration test asserts requests without the header are rejected | Story 1.5 + Story 2.5 |
| PERF-1 | PERF | Optimistic UI round-trip exceeds 100 ms p95 | 2 | 2 | 4 | Statistical Playwright assertion (N=20 samples) per Story 2.10; bundle-size budget via Lighthouse CI | Story 2.10 |
| DATA-2 | DATA | Two-tab race condition (same browser key) | 2 | 2 | 4 | v1 accepts last-write-wins; document in DECISIONS-NOT-MADE.md as a known limitation | Story 3.3 |
| BUS-1 | BUS | Calm-by-default broken by accidental urgency mechanic | 2 | 2 | 4 | DECISIONS-NOT-MADE.md catalogs every refused pattern; QA checklist verifies *absence* of streak/badge/percentage/celebratory mechanics | Story 3.3 + per-release QA |
| BUS-3 | BUS | Usability test < 3/5 calmer-alternative response | 2 | 2 | 4 | Story 2.12 explicit; failing this only invalidates the *product* hypothesis, not the *training* hypothesis | Story 2.12 |
| OPS-2 | OPS | CI gate sequence too slow (>10 min) | 2 | 2 | 4 | Sharded Playwright parallelization; selective re-runs on diff in CI; quarantine slow specs | Story 2.7 |

#### Low-Priority Risks (Score 1–3)

| Risk ID | Category | Description | Probability | Impact | Score | Action |
|---|---|---|---|---|---|---|
| TECH-4 | TECH | localStorage corruption / unavailability (private/incognito modes) | 1 | 2 | 2 | DOCUMENT — modern browsers reliable; private mode degrades gracefully |
| SEC-2 | SEC | SQL injection | 1 | 3 | 3 | DOCUMENT — Drizzle parameterizes by design; structural impossibility |
| SEC-5 | SEC | Container running as root | 1 | 3 | 3 | DOCUMENT — Dockerfile specifies `USER node`; CI verifies via `docker inspect` (Test 2.1-INT-001) |
| SEC-6 | SEC | Third-party SDK supply-chain attack | 1 | 3 | 3 | DOCUMENT — no third-party SDKs in v1 by architectural decision |
| PERF-2 | PERF | First-load >2 s | 2 | 1 | 2 | DOCUMENT — bundle-size budget catches regressions |
| PERF-3 | PERF | Backend confirm >500 ms p95 under realistic load | 2 | 1 | 2 | DOCUMENT — at v1 scale (~100 items, ~100 keys), this isn't a real risk |
| PERF-4 | PERF | Long-list rendering performance degradation | 1 | 1 | 1 | DOCUMENT — ~100 items below virtualization threshold |
| DATA-1 | DATA | Persistence durability breakage on container restart | 1 | 3 | 3 | DOCUMENT — Postgres + Docker volume; verified by `persistence.spec.ts` |
| DATA-3 | DATA | Browser-key UUID v4 collision | 1 | 3 | 3 | DOCUMENT — astronomically improbable (≈2⁻¹²² for two random keys to collide) |

#### Risk Category Legend

- **TECH** — Technical / Architecture (correctness, integration, scalability)
- **SEC** — Security (access controls, data exposure, supply chain)
- **PERF** — Performance (latency budgets, resource use)
- **DATA** — Data integrity (durability, consistency, race conditions)
- **BUS** — Business / UX (calm-by-default discipline, usability, training-identity hypothesis)
- **OPS** — Operations (deployment, CI, flakiness)

---

### Testability Concerns and Architectural Gaps

**🚨 ACTIONABLE CONCERNS**

These are testability gaps the architecture should address. Most are already designed into the architecture (and so are *FYI*); a few require specific testing-pattern decisions before Story 1.14 dev starts.

#### 1. Blockers to Fast Feedback

| Concern | Impact on testing | What architecture/implementation must provide | Owner | Timeline |
|---|---|---|---|---|
| **No backend-rejection injection mechanism** | Cannot deterministically test optimistic-rollback paths | Use Playwright `page.route()` to intercept and respond with rejection envelope; **no test-only middleware in the app code** | Test infrastructure | Story 2.7 (before Story 1.14 dev) |
| **No client-side performance instrumentation** | Cannot read 100 ms p95 budget from outside the browser | Add `performance.mark('optimistic-dispatch')` and `performance.mark('optimistic-rendered')` in optimistic-store dispatch path; expose via `performance.measure()` | Story 1.9 (optimistic store) | Before Story 2.10 (perf budget verification) |
| **No DB isolation contract under parallel tests** | Tests pollute each other's `todos` rows | Per-test unique `owner_id` (browser-key UUID); no shared test fixtures | Test infrastructure | Before Story 1.7 service tests |

#### 2. Architectural Improvements Made Already

These were addressed during the architecture phase, but worth restating for testability traceability:

1. **Idempotency by design (TECH-3 mitigation)**
   - **Decision:** Client-generated UUIDs + `INSERT ... ON CONFLICT (id) DO NOTHING`.
   - **Why this matters for tests:** retried mutations are safe to assert in tests without state pollution. Test code can fire the same payload twice, assert single row, with no special teardown.

2. **Gap I-1 — Semantic seam naming (TECH-2 mitigation)**
   - **Decision:** `ctx.ownerId` + tagged-union `principal` shape.
   - **Why this matters for tests:** Test 1.5-UNIT-001 can assert the *consumption pattern* by static analysis (grep) — far cheaper than a runtime test, and catches regressions every PR.

3. **Discriminated-union envelope (TECH-* mitigation)**
   - **Decision:** Every action returns `{ ok: true, data: T } | { ok: false, error: { code, message, fieldErrors? } }`.
   - **Why this matters for tests:** mock construction is trivial; assertion patterns are uniform across all mutation tests; TypeScript narrowing carries through.

---

### Testability Assessment Summary

**📊 CURRENT STATE — FYI**

#### What Works Well

- ✅ **Hand-rolled optimistic store is fully unit-testable** (pure reducer). No mocking framework required.
- ✅ **No third-party SDKs to mock** — calm-by-default is also test-discipline-by-default.
- ✅ **Drizzle parameterized queries make SQL injection structurally impossible**; tests don't need to enumerate injection payloads.
- ✅ **Single-screen single-route product** keeps Playwright spec count manageable.
- ✅ **Real Postgres in container for integration tests** — no in-memory SQLite vs production-Postgres divergence.
- ✅ **Vite + Vitest tightly integrated** — coverage instrumentation, watch mode, parallel execution work without configuration overhead.
- ✅ **pino structured JSON logs are stable** for assertions (parse JSON, assert fields).
- ✅ **Storage-state-based browser-key seeding** is trivially reset per-test via Playwright fixtures.
- ✅ **Idempotency by design** — client-UUID + `ON CONFLICT` makes retries safe to test repeatedly.
- ✅ **Architecture's CI gate sequence already specified** — typecheck → lint → vitest → playwright → axe → docker build.

#### Accepted Trade-offs (No Action Required)

For v1, the following trade-offs are acceptable:

- **No production observability beyond logs** (no Sentry, Datadog, etc.) — calm-by-default + no third-party SDKs. Burden shifts to tests to catch what RUM would otherwise reveal. Acceptable at v1's private-URL scope; revisit when public exposure is added in a successor module.
- **No Pact / contract testing** — no microservices, no external API contracts. Single-deployable monolith.
- **No load testing** (k6, Artillery) — at ~100 items/list and ~100 keys/deployment, scale concerns don't apply. Performance budgets enforce single-request latency, which is the only meaningful metric at this scope.
- **No visual-regression testing** — vintage-Mac-System-7 design is intentionally restrained; visual regressions are caught by component tests asserting CSS rule presence + manual review.
- **Manual color-blindness verification** — Playwright doesn't simulate color-blindness directly; axe-core enforces the structural rule (color is never the only signal). Manual verification documented as a checklist.

These are deliberate Phase-1 decisions. They will be revisited as the BMAD pathway adds successor modules (auth, multi-user, public deployment, AI features).

---

### Risk Mitigation Plans (High-Priority Risks ≥6)

**Purpose:** Detailed mitigation strategies for the 8 high-priority risks. These risks MUST be addressed before v1 release.

#### TECH-1: Optimistic-rollback corruption under concurrent mutations (Score: 6) — HIGH

**Mitigation Strategy:**

1. Implement Test 1.14-E2E-001 (`concurrent-rollback.spec.ts`) using deterministic Playwright `page.route()` timing injection.
2. Test pattern: dispatch mutation A (POST /todos), inject 800 ms server delay via `page.route()`, dispatch mutation B (PATCH) before A's rejection arrives. Assert: A reverts cleanly, B's optimistic state holds, no UI corruption, both `pendingMutations` cleared correctly.
3. Run on every PR (part of standard E2E suite); promote to required CI gate.

**Owner:** Story 1.14 implementer (test author and reviewer roles).
**Timeline:** Test must exist and pass before Story 1.14 merges.
**Status:** Planned.
**Verification:** Test passes on the PR that introduces the optimistic store + Toast wire-up. Failure blocks merge.

#### TECH-2: Seam-design failure (Gap I-1 violation) (Score: 6) — HIGH

**Mitigation Strategy:**

1. Implement Test 1.5-UNIT-001 — Vitest unit test asserts `RequestContext` shape (tagged-union `principal`, derived `ownerId`).
2. Add a static-analysis check to CI: grep all files under `app/services/` for `ctx.principal.browserKey` direct access. Any match fails the build.
3. Code review checklist for Story 1.5 + every story under `app/services/`.

**Owner:** Story 1.5 implementer + CI maintainer.
**Timeline:** Static-analysis check exists before Story 1.7 (first service test).
**Status:** Planned.
**Verification:** Test 1.5-UNIT-001 + grep CI step pass.

#### TECH-3: Idempotency violation on retry (Score: 6) — HIGH

**Mitigation Strategy:**

1. Story 1.10 (Add E2E) AC: client generates UUID via `crypto.randomUUID()` before dispatch.
2. Story 1.7 (createTodo service) AC: SQL is `INSERT ... ON CONFLICT (id) DO NOTHING`.
3. Test 1.7-INT-002: integration test fires the same payload twice, asserts a single row in Postgres.
4. Test 1.14-E2E-002: end-to-end retry test asserts no duplicate UI state.

**Owner:** Stories 1.7 + 1.10 implementers.
**Timeline:** Test passes before Story 1.10 merges.
**Status:** Planned.
**Verification:** Tests 1.7-INT-002 + 1.14-E2E-002 green.

#### SEC-4: Public-internet exposure without security pass (Score: 6) — HIGH

**Mitigation Strategy:**

1. Story 2.6 README "Deployment" section explicitly warns against public exposure.
2. `docker-compose.yaml` includes a commented-out `proxy` service (Caddy/nginx) example for TLS termination; warning above it: *"Adding the proxy publishes the app. Use a private network, VPN, or Tailscale tailnet — never `0.0.0.0`."*
3. No automatic public-internet deployment configuration anywhere in the repo.
4. Test 2.6-MAN-001 verifies README content; checklist item before v1 declared shipped.

**Owner:** Story 2.6 implementer + reviewer.
**Timeline:** Pre-release.
**Status:** Planned.
**Verification:** Manual review of README + `docker-compose.yaml`.

#### DATA-4: Migration failure on deployment (Score: 6) — HIGH

**Mitigation Strategy:**

1. Test 1.4-INT-001 — CI step spins up fresh Postgres, runs all migrations from `0001_init.sql` onward, asserts schema state (column types, nullability, indexes).
2. Test runs on every PR.
3. New migrations require this test to pass before merge.

**Owner:** Stories 1.4 + 2.7 implementers.
**Timeline:** Test passes before Story 1.4 merges.
**Status:** Planned.
**Verification:** Test 1.4-INT-001 green on a fresh-Postgres CI runner.

#### BUS-2: Trainee fails to reproduce v1 in ≤1 workday (Score: 6) — HIGH

**Mitigation Strategy:**

1. Story 3.5 (Trainee Dry-Run Verification) is the closing v1 gate.
2. A real trainee — *not the original developer* — clones the repo, follows the artifact set (README → brief → PRD → architecture → UX → epics → stories → AI Integration Log), runs `docker compose up`, runs `pnpm test:e2e`, achieves green build + passing E2E within ≤1 focused workday with no instructor intervention.
3. Friction points encountered are documented and become future improvements; if the trainee gets stuck, the artifact set is fixed *before* v1 declared shipped.

**Owner:** Story 3.5 implementer (Pouya recruits a real trainee).
**Timeline:** Pre-release closing gate.
**Status:** Planned.
**Verification:** Test 3.5-MAN-001 — `docs/trainee-dry-run.md` documents the path and time spent.

#### OPS-1: `docker compose up` from clean checkout fails (Score: 6) — HIGH

**Mitigation Strategy:**

1. Story 2.2 implements `docker-compose.yaml` with health checks per service, `depends_on: condition: service_healthy` for `web → db`.
2. CI step in Story 2.7: fresh GitHub Actions runner, `git clone`, `docker compose up`, assert health-check passes within 30 seconds.
3. Trainee dry-run (Story 3.5) is the closing validation.

**Owner:** Stories 2.2 + 2.7.
**Timeline:** Test passes before Story 2.2 merges.
**Status:** Planned.
**Verification:** CI step green on fresh runner.

#### OPS-3: Test flakiness on optimistic-rollback timing (Score: 6) — HIGH

**Mitigation Strategy:**

1. ESLint rule: `no-restricted-syntax` for `waitForTimeout` calls in `e2e/` directory. Fail build on any usage.
2. All timing-sensitive tests use Playwright `page.waitForResponse()`, `page.waitForFunction()`, or `page.route()` with deterministic latency injection.
3. Statistical assertions for any p95 budget (N=20 samples).
4. CI policy: max 1 auto-retry per spec; if a spec fails twice, it's quarantined with mandatory investigation (no muting without root-cause).

**Owner:** Test infrastructure (Story 2.7) + every test author.
**Timeline:** ESLint rule exists before Story 1.14 (first timing-sensitive E2E).
**Status:** Planned.
**Verification:** Lint passes; quarantine policy documented in `CONVENTIONS.md`.

---

### Assumptions and Dependencies

#### Assumptions

1. **Postgres 17 is reachable in dev** — either via local install or `docker compose up db`. Stories 1.4 onward assume DB connectivity.
2. **Single-developer cadence** — Pouya is the implementer for v1, with AI assistance. Time estimates assume one focused worker, not a team.
3. **No auth in v1** — all references to "future auth module" are post-v1. The architecture's seams support it; the test plan does not.
4. **Trainee for Story 3.5 is recruitable** — someone outside Pouya's head who can clone the repo and follow the artifacts cold.
5. **GitHub Actions is the CI provider** — Story 2.7 assumes this. If a different provider is used, Story 2.7 acceptance criteria adapt without affecting the test design.

#### Dependencies

1. **PostgreSQL 17 image (`postgres:17-alpine`)** — needed before Story 1.4. Available from Docker Hub.
2. **Node 22 LTS image (`node:22-alpine`)** — needed before Story 2.1. Available from Docker Hub.
3. **`@axe-core/playwright`** — needed before Story 1.17 (a11y pass). Available from npm.
4. **A real trainee for Story 3.5** — pre-release; recruitment timeline TBD.

#### Risks to the Test Plan Itself

- **Risk:** Test infrastructure setup (Story 2.7) is unfamiliar to the implementer; the Playwright config + projects per viewport + fixtures + statistical-assertion helper may take longer than estimated.
  - **Impact:** Test development for Stories 1.10–1.17 blocks until infrastructure lands.
  - **Contingency:** Begin test infrastructure work *in parallel* with Stories 1.1–1.9 (foundation stories that don't yet need Playwright). Land Story 2.7's infrastructure before Story 1.10 starts.
- **Risk:** `concurrent-rollback.spec.ts` (Test 1.14-E2E-001) is genuinely hard to write — concurrent timing tests are notoriously flaky.
  - **Impact:** OPS-3 mitigation may require multiple iterations.
  - **Contingency:** Design the spec via incremental steps — first assert the basic rollback works deterministically, then layer the concurrency. Use `page.route()` to enforce timing precisely; avoid any reliance on real-time latency variability.

---

**End of Architecture Document**

**Next Steps for Architecture / Implementation:**

1. Review the Quick Guide (🚨/⚠️/📋) and acknowledge the 5 pre-implementation prerequisites.
2. Confirm assumptions and dependencies; surface any conflicts.
3. Approve the testing patterns: `page.route()` for backend-rejection injection; client-side `performance.mark()` for budget assertions; static-analysis grep for Gap I-1 enforcement.
4. Sign off on the risk mitigation plans for the 8 high-priority risks.

**Next Steps for Test Authoring (Step 5b — companion QA doc):**

1. See `test-design-qa.md` for the test execution recipe — atomic test scenarios, priorities, entry/exit criteria, effort estimates.
2. Begin test infrastructure setup (Story 2.7) as a foundation pass before Story 1.10 dev starts.
3. Pair test development with feature development per story (cross-cutting, not phase-end).
