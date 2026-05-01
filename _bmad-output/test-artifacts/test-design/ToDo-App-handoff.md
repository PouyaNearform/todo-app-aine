---
title: 'TEA Test Design → BMAD Handoff Document'
version: '1.0'
workflowType: 'testarch-test-design-handoff'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics.md
sourceWorkflow: 'testarch-test-design'
generatedBy: 'TEA Master Test Architect (Murat, AI-assisted)'
generatedAt: '2026-04-29'
projectName: 'ToDo App'
---

# TEA → BMAD Integration Handoff

## Purpose

This document bridges TEA's test design outputs with BMAD's epic/story decomposition. It provides structured integration guidance so that quality requirements, risk assessments, and test strategies flow into implementation planning *before* dev work begins.

**Note:** For ToDo App, the BMAD epics & stories already exist (`epics.md`, 34 stories). This handoff document validates that the existing stories cover the test-driving requirements identified by TEA, and surfaces any per-story acceptance criteria that should be added or strengthened before implementation begins.

## TEA Artifacts Inventory

| Artifact | Path | BMAD Integration Point |
|---|---|---|
| **Test Design — Architecture** | `_bmad-output/test-artifacts/test-design/test-design-architecture.md` | Risk register, testability gaps, architectural mitigations — informs Story-level acceptance criteria |
| **Test Design — QA** | `_bmad-output/test-artifacts/test-design/test-design-qa.md` | 71 test scenarios with priorities; entry/exit criteria; effort estimates |
| **Risk Assessment** | (embedded in test-design-architecture.md) | 24 risks across TECH/SEC/PERF/DATA/BUS/OPS; 8 high-priority requiring active mitigation |
| **Coverage Strategy** | (embedded in test-design-qa.md) | P0/P1/P2/P3 priorities; PR/nightly/pre-release execution tiers |

## Epic-Level Integration Guidance

### Risk References per Epic

#### Epic 1 — Use Your List (the running app)

**Risks owned by this epic (must be mitigated within Epic 1 stories):**

- **TECH-1** (concurrent rollback) → Story 1.14 (Wire optimistic rollback) must include the `concurrent-rollback.spec.ts` E2E (Test 1.14-E2E-001).
- **TECH-2** (Gap I-1 seam naming) → Story 1.5 (Request-Context Middleware) must include Test 1.5-UNIT-001 + CI grep static check.
- **TECH-3** (idempotency on retry) → Stories 1.7 + 1.10 must implement client-UUID + `INSERT ... ON CONFLICT`; Test 1.7-INT-002 (DB-level) and Test 1.14-E2E-002 (UI-level) verify.
- **DATA-4** (migration failure) → Story 1.4 (Schema & Migration) must include Test 1.4-INT-001 — fresh-Postgres migration + schema-state assertion.

**Quality gates for Epic 1:**

- All P0 unit tests (1.5-UNIT-001, 1.6-UNIT-001) pass before Story 1.5 / Story 1.6 merge.
- All P0 integration tests (1.4-INT-001, 1.7-INT-001, 1.7-INT-002) pass before respective story merge.
- All P0 E2E tests (1.10-E2E-001, 1.14-E2E-001, 1.14-E2E-002, 1.8-E2E-001, 1.17-E2E-001) pass before Story 1.17 (a11y pass) closes the epic.

#### Epic 2 — Container & Quality Gates

**Risks owned by this epic:**

- **SEC-4** (public-internet exposure) → Story 2.6 must include Test 2.6-MAN-001 README warning verification.
- **OPS-1** (clean-checkout boot fails) → Story 2.2 must include health-check verification (Test 2.2-INT-001 in CI).
- **OPS-3** (test flakiness) → Story 2.7 must include ESLint `no-waitForTimeout` rule + statistical-assertion helper in fixtures.
- **ASR-6** (container hygiene) → Story 2.1 must include Test 2.1-INT-001 — `docker inspect` confirms `User: node`, no `latest` tags.

