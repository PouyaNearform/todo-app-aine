---
stepsCompleted: ['step-01-document-discovery', 'step-02-prd-analysis', 'step-03-epic-coverage-validation', 'step-04-ux-alignment', 'step-05-epic-quality-review', 'step-06-final-assessment']
status: 'complete'
completedAt: '2026-04-29'
overallReadiness: 'READY WITH RECOMMENDED PRE-IMPLEMENTATION AMENDMENTS'
inputDocuments:
  - _bmad-output/planning-artifacts/prd.md
  - _bmad-output/planning-artifacts/architecture.md
  - _bmad-output/planning-artifacts/ux-design-specification.md
  - _bmad-output/planning-artifacts/epics.md
  - _bmad-output/planning-artifacts/ux-design-mockup.html
  - _bmad-output/planning-artifacts/product-brief-ToDo-App.md
  - _bmad-output/planning-artifacts/product-brief-ToDo-App-distillate.md
  - _bmad-output/test-artifacts/test-design/test-design-architecture.md
  - _bmad-output/test-artifacts/test-design/test-design-qa.md
  - _bmad-output/test-artifacts/test-design/ToDo-App-handoff.md
workflowType: 'implementation-readiness'
project_name: 'ToDo App'
user_name: 'Pouya'
date: '2026-04-29'
---

# Implementation Readiness Assessment Report

**Date:** 2026-04-29
**Project:** ToDo App

## Document Inventory

### Required Planning Documents (all present, all whole-file, no duplicates)

| Type | Path | Status |
|---|---|---|
| PRD | `_bmad-output/planning-artifacts/prd.md` | ✓ found, complete |
| Architecture | `_bmad-output/planning-artifacts/architecture.md` | ✓ found, complete (status `READY WITH MINOR GAPS` — Gap I-1 documented) |
| UX Design Specification | `_bmad-output/planning-artifacts/ux-design-specification.md` | ✓ found, complete |
| Epics & Stories | `_bmad-output/planning-artifacts/epics.md` | ✓ found, complete (3 epics, 34 stories) |

### Supplementary Artifacts (extra context for this readiness check)

| Type | Path | Purpose |
|---|---|---|
| Product Brief | `_bmad-output/planning-artifacts/product-brief-ToDo-App.md` + distillate | Background context (training input) |
| Visual Mockup | `_bmad-output/planning-artifacts/ux-design-mockup.html` | Visual reference for 6 canonical states |
| Test Design — Architecture | `_bmad-output/test-artifacts/test-design/test-design-architecture.md` | 24-risk register, 8 high-priority MITIGATE risks |
| Test Design — QA | `_bmad-output/test-artifacts/test-design/test-design-qa.md` | 71 test scenarios across P0–P3 |
| Test Design — Handoff | `_bmad-output/test-artifacts/test-design/ToDo-App-handoff.md` | **Recommends 8 Story acceptance-criteria amendments — must be cross-checked during this IR pass** |

### Discovery Findings

- ✓ No sharded-vs-whole conflicts.
- ✓ No missing required documents.
- ✓ All artifacts marked `status: complete` (or equivalent) in their frontmatter.
- ⚠️ The TEA handoff document recommends 8 Story acceptance-criteria amendments that haven't been applied to `epics.md` yet. This IR pass must validate whether those amendments need to land before implementation begins, or whether they can be applied per-story during dev.

## PRD Analysis

### Functional Requirements

**Total FRs: 48** across 8 capability areas. Canonical text in `prd.md`; concise list here for traceability:

**Task Capture (FR1–FR4)**
- FR1: User can create a new todo with text description of 1–256 characters.
- FR2: User can submit a new todo with a single action (no separate "save" step).
- FR3: System rejects zero-character submissions (no empty todos).
- FR4: System enforces hard 256-char limit; input does not accept char 257.

**Task Lifecycle (FR5–FR9)**
- FR5: User can mark active todo as complete.
- FR6: User can revert completed todo back to active.
- FR7: User can delete an individual todo permanently. Delete is instant, no confirmation prompt; recovery only via rollback-with-retry-toast on backend rejection.
- FR8: System assigns immutable `created_at` timestamp at todo creation.
- FR9: System rejects mutations targeting nonexistent todos via standard error path.

**Task Display (FR10–FR18)**
- FR10: User sees full list on app load — no login, no onboarding, no welcome pitch.
- FR11: User sees both active and completed todos in the same list (no filter to hide completed in v1).
- FR12: System distinguishes completed from active visually; distinction does not depend on color alone (strike-through + reduced opacity).
- FR13: User sees designed *empty* state when no todos for browser key; purely visual.
- FR14: User sees designed *loading* state during initial fetch.
- FR15: User sees designed *error* state when backend unreachable.
- FR16: User sees designed *long-list* state when many items.
- FR17: System renders todos sorted by `created_at` DESC (newest first); no grouping by status.
- FR18: System renders long descriptions with appropriate wrapping; no horizontal scroll.