**Quality gates for Epic 2:**

- CI gate sequence (typecheck → lint → vitest+coverage → playwright → axe → docker) green on every PR before any Epic 2 story merges.
- Performance budgets (Test 2.10-MAN-001) verified statistically across N=20 samples.
- Story 2.11 (security review) and Story 2.12 (usability test) closing manual gates pre-release.

#### Epic 3 — Artifact-Set & Training Identity

**Risks owned by this epic:**

- **BUS-2** (trainee dry-run failure) → Story 3.5 is the closing v1 gate. v1 does NOT ship until trainee dry-run passes.

**Quality gates for Epic 3:**

- Story 3.1 (README), 3.2 (CONVENTIONS), 3.3 (DECISIONS-NOT-MADE), 3.4 (AI-INTEGRATION-LOG) all complete before Story 3.5.
- Story 3.5 is the *closing v1 gate*. If trainee gets stuck, fix the artifact set before declaring v1 shipped.

---

## Story-Level Integration Guidance

### P0 / P1 Test Scenarios → Story Acceptance Criteria

These TEA-identified test scenarios should appear as explicit acceptance criteria on the matching story. **The current Story acceptance criteria already capture most of these** — TEA-side review confirms coverage; gaps flagged below.

| Test ID | Scenario | Story | AC coverage status |
|---|---|---|---|
| **1.5-UNIT-001** | `RequestContext` semantic shape (Gap I-1) | Story 1.5 | ✅ Story 1.5 AC explicitly says "service code consumes `ctx.ownerId` (never `ctx.principal.browserKey` directly) — Gap I-1 fix applied." Add: "Static-analysis grep step in CI fails on direct access." |
| **1.6-UNIT-001** | `checkOwnership` invocation discipline | Story 1.6 | ✅ Story 1.6 AC says "every action in the codebase calls `checkOwnership(ctx, resourceOwnerId)` before invoking the service layer." TEA recommends: add a Vitest unit test that asserts this invocation pattern. |
| **1.4-INT-001** | Migration applies to fresh Postgres | Story 1.4 | ⚠️ Add to Story 1.4 AC: "CI step spins up fresh Postgres, runs `0001_init.sql` onward, asserts schema state (column types, nullability, `idx_todos_owner_id_created_at` index)." |
| **1.7-INT-002** | Idempotent `INSERT ... ON CONFLICT` | Story 1.7 | ✅ Implicit in Story 1.7 AC; TEA recommends making explicit: "integration test fires same payload twice, asserts single row." |
| **1.10-E2E-001** | Happy-path capture E2E | Story 1.10 | ✅ Story 1.10 AC implies this; add: "Playwright `happy-path.spec.ts` covers add → see → field clears + stays focused." |
| **1.14-E2E-001** | Concurrent-rollback (load-bearing) | Story 1.14 | ⚠️ **CRITICAL ADDITION:** Story 1.14 AC must explicitly require `concurrent-rollback.spec.ts` with `page.route()` deterministic timing. Currently Story 1.14 mentions "concurrent-rollback.spec.ts" but acceptance criterion should be explicit: "Spec uses `page.route()` to inject 800 ms latency on POST while another mutation dispatches; asserts no UI corruption." |
| **1.14-E2E-002** | Retry preserves payload | Story 1.14 | ✅ Story 1.14 AC covers; recommend strengthening: "Retry button re-issues the *original UUID* (idempotency); Toast auto-dismisses on success." |
| **1.8-E2E-001** | Persistence durability | Story 1.8 | ✅ Story 1.8 AC implies; TEA recommends: "`persistence.spec.ts` covers refresh / browser restart / tab close / container restart with data preserved." |
| **1.17-E2E-001** | axe zero violations | Story 1.17 | ✅ Story 1.17 AC explicit. |
| **1.17-MAN-001** | Keyboard-only walkthrough | Story 1.17 | ✅ Story 1.17 AC explicit (`docs/keyboard-walkthrough.md`). |
| **2.1-INT-001** | Container `User: node` | Story 2.1 | ✅ Story 2.1 AC includes "`docker inspect` confirms non-root." |
| **2.6-MAN-001** | README deployment warning | Story 2.6 | ✅ Story 2.6 AC explicit. |
| **3.5-MAN-001** | Trainee dry-run ≤1 workday | Story 3.5 | ✅ Story 3.5 AC explicit. |

**TEA recommends amending the following Story acceptance criteria before implementation:**

1. **Story 1.4** — Add explicit "CI migration test" acceptance criterion (Test 1.4-INT-001).
2. **Story 1.14** — Strengthen the `concurrent-rollback.spec.ts` requirement to specify `page.route()` deterministic timing pattern (avoid implementer improvising with `waitForTimeout`).
3. **Story 2.7** — Add explicit "ESLint `no-waitForTimeout` rule + Gap I-1 grep CI step" acceptance criterion.

### Data-TestId Requirements

For UI testability, TEA recommends the following `data-testid` attributes (or equivalent stable selectors). These should be added during component implementation to support deterministic E2E selectors. Avoid Playwright `getByText()` for things that may be translated or restyled; reserve `data-testid` for explicit test handles.

| Component | data-testid | Used by tests |
|---|---|---|
| `TextInput` | `data-testid="todo-input"` | 1.10-E2E-*, 1.14-E2E-*, 1.15-E2E-001 |
| `Checkbox` (per row) | `data-testid="todo-checkbox-${id}"` | 1.11-E2E-*, 1.12-E2E-002 |
| `ListItem` (per row) | `data-testid="todo-item-${id}"` | 1.11-E2E-*, 1.16-E2E-001 |
| Delete glyph (per row) | `data-testid="todo-delete-${id}"` | 1.12-E2E-* |
| `Toast` container | `data-testid="toast"` (ARIA `role="status"` is also a selector) | 1.13-E2E-*, 1.14-E2E-* |
| Toast Retry button | `data-testid="toast-retry"` | 1.14-E2E-002 |
| `EmptyState` | `data-testid="empty-state"` | 1.13-E2E-001 |
| `LoadingState` | `data-testid="loading-state"` | 1.13-E2E-002 |
| `ErrorState` | `data-testid="error-state"` | 1.13-E2E-003 |
| ErrorState Retry button | `data-testid="error-retry"` | 1.13-E2E-003 |

**Recommend updating Story 1.10–1.17 acceptance criteria** to include "data-testid attributes per the test-design handoff document" so implementers don't need to discover this from tests after the fact.

---

## Risk-to-Story Mapping