**Persistence & Identity (FR19–FR24)**
- FR19: System assigns each browser opaque local key on first interaction; persists across reloads, restarts, tab close.
- FR20: System associates every todo with browser key via nullable `owner_id` field.
- FR21: System returns only todos associated with requesting browser key.
- FR22: System treats unknown browser key as fresh empty list (not error).
- FR23: System never synchronizes todo state across browsers or devices in v1.
- FR24: System persists todos durably across app restart, container restart, transient DB-connection failures.

**Optimistic UI & Error Recovery (FR25–FR30)**
- FR25: Client applies every mutation to visible UI before backend confirmation.
- FR26: On backend rejection, client rolls optimistic UI change back to prior state.
- FR27: On backend rejection, client surfaces non-blocking toast with Retry; toast does not gate other input.
- FR28: Retry re-issues original mutation with original payload (data, not just action).
- FR29: Failure of one mutation does not block other mutations.
- FR30: Successful retry auto-dismisses corresponding toast.

**Accessibility & Input (FR31–FR36)**
- FR31: User can complete every interactive task using only keyboard.
- FR32: System provides visible focus indicator on every interactive element.
- FR33: System exposes accessible label on every icon-only control.
- FR34: System announces transient errors via live region with `polite` politeness.
- FR35: System renders correctly across mobile, tablet, desktop breakpoints.
- FR36: All interactive controls on mobile meet ≥44×44 touch-target minimum.

**Architectural Seams (FR37–FR40)**
- FR37: System exposes per-request context object carrying principal identity (browser key in v1; replaceable later).
- FR38: System routes every mutating request through ownership-check stub (no-op v1, pluggable).
- FR39: System separates HTTP/transport handlers from persistence via thin service layer.
- FR40: Todo entity supports nullable `owner_id` field.

**Containerization & Deployment (FR41–FR44)**
- FR41: System ships as multi-stage Docker Compose stack with non-root containers.
- FR42: Each container exposes health check.
- FR43: Clean checkout + `docker compose up` yields healthy stack with no manual configuration.
- FR44: System defaults to private-URL / local-first deployment posture.

**Artifact-Set Capabilities (FR45–FR48)**
- FR45: Repository contains consumable artifact for every BMAD lifecycle stage.
- FR46: Repository contains "Decisions Not Made" artifact with one-line rationale per excluded feature.
- FR47: Repository contains AI Integration Log with ≥1 substantive entry per BMAD lifecycle stage.
- FR48: Repository README explains dual-purpose nature in two paragraphs.

### Non-Functional Requirements

**Total NFR categories: 8** with concrete budgets (canonical detail in `prd.md`):

- **NFR-Performance:** <100 ms p95 optimistic round-trip; <500 ms p95 backend confirm; <2 s first load; zero console errors on golden paths.
- **NFR-Reliability & Data Integrity:** persistence durability across all listed failure modes; optimistic-rollback correctness under concurrent mutation; idempotent retry; no silent failures.
- **NFR-Security & Privacy:** local-first / private-URL only; OWASP Top 10 floor with documented triage; container hygiene; no third-party telemetry SDKs.
- **NFR-Accessibility:** WCAG 2.1 Level AA — axe + keyboard walkthrough; ≥4.5:1 text contrast; ≥44×44 touch targets.
- **NFR-Scale & Capacity:** ~100 items per list, ~100 keys per deployment without degradation.
- **NFR-Quality & Maintainability:** ≥70% Vitest meaningful coverage; ≥5 Playwright E2E (incl. ≥1 optimistic-rollback under concurrent input); trainee reproducibility ≤1 focused workday.
- **NFR-Compatibility:** last 2 majors of evergreen browsers; `localStorage` + `fetch` required.
- **NFR-Usability:** ≥4/5 unaided completion in 5-person test; calm-by-default verifiable absence of streaks/badges/percentages.

### Additional Requirements

- **Project Principles:** Dual identity, tiebreaker (training clarity wins), carve-out (security/a11y/data-integrity floors), decision discipline, calm-by-default, AI Integration Log as separate publishable document.
- **Release mode:** phased (MVP → Growth → Vision per Product Scope section).
- **Open questions resolved by PRD:** delete confirmation = none (instant); sort = `created_at` desc; 256-char cap = hard limit; cross-device empty-list = purely visual.

### PRD Completeness Assessment

**Complete for implementation purposes.** All FRs mechanism-precise, all NFRs with concrete budgets and verification methods, Project Principles section codifies framing once. No structural gaps; no clarifications needed.