| Risk ID | Category | P×I = Score | Recommended Story / Epic | Test Level |
|---|---|---|---|---|
| **TECH-1** Concurrent-rollback corruption | TECH | 2×3=6 | Story 1.14 (Epic 1) | E2E |
| **TECH-2** Seam-design failure (Gap I-1) | TECH | 2×3=6 | Story 1.5 (Epic 1) | Unit + CI grep |
| **TECH-3** Idempotency on retry | TECH | 2×3=6 | Stories 1.7 + 1.10 + 1.14 (Epic 1) | Integration + E2E |
| **TECH-4** localStorage corruption | TECH | 1×2=2 | (documented) | n/a |
| **SEC-1** Browser-key in logs | SEC | 2×2=4 | Story 2.4 (Epic 2) | Unit + Integration |
| **SEC-2** SQL injection | SEC | 1×3=3 | (documented; Drizzle structurally prevents) | n/a |
| **SEC-3** CSRF | SEC | 2×2=4 | Stories 1.5 + 2.5 (Epic 1+2) | Integration |
| **SEC-4** Public-internet exposure | SEC | 2×3=6 | Story 2.6 (Epic 2) | Manual |
| **SEC-5** Container as root | SEC | 1×3=3 | Story 2.1 (Epic 2) | Integration (CI) |
| **SEC-6** Third-party SDK supply chain | SEC | 1×3=3 | (documented; no SDKs in v1) | n/a |
| **PERF-1** Optimistic round-trip >100 ms p95 | PERF | 2×2=4 | Story 2.10 (Epic 2) | E2E (statistical) |
| **PERF-2** First-load >2 s | PERF | 2×1=2 | (documented; bundle-size budget) | E2E (Lighthouse CI) |
| **PERF-3** Backend confirm >500 ms | PERF | 2×1=2 | (documented; not relevant at scale) | n/a |
| **PERF-4** Long-list rendering | PERF | 1×1=1 | (documented) | n/a |
| **DATA-1** Persistence durability | DATA | 1×3=3 | Story 1.8 (Epic 1) | E2E |
| **DATA-2** Two-tab race | DATA | 2×2=4 | Story 3.3 (Epic 3) | (documented + manual exploration) |
| **DATA-3** UUID collision | DATA | 1×3=3 | (documented) | n/a |
| **DATA-4** Migration failure | DATA | 2×3=6 | Story 1.4 (Epic 1) | Integration (CI) |
| **BUS-1** Calm-by-default broken | BUS | 2×2=4 | Story 3.3 + per-release QA | Manual checklist |
| **BUS-2** Trainee fails ≤1 workday | BUS | 2×3=6 | Story 3.5 (Epic 3) | Manual (closing gate) |
| **BUS-3** Usability test < 3/5 | BUS | 2×2=4 | Story 2.12 (Epic 2) | Manual |
| **OPS-1** Clean-checkout boot fails | OPS | 2×3=6 | Stories 2.2 + 2.7 (Epic 2) | Integration (CI) |
| **OPS-2** CI too slow | OPS | 2×2=4 | Story 2.7 (Epic 2) | CI metrics |
| **OPS-3** Test flakiness | OPS | 3×2=6 | Story 2.7 (Epic 2) | ESLint + statistical assertions (cross-cutting) |

---

## Recommended BMAD → TEA Workflow Sequence

For ToDo App, the sequence is:

1. **TEA Test Design** (this workflow) → produces this handoff document.
2. **BMAD Create Epics & Stories** (already complete) → 34 stories already exist; this handoff validates coverage and recommends amendments above.
3. **BMAD Implementation Readiness Check** (next: `IR`) → cross-check PRD ↔ Architecture ↔ UX ↔ Epics ↔ Test Design for misalignment.
4. **TEA ATDD** (`AT`, optional) → generate failing acceptance test scaffolds for P0/P1 scenarios before implementation.
5. **BMAD Implementation** (per-story dev work) → implement stories with test-first guidance.
6. **TEA Automate** (`TA`, optional) → expand test suite during/after implementation.
7. **TEA Trace** (`TR`, optional) → validate coverage completeness; gate decision per requirement.

Items in italics are optional add-ons; the core sequence for ToDo App's solo implementation cadence is: **Test Design → IR check → Story implementation (with test-first per story) → CI gates → trainee dry-run → ship**.

## Phase Transition Quality Gates

| From Phase | To Phase | Gate Criteria |
|---|---|---|
| Test Design | Implementation Readiness Check | All P0 risks have mitigation strategy mapped to specific stories ✓ — confirmed in this handoff |
| Implementation Readiness Check | Implementation | PRD ↔ Architecture ↔ UX ↔ Epics ↔ Test Design alignment confirmed; no critical gaps |
| Implementation | CI Green | All P0 + P1 tests passing per PR; coverage ≥70%; axe zero; performance budgets met |
| CI Green | Pre-release Validation | Story 2.11 (security review), 2.12 (usability test), 3.5 (trainee dry-run) closing gates |
| Pre-release Validation | v1 Release | All closing gates pass; no critical risk OPEN; trainee dry-run completes within ≤1 focused workday |

---

## TEA-Recommended Story Acceptance Criteria Amendments

Summary list of changes recommended to existing stories before implementation begins. These are *additions*, not replacements, of existing AC.

1. **Story 1.4** (Database Schema & Initial Migration)
   - **Add AC:** "CI step (`drizzle-migration-test.yml` or part of main `ci.yml`) spins up fresh Postgres 17 container, runs all migrations from `0001_init.sql` onward, asserts schema state — column types, nullability of `owner_id`, presence of `idx_todos_owner_id_created_at` index. Test 1.4-INT-001."

2. **Story 1.5** (Request-Context Middleware with Gap I-1)
   - **Add AC:** "CI step runs `grep -r 'ctx.principal.browserKey' app/services/` and fails the build on any match. Static enforcement of Gap I-1 semantic-naming discipline."

3. **Story 1.6** (Ownership-Check Stub Middleware)
   - **Add AC:** "Vitest middleware test asserts `checkOwnership(ctx, resourceOwnerId)` is called before any service-layer invocation in every action handler."

4. **Story 1.10** through **1.17** (UI components)
   - **Add cross-cutting AC:** "All interactive elements expose stable `data-testid` attributes per the TEA handoff document's Data-TestId Requirements table."

5. **Story 1.14** (Wire Optimistic Rollback)
   - **Strengthen AC:** "`concurrent-rollback.spec.ts` uses Playwright `page.route()` to inject deterministic 800 ms latency on POST `/todos`; dispatches a second mutation while the first is in flight; asserts no UI corruption after both resolve. **Zero `waitForTimeout` calls** anywhere in the spec."

6. **Story 2.7** (GitHub Actions CI Pipeline)
   - **Add AC:** "ESLint flat-config rule `no-restricted-syntax` flags any `waitForTimeout` call in `e2e/**`. Lint failure breaks build."
   - **Add AC:** "CI step runs `grep -r 'ctx.principal.browserKey' app/services/` and fails build on match."
   - **Add AC:** "Test fixture `e2e/fixtures.ts` exports `forceBackendRejection`, `injectLatency`, `freshBrowserKey`, and `statisticalAssert` helpers per TEA-recommended pattern."

7. **Story 2.10** (Performance Budget Verification)
   - **Strengthen AC:** "Performance assertions are statistical — N=20 samples per metric, assert p95 against budget. `statisticalAssert(samples, 95, threshold)` helper in `e2e/fixtures.ts`."

8. **Story 3.3** (DECISIONS-NOT-MADE.md)
   - **Add AC:** "Includes the two-tab race condition (DATA-2) as a documented v1 limitation: 'Two browser tabs sharing the same browser key produce last-write-wins behavior; v1 accepts this; future sync module would resolve.'"

These amendments should be applied during the next `bmad-edit-prd` or directly during story implementation; no separate amendment workflow is required at this scope.

---

## Open Questions / Assumptions

1. **GitHub Actions assumption** — Story 2.7 assumes GitHub Actions. If a different CI is used, all CI-step references in this handoff adapt to that provider's syntax without affecting the test design substance.
2. **Trainee for Story 3.5** — Pouya recruits a real trainee. If finding a trainee proves difficult, the next-best alternative is *cold-restart simulation*: Pouya wipes their local environment, clones the repo fresh, and follows the artifact set with a 1-day timer. Less rigorous but better than nothing.
3. **Cross-browser Playwright projects** — Per-PR shard set runs Chromium only; nightly run covers Firefox + WebKit. Justification: browser-specific bugs are uncommon in standard React + RR7 + CSS Modules; nightly catches them without per-PR cost.
4. **Performance instrumentation in client code** — Story 1.9 is the right place to add `performance.mark()` calls. If the implementer prefers a different observation method, document the choice and ensure Playwright can read it via `page.evaluate()`.

---

**End of Handoff Document.**

This handoff is referenced from:

- **From:** `test-design-architecture.md`, `test-design-qa.md`, `epics.md` (recommended amendments)
- **To:** `bmad-check-implementation-readiness` workflow (next: `IR`)