## Epic Coverage Validation

### Coverage Matrix Extracted from `epics.md`

The epics document provides an explicit FR Coverage Map:

| FR Range | Epic | Notes |
|---|---|---|
| FR1–4 | Epic 1 | Task Capture |
| FR5–9 | Epic 1 | Task Lifecycle |
| FR10–18 | Epic 1 | Task Display |
| FR19–24 | Epic 1 | Persistence & Identity |
| FR25–30 | Epic 1 | Optimistic UI & Recovery |
| FR31–36 | Epic 1 | Accessibility & Input |
| FR37–40 | Epic 1 | Architectural Seams |
| FR41–44 | Epic 2 | Containerization & Deployment |
| FR45 | Epic 3 | Per-stage artifacts addressable from README |
| FR46 | Epic 3 | Decisions Not Made artifact |
| FR47 | Epic 3 | AI Integration Log |
| FR48 | Epic 3 | README dual-nature explanation |

### FR-to-Story Coverage Detail

Cross-walking each FR to specific stories in `epics.md`:

| FR | Story | Status |
|---|---|---|
| FR1, FR2, FR3, FR4 | Story 1.10 (TextInput Primitive + Capture) | ✓ Covered (AC explicit) |
| FR5, FR6 | Story 1.11 (Checkbox Primitive + Toggle) | ✓ Covered (AC explicit) |
| FR7 | Story 1.12 (Delete Glyph + Delete) | ✓ Covered (AC explicit) |
| FR8 | Story 1.4 (Database Schema), Story 1.7 (listTodos service) | ✓ Covered (immutable timestamp in schema + service contract) |
| FR9 | Story 1.11, Story 1.12 (404 handling on toggle/delete) | ✓ Covered |
| FR10 | Story 1.8 (Read List End-to-End) | ✓ Covered |
| FR11 | Story 1.8 (renders all todos, no filter) | ✓ Covered |
| FR12 | Story 1.11 (strike-through + faded; color not only signal) | ✓ Covered |
| FR13, FR14, FR15, FR16 | Story 1.8 (designed states) + Story 1.16 (long-list responsive) | ✓ Covered |
| FR17 | Story 1.7 (sort by created_at DESC), Story 1.8 (renders in order) | ✓ Covered |
| FR18 | Story 1.8 (long descriptions wrap) | ✓ Covered |
| FR19 | Story 1.3 (Browser Key Utility) | ✓ Covered (AC explicit) |
| FR20 | Story 1.4 (schema with owner_id), Story 1.5 (request-context populates ownerId) | ✓ Covered |
| FR21, FR22 | Story 1.7 (listTodos filters by owner; unknown returns []) | ✓ Covered |
| FR23 | implicit (no sync code = naturally satisfied) | ✓ Covered (by absence) |
| FR24 | Story 1.4 (Postgres durability), Story 2.2 (compose with Docker volume) | ✓ Covered |
| FR25 | Story 1.9 (optimistic store), Stories 1.10/1.11/1.12 (each verb dispatches) | ✓ Covered |
| FR26 | Story 1.14 (rollback wired across mutations) | ✓ Covered |
| FR27 | Story 1.13 (Toast component), Story 1.14 (rollback wired) | ✓ Covered |
| FR28 | Story 1.14 (Retry preserves payload — data, not just action) | ✓ Covered |
| FR29 | Story 1.9 (failure of one doesn't block others) + Story 1.14 | ✓ Covered |
| FR30 | Story 1.14 (auto-dismiss on success retry) | ✓ Covered |
| FR31 | Story 1.17 (Accessibility Pass — keyboard walkthrough) | ✓ Covered |
| FR32 | Story 1.17 (visible focus indicators) | ✓ Covered |
| FR33 | Story 1.17 (ARIA labels on icon-only controls) | ✓ Covered |
| FR34 | Story 1.13 (Toast role=status + aria-live=polite) + Story 1.17 (verified) | ✓ Covered |
| FR35 | Story 1.16 (Responsive Layout — three breakpoints) | ✓ Covered |
| FR36 | Story 1.17 + cross-cutting AC on Stories 1.11, 1.12, 1.15 (44×44 hit areas) | ✓ Covered |
| FR37 | Story 1.5 (Request-Context Middleware with Gap I-1 fix) | ✓ Covered (AC explicit) |
| FR38 | Story 1.6 (Ownership-Check Stub Middleware) | ✓ Covered |
| FR39 | Story 1.7 (service layer pattern established) | ✓ Covered |
| FR40 | Story 1.4 (nullable owner_id schema column) | ✓ Covered |
| FR41 | Story 2.1 (Multi-Stage Non-Root Dockerfile) | ✓ Covered |
| FR42 | Story 2.2 (HEALTHCHECK directives in compose) | ✓ Covered |
| FR43 | Story 2.2 (clean checkout + `docker compose up`) | ✓ Covered |
| FR44 | Story 2.6 (Private-URL Deployment Posture) | ✓ Covered |
| FR45 | Story 3.1 (README artifact index) | ✓ Covered |
| FR46 | Story 3.3 (DECISIONS-NOT-MADE.md) | ✓ Covered |
| FR47 | Story 3.4 (AI-INTEGRATION-LOG.md) | ✓ Covered |
| FR48 | Story 3.1 (README two-paragraph dual-nature) | ✓ Covered |

### Coverage Statistics

- **Total PRD FRs:** 48
- **FRs covered in epics:** 48
- **Coverage percentage:** **100%**

### Missing Requirements

**None.** Every PRD FR has a traceable implementation path through one or more stories.

### NFR Coverage (cross-cutting acceptance criteria)

NFRs are correctly handled as cross-cutting acceptance criteria across stories rather than being decomposed into separate NFR-only stories. Each epic's "Cross-cutting acceptance criteria" section in `epics.md` explicitly references the relevant NFR floors:

- **Performance budgets** → Story 2.10 + cross-cutting per UI story
- **Reliability** → Story 1.14 + cross-cutting per mutation story
- **Security & Privacy** → Story 2.5 (headers), Story 2.11 (review), cross-cutting via container hygiene
- **Accessibility** → Story 1.17 dedicated + cross-cutting per UI story
- **Quality & Maintainability** → Stories 2.7–2.9 (CI + coverage + Playwright count)
- **Usability** → Story 2.12 (5-person test)
- **Compatibility** → Story 1.16 (responsive) + Story 2.7 (CI cross-browser)
- **Scale & Capacity** → no dedicated story (correctly — at v1's scope, scale concerns don't apply)

This is the correct architectural treatment of NFRs (per Epic Coverage Map's explicit note: *"NFRs are cross-cutting acceptance criteria across stories, not separate epic items"*).

## UX Alignment Assessment

### UX Document Status

✓ **Found.** `_bmad-output/planning-artifacts/ux-design-specification.md` (1,414 lines, marked `status: complete`). Plus the visual mockup HTML at `ux-design-mockup.html`.

### UX ↔ PRD Alignment

| UX Element | PRD Anchor | Alignment |
|---|---|---|
| Sam (focused individual) persona | PRD User Journeys → Primary User journeys (3) | ✓ Same character, same backstory |
| Jordan (trainee) persona | PRD User Journeys → Secondary Stakeholder | ✓ Same character |
| Calm-by-default emotional brief | PRD Project Principles → Calm by default; Executive Summary → What Makes This Special | ✓ UX expands the *stance* into emotional design principles |
| Refused patterns catalog (16 entries) | PRD Decisions Not Made discipline | ✓ UX extends the discipline into UX-specific refusals |
| 256-char cap, instant delete, `created_at` desc sort, purely-visual empty state | PRD Open Questions resolved | ✓ All four resolutions match |
| Vintage System 7 visual language | PRD doesn't prescribe a visual language (correctly defers) | ✓ UX layers visual identity on top without conflict |
| Designed states (empty/loading/error/long-list) | PRD FR13–FR16 | ✓ UX provides full layout decisions per state |
| Touch target ≥44×44, AA contrast, keyboard walkthrough | PRD NFR-Accessibility | ✓ UX specifies the *how* of the AA floor |

**No misalignments found.** UX requirements are correctly grounded in or derive from PRD requirements; UX adds visual/interaction specificity without contradicting PRD constraints.

### UX ↔ Architecture Alignment

| UX Element | Architecture Anchor | Alignment |
|---|---|---|
| Custom token-driven mini-system (~25 tokens, 5 primitives) | Architecture Frontend Architecture → vanilla CSS with CSS Modules | ✓ UX *is* the design-system layer the architecture chose |
| Hand-rolled optimistic store (~100–200 LOC, useReducer + Context) | Architecture Frontend → State management: hand-rolled optimistic store on React primitives | ✓ Identical match |
| Toast component (System 7 alert chrome, `role="status"`, `aria-live="polite"`, slide-in motion, no auto-dismiss) | Architecture API & Communication → discriminated-union envelope; Architecture Implementation Patterns → Process Patterns / Toast surface | ✓ UX visual chrome layered on architectural envelope contract |
| Three-breakpoint responsive (mobile-first base ≤640 / tablet 641–1024 / desktop ≥1025) | Architecture Web Application Specific Requirements → Responsive Design (same three breakpoints) | ✓ Identical match |
| Inverted-block focus indicator (full ListItem accent on focus) | Architecture NFR Accessibility → "visible focus indicator on every interactive element" | ✓ UX provides specific inverted-block pattern; architecture provides the AA-floor requirement; aligned |
| Charter / Iowan Old Style / Palatino body font stack | Architecture defers font specifics to UX (correctly) | ✓ UX fills in without conflict |
| No third-party UI libraries (Tailwind, MUI, Chakra rejected) | Architecture explicitly rejected the same libraries | ✓ Identical match |
| `prefers-reduced-motion: reduce` collapses transitions | Architecture references via NFR Accessibility floor | ✓ UX specifies behavior; architecture references; aligned |

**No misalignments found.** UX and Architecture are tightly coupled by intent — both choose vanilla CSS Modules + hand-rolled optimistic store + no third-party UI deps + the same breakpoints. This is a strength of the planning sequence (Architecture → UX), not luck.

### UX ↔ Test Design Alignment (bonus cross-check)

The TEA test design references UX-specific surfaces:

| UX Element | Test Design Coverage | Alignment |
|---|---|---|
| Three responsive breakpoints | Test Design Playwright projects per viewport (375 / 768 / 1280 px) | ✓ Test design implements UX breakpoints as test projects |
| `prefers-reduced-motion` behavior | Test Design Test 1.17-E2E-002 (reduced-motion E2E) | ✓ |
| Color-not-the-only-signal | Test Design axe gate (Test 1.17-E2E-001) + Manual color-blindness sim (Test 1.17-MAN-002) | ✓ |
| Toast slide-in / non-blocking / live region | Test Design Test 1.13-E2E-* + 1.14-E2E-* | ✓ |
| 6 canonical UI states | Test Design 1.17-E2E-001 axe scan covers all 6 | ✓ |
| Mobile capture-submit affordance | Test Design Test 1.15-E2E-001 | ✓ |

**No alignment gaps.** UX → Test Design traceability is complete.

### Warnings

**None.** No missing UX documentation; no UX requirements unsupported by architecture; no architecture decisions that contradict UX intent. The UX layer is fully aligned with PRD and Architecture.

## Epic Quality Review

### Epic Structure Validation

#### Epic 1 — Use Your List (the running app)

- **User-value focus:** ✓ "Sam can capture, see, complete, and clear personal tasks." The product's entire user-facing value compressed into one epic.
- **Independence:** ✓ Standalone. Produces a working `npm run dev` deliverable; no future-epic features needed.
- **Story count:** 17 stories, all single-dev-session sized (~15 min – 3 hr each).
- **No technical-milestone red flags:** Story 1.1 is project init (the architecture's first implementation priority — correctly framed); other stories deliver user-value increments (read list → capture → toggle → delete → optimistic recovery → states → a11y).

#### Epic 2 — Container & Quality Gates

- **User-value focus:** ✓ "Operator can run `docker compose up` and trust the deliverable" — value to the operator audience and (transitively) to the trainee audience.
- **Independence:** ✓ Builds atop Epic 1 source (backward dependency, OK). Doesn't require Epic 3 features.
- **Story count:** 12 stories.
- **One sequencing observation worth flagging** (Major below).

#### Epic 3 — Artifact-Set & Training Identity

- **User-value focus:** ✓ "Trainees, instructors, reviewers consume the BMAD artifact set per the dual-identity contract." Training audience is first-class per Project Principles.
- **Independence:** ✓ Builds atop Epics 1+2; no future-epic features required.
- **Story count:** 5 stories.
- **No technical-milestone red flags.** All stories produce consumable repository artifacts.

### Story Quality Assessment

#### Story Sizing

All 34 stories are single-dev-session sized with the following caveats:

- **Story 1.14 (Wire Optimistic Rollback)** is on the larger side because the `concurrent-rollback.spec.ts` is the project's most complex single test (~3–5 hr per TEA estimate). Manageable as one story by separating test design (TEA-recommended pattern) from test implementation.
- **Story 2.11 (Security Review)** and **Story 2.12 (5-Person Usability Test)** are multi-hour-to-multi-day gates with logistics overhead (recruitment, scheduling). Acceptable as single stories because they're closing gates, not in-flight implementation.

No stories are oversized to the point of needing decomposition.

#### Within-Epic Dependency Audit

I audited every story's dependency on previous stories within its epic:

| Epic | Dependency chain | Forward deps? |
|---|---|---|
| Epic 1 | 1.1 → 1.2/1.3 → 1.4 → 1.5 → 1.6 → 1.7 → 1.8 → 1.9 → 1.10 → 1.11 → 1.12 → 1.13 → 1.14 → 1.15 → 1.16 → 1.17 | ✗ None |
| Epic 2 | 2.1 → 2.2 → 2.6; 2.3/2.4/2.5 parallel after 2.1; 2.7 needs 2.1–2.6 + Epic 1; 2.8/2.9/2.10/2.11/2.12 are closing gates after 2.7 | ✗ None within Epic 2; cross-epic backward deps OK |
| Epic 3 | 3.1/3.2/3.3/3.4 parallel-safe (independent docs); 3.5 needs all of Epic 1+2 + 3.1–3.4 | ✗ None |

**No forward dependencies found.** Every story builds only on previous stories within its epic (or completed stories from earlier epics).

#### Database / Entity Creation Timing

✓ **Correct.** Story 1.4 creates *only* the `todos` table (the only entity in v1) when first needed by Story 1.7's service layer. No "create all tables upfront" anti-pattern.

#### Starter Template Story

✓ **Correct.** Architecture specifies `npx create-react-router@latest todo-app` as the first implementation priority; Story 1.1 *is* this command. Includes scaffolding, TypeScript strict mode, path aliases, git init.

#### Acceptance Criteria Quality

All 34 stories use **Given/When/Then** format. Most ACs are explicitly testable. The TEA test design provides per-story test traceability (71 scenarios mapped). However, **8 specific AC amendments are recommended** by the TEA handoff (see Major Issues below) — these represent gaps where the current AC implies a behavior but doesn't enforce its mechanism.

### Findings by Severity

#### 🔴 Critical Violations

**None.** No technical-milestone epics, no forward dependencies, no impossible stories, no missing user-value framing.

#### 🟠 Major Issues (6 — all from TEA handoff cross-check + 1 sequencing observation)

**M-1: Story 1.4 lacks explicit CI migration test AC.**
Without this, DATA-4 risk (migration failure on deployment, score 6) is unmitigated.
**Fix:** Add to Story 1.4 AC: *"CI step spins up fresh Postgres 17 container, runs all migrations from `0001_init.sql` onward, asserts schema state — column types, nullability of `owner_id`, presence of `idx_todos_owner_id_created_at` index. Test 1.4-INT-001."*

**M-2: Stories 1.10–1.17 lack `data-testid` attribute discipline.**
Without stable selectors, E2E specs become fragile (selector drift breaks tests on every CSS change).
**Fix:** Add cross-cutting AC: *"All interactive elements expose stable `data-testid` attributes per the TEA handoff document's Data-TestId Requirements table."*

**M-3: Story 1.14 doesn't constrain test pattern to `page.route()` deterministic timing.**
Without this constraint, implementer may use `waitForTimeout` and produce flaky `concurrent-rollback.spec.ts` (OPS-3 risk, score 6).
**Fix:** Strengthen Story 1.14 AC: *"`concurrent-rollback.spec.ts` uses Playwright `page.route()` to inject deterministic 800 ms latency on POST `/todos`; dispatches a second mutation while the first is in flight; asserts no UI corruption after both resolve. Zero `waitForTimeout` calls anywhere in the spec."*

**M-4: Story 2.7 lacks explicit lint-rule + grep AC.**
Without these enforcement mechanisms, OPS-3 (test flakiness) and TECH-2 (Gap I-1) mitigations are unenforced — a developer can introduce `waitForTimeout` or `ctx.principal.browserKey` and the build won't catch it.
**Fix:** Add to Story 2.7 AC: *"ESLint flat-config rule `no-restricted-syntax` flags any `waitForTimeout` call in `e2e/**`. CI step `grep -r 'ctx.principal.browserKey' app/services/` fails build on match. Test fixture `e2e/fixtures.ts` exports `forceBackendRejection`, `injectLatency`, `freshBrowserKey`, `statisticalAssert` helpers."*

**M-5: Story 2.10 doesn't specify statistical assertions.**
Without N-sample p95 assertions, perf budgets become flaky (single-shot timing depends on CI runner variance).
**Fix:** Strengthen Story 2.10 AC: *"Performance assertions are statistical — N=20 samples per metric, assert p95 against budget. `statisticalAssert(samples, 95, threshold)` helper in `e2e/fixtures.ts`."*

**M-6: Story 2.7's test-infrastructure portion is a prerequisite for Epic 1 stories' testing, not a closing-CI item.**
Currently Story 2.7's AC reads as a single closing-CI story. But test fixtures (`forceBackendRejection`, `injectLatency`) and the `no-waitForTimeout` lint rule are needed *before* Story 1.10's Add E2E test can be written cleanly. If Story 2.7 is sequenced after Story 1.17, the early Epic 1 stories will have to use less-disciplined test patterns or the test code will be retrofitted later.
**Fix (option A):** Split Story 2.7 into 2.7a (test infrastructure — must precede Story 1.10) and 2.7b (CI workflow — closing). Or **(option B):** Add explicit AC to Story 2.7: *"Test infrastructure components (fixtures, lint rules) are foundation work that may be implemented before Epic 2 begins; CI workflow is the closing piece."* The TEA handoff already implies option B; making it explicit avoids confusion.

#### 🟡 Minor Concerns (3)

**m-1: Story 1.5 lacks explicit CI grep AC for Gap I-1 enforcement.**
Story 1.5 says "Gap I-1 fix applied," which is the design intent, but doesn't enforce it via static analysis. The TEA handoff recommends adding the CI grep step.
**Fix:** Add to Story 1.5 AC: *"CI step runs `grep -r 'ctx.principal.browserKey' app/services/` and fails build on any match."*

**m-2: Story 1.6 lacks explicit invocation-pattern test AC.**
Story 1.6 says "every action calls `checkOwnership(ctx, resourceOwnerId)` before invoking the service layer," but doesn't enforce this via test. The TEA handoff recommends a Vitest middleware test.
**Fix:** Add to Story 1.6 AC: *"Vitest middleware test asserts `checkOwnership(ctx, resourceOwnerId)` is called before any service-layer invocation in every action handler."*

**m-3: Story 3.3 doesn't include the two-tab race condition in DECISIONS-NOT-MADE.**
DATA-2 (two-tab race, score 4 MONITOR) is documented in test design but should be in the customer-facing artifact too.
**Fix:** Add to Story 3.3 AC: *"Includes the two-tab race condition (DATA-2) as a documented v1 limitation: 'Two browser tabs sharing the same browser key produce last-write-wins behavior; v1 accepts this; future sync module would resolve.'"*

### Best Practices Compliance Checklist

| Standard | Result |
|---|---|
| Each epic delivers user value (not technical milestone) | ✓ All 3 epics |
| Each epic functions independently (within its dependency tier) | ✓ All 3 epics |
| Stories appropriately sized | ✓ 32 of 34 are clean single-dev-session; 2 (1.14, 2.11/2.12) are larger but justified |
| No forward dependencies | ✓ All 34 stories |
| Database tables created when needed (not upfront) | ✓ Only `todos` table, in Story 1.4 when service layer needs it |
| Clear acceptance criteria (Given/When/Then) | ✓ All 34 stories; **6 stories need AC strengthening per Major issues above** |
| Traceability to FRs maintained | ✓ 100% FR coverage map (48/48); each story explicitly references the FRs it implements |
| Starter-template story present | ✓ Story 1.1 |

### Quality Assessment Summary

The epic-and-story breakdown is **structurally sound** with **no critical violations**. Six major issues + three minor concerns are surfaced — all are *AC strengthening* items from the TEA handoff cross-check (and one sequencing observation about Story 2.7). None require structural restructuring of epics or stories; all can be addressed via explicit AC additions to the existing 34 stories.

**Estimated effort to apply all 9 amendments:** ~30 minutes of editing `epics.md`. Strongly recommend applying upfront before story execution begins, rather than per-story during dev — these amendments prevent 6 major risks from manifesting (test flakiness, migration regressions, Gap I-1 drift, perf-budget noise, fragile selectors, unenforced calm-by-default discipline).

## Summary and Recommendations

### Overall Readiness Status

**READY WITH RECOMMENDED PRE-IMPLEMENTATION AMENDMENTS.**

The PRD, Architecture, UX Design, Epics & Stories, and Test Design are *structurally complete and internally aligned*. No critical violations. No restructuring required. 100% FR coverage across the 48 PRD FRs. Cross-document alignment (PRD ↔ Architecture ↔ UX ↔ Epics ↔ Test Design) holds.

The single qualifier is: **9 acceptance-criteria amendments** (6 major + 3 minor) are recommended before story execution begins. These amendments prevent specific failure modes that would otherwise surface during implementation as flaky tests, fragile selectors, undisciplined patterns, or unenforced contract guarantees. Each amendment is a few sentences of AC text; total editing effort ~30 minutes.

### Cross-Document Alignment Summary

| Alignment surface | Result |
|---|---|
| PRD FRs ↔ Epic stories | 48/48 covered (100%) |
| PRD NFRs ↔ Story acceptance criteria (cross-cutting) | 8/8 NFR categories addressed |
| UX requirements ↔ PRD constraints | Fully aligned, no contradictions |
| UX requirements ↔ Architecture decisions | Fully aligned (vanilla CSS Modules + hand-rolled optimistic store + same breakpoints) |
| UX requirements ↔ Test Design coverage | Fully aligned (per-viewport projects + axe + reduced-motion + state-component coverage) |
| Architecture seams ↔ Epic 1 stories | All four seams (FR37–40) implemented across Stories 1.4–1.7; Gap I-1 fix codified in Story 1.5 AC |
| Test Design risks ↔ Story acceptance criteria | 16 of 24 risks have direct story coverage; remaining 8 are documented (lower-score) |

### Critical Issues Requiring Immediate Action

**None.** No critical violations were identified. This is a structurally sound plan.

### Major Issues (6) — Recommended to Address Before Implementation

All six are TEA-handoff-recommended acceptance-criteria amendments. Apply during a brief `epics.md` edit pass (~30 min total):

1. **M-1 (Story 1.4):** Add CI migration test AC. *Mitigates DATA-4 risk score 6.*
2. **M-2 (Stories 1.10–1.17):** Add cross-cutting `data-testid` attribute discipline. *Prevents fragile E2E selectors.*
3. **M-3 (Story 1.14):** Constrain `concurrent-rollback.spec.ts` to `page.route()` deterministic timing; zero `waitForTimeout`. *Mitigates OPS-3 score 6.*
4. **M-4 (Story 2.7):** Add ESLint `no-waitForTimeout` rule, Gap I-1 grep CI step, fixture helpers in AC. *Enforces TECH-2 + OPS-3 mitigations.*
5. **M-5 (Story 2.10):** Specify statistical assertions (N=20 samples, p95). *Prevents flaky perf budgets.*
6. **M-6 (Story 2.7 sequencing):** Document that test-infrastructure portion is foundation work usable before Epic 2 begins. *Prevents Story 2.7 from blocking Epic 1 testing rigor.*

### Minor Concerns (3) — Recommended to Address; Not Blocking

7. **m-1 (Story 1.5):** Add CI grep step for Gap I-1 enforcement.
8. **m-2 (Story 1.6):** Add Vitest middleware test for ownership-check invocation pattern.
9. **m-3 (Story 3.3):** Include two-tab race condition in DECISIONS-NOT-MADE.md.

### Recommended Next Steps

1. **Apply the 9 acceptance-criteria amendments to `epics.md`** (estimated ~30 minutes) — either via a quick manual edit pass, or via `/bmad-edit-prd` if you want a workflow-driven approach. The TEA handoff document has the exact amendment text for each.

2. **Begin Story 1.1 (Project Initialization).** Run `npx create-react-router@latest todo-app`. This is the architecture's first implementation priority and Story 1.1's exact command.

3. **Implement Story 2.7's test-infrastructure portion in parallel with Stories 1.1–1.9** (foundation stories that don't yet need Playwright). Land Story 2.7's fixtures + lint rules *before* Story 1.10 dev starts so the early E2E specs can be disciplined from the start.

4. **Maintain the AI Integration Log per BMAD lifecycle stage** as you implement (Story 3.4). Each implementation story should produce an entry: prompt(s) used, output excerpts, human-edit summary. This is a load-bearing first-class artifact, not an afterthought.

5. **Honor the closing v1 gate (Story 3.5 Trainee Dry-Run)** — v1 does NOT ship until a real trainee (not the original developer) reproduces v1 in ≤1 focused workday with no instructor intervention. If a trainee gets stuck, fix the artifact set *before* declaring v1 shipped.

### Path Forward

You have two options:

- **(A) Apply the 9 amendments now, then proceed.** Recommended. ~30 min editing; establishes test-discipline foundations before any code is written. Risk reduction is meaningful (5 of 6 major issues are about test-discipline that's much harder to retrofit than to encode upfront).
- **(B) Proceed as-is, apply amendments per-story during dev.** Acceptable but riskier. Each per-story amendment costs 2–5 min in context; cumulative effort similar but harder to keep consistent. Possible to forget. Not recommended given the trainee-reproducibility hypothesis at stake.

### Final Note

This assessment identified **9 issues across 2 categories** (6 major + 3 minor). All are *acceptance-criteria amendments* to existing stories — no structural restructuring of epics or stories is needed. The PRD, Architecture, UX Design, and Test Design layers are tightly aligned and internally consistent. The plan is ready for implementation pending the recommended amendments.

**Confidence level: HIGH.** The dual-purpose v1 (real product + canonical AINE BMAD training reference) has a coherent, mechanism-precise plan with verifiable closing gates (trainee dry-run, 5-person usability test, OWASP review, axe gate, performance budgets, ≥70% coverage, ≥5 Playwright incl. concurrent-rollback). The riskiest assumption from the PRD (do the four seams earn their training-identity tax under concurrent rollback?) is specifically tested by the load-bearing P0 spec.

**Assessor:** John (PM) under the bmad-check-implementation-readiness workflow.
**Date:** 2026-04-29.
