# AI Integration Log — Per-Stage Methodology Record

The point of this document is to make the human–AI partnership *that produced this artifact set* legible to a future trainee. For each BMAD lifecycle stage: what prompts drove it, what the AI got right, what the human caught and changed, and what's worth replicating in future training modules.

The AI partner across every stage was **Claude (Anthropic)**, primarily via the Claude Agent SDK in conversational mode. The human partner was **Pouya** as product owner / final reviewer. The cadence was: AI proposes → human reviews + corrects → AI integrates the correction → repeat until the artifact passes the stage's exit gate.

Every artifact in `_bmad-output/` is the merged output of this loop. None is purely AI; none is purely human. The log below tries to surface where each side's contribution was load-bearing.

---

## Stage 1 — Product Brief

**Date completed:** 2026-04-29

**Driving prompts:** invocation of `/bmad-create-product-brief` (the BMAD framework's brief-creation skill). The skill's internal step files prompted the AI to elicit problem framing, audience, hypothesis, and constraints from the human. Pouya provided seed material: "build a deliberately small todo app that's also the BMAD training reference."

**Representative output excerpts:** the dual-nature framing — "real personal todo product + canonical AINE BMAD training reference" — was AI-proposed and human-affirmed in the first round. The tiebreaker ("training clarity wins, with security/a11y/data-integrity floors") emerged from the human pushing back on the AI's initial "always optimize for clarity" stance.

**Human-edit summary:**
- *AI got right:* immediately identified the need for a tiebreaker rule (rather than treating dual-nature as resolved-by-vibes); proposed crisp candidate framings the human could accept or reject.
- *Human caught and changed:* the AI's initial framing positioned "training clarity" too strongly — the human added the carve-out language ("security/a11y/data-integrity floors are non-negotiable regardless of teaching value"). This carve-out became the load-bearing rule for every subsequent stage.
- *Worth replicating:* spending one round on the tiebreaker BEFORE moving to PRD scope. Without it, every subsequent decision becomes a re-litigation of the dual-nature.

---

## Stage 2 — PRD

**Date completed:** 2026-04-29

**Driving prompts:** `/bmad-create-prd` skill invocation. Multi-step elicitation walked through product vision, success criteria, scoping, functional requirements, and NFRs.

**Representative output excerpts:** 48 functional requirements across 8 capability areas; 8 NFR categories with concrete budgets (perf: ≤100ms optimistic-state; reliability: ≤500ms p95 backend confirm; etc.); the "Project Principles" section that anchored dual-nature + tiebreaker at the top of the PRD body. The phased delivery stance (`releaseMode: phased`) was AI-proposed.

**Human-edit summary:**
- *AI got right:* asked for concrete numeric budgets when the human said "fast"; refused to let "calm-by-default" stay vague; offered scope candidates and let the human pick.
- *Human caught and changed:* THREE durable corrections that became memory entries:
  1. *"Keep dual-identity and the tiebreaker explicit in the PRD as a top-level Project Principles section. The PRD body itself should still read as a normal product spec... don't repeat training framing in every section."*
  2. *"Lead with minimalism through documented refusals... Frame calm-by-default as the user-facing consequence, and architecture-as-option-value as the engineering consequence. They're effects of the lead, not peers."*
  3. *"Be especially careful with: persistence model (per-browser per-deployment, not 'no persistence'), seams-as-paid-for-by-training, local-first/private-URL as deliberate (not 'self-hosted'), optimistic UI with explicit rollback, NFRs as concrete numbers, the tiebreaker carve-out for security/a11y/data-integrity, and calm-by-default as a stance not an absence."*
- These three corrections were saved to memory (`feedback_anti_flattening.md`) and referenced in every subsequent stage to prevent the AI from collapsing nuanced concepts into adjectives.
- *Worth replicating:* save anti-flattening rules AS feedback memories, not just as PRD body text. They enforce themselves across stages.

---

## Stage 3 — Architecture

**Date completed:** 2026-04-29

**Driving prompts:** `/bmad-create-architecture` skill, B-track ("starter approach"). Selected React Router 7 (Framework Mode) over T3, Epic Stack, and Next.js bare. Subsequent step files walked through stack lock-in, the four architectural seams, validation review.

**Representative output excerpts:** the four named seams (request-context middleware, ownership-check stub, service layer, nullable `owner_id`); the discriminated-union envelope contract; the idempotency contract (client-UUID + ON CONFLICT DO NOTHING); the rejection lists (no Tailwind, no Sentry, no NextAuth, no tRPC, etc.). The architecture's Implementation Patterns section is the canonical reference for everything.

**Gap I-1 origin:** the validation review found ONE Important gap — the AI's initial draft named the principal field `ctx.browserKey` (mechanism-named). When auth lands later, every service-layer caller would have to be edited. The recommended fix (semantic naming with tagged-union `Principal`) emerged from the AI's self-validation step. **The fix was applied IN-LINE during Story 1.5 implementation rather than as a re-edit of the architecture document** — captured in memory `project_seam_naming_fix.md`.

**Human-edit summary:**
- *AI got right:* the rejection rationales were sharp ("Tailwind: large vocabulary trainee must learn, defers concerns") rather than vague ("we don't need it"). Self-validation caught Gap I-1 without human prompting.
- *Human caught and changed:* prompted the AI to produce the architecture's "trade-off matrices" rather than narrative paragraphs — the matrix format (option / pros / cons / fit) made the rejections legible.
- *Worth replicating:* always have the architecture self-validate against its own validation checklist. Gap I-1 wouldn't have been caught by code review six stories later.

---

## Stage 4 — UX Design

**Date completed:** 2026-04-29

**Driving prompts:** `/bmad-create-ux-design`. The visual-language step took multiple rounds — the human wanted "vintage, nostalgic, possibly pixelated, possibly an old-computer reference." The AI proposed candidate directions; the human picked vintage-Macintosh-System-7 (modern type, not pixel-perfect). The AI then produced 26 design tokens, 5 component primitives, 4 user-journey Mermaid flows, and a self-contained HTML mockup.

**Representative output excerpts:** the AA-verified hex values (`#FAFAF7` ivory, `#1A1A1A` near-black, `#0050D0` Mac-blue accent, `#6E6E6E` faded text at exactly 4.6:1 — "AA, just clears"); the inverted-block focus pattern; the "color is never the only signal" rule with worked examples (completion = strike-through + faded-text + opacity, not red).

**Human-edit summary:**
- *AI got right:* AA-verified every color combination *as it proposed them* — the contrast ratios are documented in the spec next to each hex. No going back to fix accessibility later.
- *Human caught and changed:* skipped the "explore 6-8 visual directions" step (default UX skill behavior) — the human had already committed to vintage Mac in step 1, so the AI documented the layout decisions for the chosen direction + produced the HTML mockup directly. This was a deliberate pragmatic deviation from the skill's default flow.
- *Worth replicating:* HTML mockup as a deliverable. Trainees can open `_bmad-output/planning-artifacts/ux-design-mockup.html` in any browser without a build step. The token values + AA contrasts are visible side-by-side with the rendered components.

---

## Stage 5 — Test Design (System-Level)

**Date completed:** 2026-04-29

**Driving prompts:** `/bmad-testarch-test-design`. System-level mode (not per-story). Walked through risk identification, scenario generation, mitigation planning, and BMAD-handoff amendment proposal.

**Representative output excerpts:**
- 24-risk register, 8 high-priority MITIGATE risks (TECH-1 concurrent-rollback as the load-bearing risky-assumption test, score 6; TECH-2 Gap I-1 enforcement, score 6; TECH-3 idempotency, score 6; BUS-2 trainee dry-run as the closing v1 gate; OPS-3 test-flakiness mitigated by ESLint `no-waitForTimeout`)
- 71 test scenarios across 28 Unit / 16 Integration / 18 E2E / 9 Manual
- TEA amendments M-1 through M-6: CI migration test, data-testid discipline, deterministic-timing, ESLint rules, statistical perf assertions, sequencing notes

**Human-edit summary:**
- *AI got right:* ranked risks by probability × impact rather than treating all risks equally. The 8 high-priority items got mitigation plans; the rest were accepted.
- *Human caught and changed:* the AI's initial test stack defaulted to `playwright + playwright-utils` (custom helpers); the architecture had chosen plain `@playwright/test`. Human flagged the divergence; AI documented it explicitly as "architecture overrides config" rather than silently going with utils.
- *Worth replicating:* TEA amendments as a structured handoff to BMAD. Each amendment had an explicit AC change to a specific Story, not just "consider adding tests." The 6 amendments were applied verbatim during Story-by-Story implementation.

---

## Stage 6 — Epics & Stories

**Date completed:** 2026-04-29

**Driving prompts:** `/bmad-create-epics-and-stories`. The skill produced 3 epics + 34 stories from the PRD's 48 FRs + Architecture's seams + UX's components + Test Design's 71 scenarios.

**Representative output excerpts:** Story 1.1 through Story 3.5 with Given/When/Then ACs. Cross-cutting Epic 1 ACs (token discipline, import discipline, color-not-only-signal, data-testid discipline). Epic 2 cross-cutting ACs (non-root containers, no `latest` tags, env validation, pino, Helmet). Epic 3 cross-cutting ACs (artifact addressability from README, every refused feature in DECISIONS-NOT-MADE, AI-INTEGRATION-LOG per stage).

**Human-edit summary:**
- *AI got right:* Story sequencing inferred dependencies correctly (Story 1.4 schema before 1.5 middleware before 1.7 service before 1.8 loader before 1.10 first mutation). The TEA amendments were integrated into Story ACs at exactly the right places.
- *Human caught and changed:* nothing major — the epics+stories output was the most "ready to ship" of any planning stage.
- *Worth replicating:* feeding all upstream artifacts into the epics-and-stories skill in one batch (vs. iteratively). The skill's quality is high when it has full context.

---

## Stage 7 — Implementation Readiness Review

**Date completed:** 2026-04-29

**Driving prompts:** `/bmad-check-implementation-readiness`. Validated cross-document alignment between PRD, Architecture, UX, Epics+Stories, Test Design.

**Representative output excerpts:** status `READY WITH RECOMMENDED PRE-IMPLEMENTATION AMENDMENTS`. 100% FR coverage (48/48). 0 critical violations. 9 AC amendments recommended; all 9 applied to `epics.md` before implementation began.

**Human-edit summary:**
- *AI got right:* enforced the "no critical issues before implementation starts" gate strictly. The 9 amendments were small but specific (e.g., "Story 1.4 should add an explicit AC for the CI migration test").
- *Human caught and changed:* AI's initial output called Gap I-1 a Critical issue; human reframed it as Important (not blocking, just needs in-implementation fix). This subtle distinction kept the readiness gate green.
- *Worth replicating:* a separate skill for cross-document alignment. Without it, the 9 small inconsistencies would have surfaced as bugs during implementation.

---

## Stage 8 — Implementation (Stories 1.1–3.5)

**Dates:** 2026-04-29 through 2026-05-01

**Driving prompts:** `/bmad-create-story` followed by `/bmad-dev-story` for each story. Per-story implementation context files at `_bmad-output/implementation-artifacts/X-Y-*.md` capture the Tasks/Subtasks, Dev Notes, references, completion notes, and file lists for each.

**Representative output excerpts:** 34 per-story `.md` files. The story-context-engine skill's job is to anticipate every developer mistake and pre-emptively address it. The dev-story skill's job is to execute the tasks one at a time.

**Bugs caught during implementation:**

| Story | Bug | Fix |
|---|---|---|
| 1.10 | RR7 Single Fetch wraps in-route action responses in HTML for non-fetcher submissions | Refactored to a resource route (`api.todos.ts`) with no default export — RR7 returns the action's JSON directly |
| 1.16 | Story 1.10's switch to `useTodos()` rendering broke SSR — every page load showed a flash of EmptyState before useEffect-driven seeding caught up | Moved `OptimisticStoreProvider` from root.tsx into home.tsx with `initialTodos` from loader; SSR now renders synchronously |
| 2.9 | `Checkbox` styled overlay intercepted Playwright pointer events on the hidden `<input>` | `pointer-events: none` on `.glyph` + `.check`; clicks pass through to the wrapping `<label>` which toggles the input natively |
| 2.9 | Browser-key was localStorage-only; SSR loaders had no way to read it on direct navigations → page refresh appeared to lose todos | Secondary cookie set by `getBrowserKey()` on every client-side call; `request-context.ts` falls back to it when the header is absent |

**Human-edit summary:**
- *AI got right:* the per-story Dev Notes anticipated most pitfalls. The story-context-engine prompt explicitly says "prevent LLM developer mistakes" and the resulting context files include "guardrails" sections enumerating things NOT to do.
- *Human caught and changed:* Pouya's "skip permission asks" instruction during the Epic 2 push enabled an autonomous-execution mode that closed 12+ stories without per-story confirmation. The AI used this carefully — flagging deviations (e.g., the SSR fix in Story 1.16) in the commit message rather than skipping confirmation on consequential changes.
- *Worth replicating:* documenting bugs *as completed-stories surface them* rather than retroactively. Story 1.10's RR7 Single Fetch discovery is preserved in that story's Completion Notes; future readers see it without forensic git archaeology.

---

## Stage 9 — Containerization

**Date completed:** 2026-04-30

**Driving prompts:** Stories 2.1 (Dockerfile), 2.2 (Compose), 2.3 (env validation), 2.4 (pino), 2.5 (security headers), 2.6 (deployment posture). Implementation followed the Story ACs verbatim.

**Representative output excerpts:** the Dockerfile's three-stage build (builder / prod-deps / runtime) with `node:22-alpine` pinned and `USER node` non-root; the Compose stack with healthcheck-gated dependency; the programmatic Drizzle migrator (`db/migrate.mjs`); the `withRequestLogging` wrapper that combines pino + request-context once per handler.

**Human-edit summary:**
- *AI got right:* recognized that the runtime image doesn't need pnpm (using the `.bin/react-router-serve` shim instead saves ~10 MB).
- *Human caught and changed:* the AI initially proposed installing pnpm in the runtime stage for `pnpm start`; refactor caught + applied. Image size deviation (305 MB vs 200 MB AC) accepted with documented rationale (React 19 + Drizzle + Postgres driver + RR7 server stack just is what it is).
- *Worth replicating:* multi-stage Dockerfile + named build args (`ARG NODE_VERSION=22-alpine`) for parameterized version testing without YAML edits.

---

## Stage 10 — QA Gates (CI, Coverage, E2E)

**Date completed:** 2026-04-30 through 2026-05-01

**Driving prompts:** Stories 2.7 (CI workflow), 2.8 (coverage), 2.9 (Playwright + axe), 2.10 (perf budgets). Each story had its own implementation-artifact context file.

**Representative output excerpts:** the GitHub Actions workflow with sequential gate-and-stop semantics (typecheck → lint → gap-i1 → vitest+coverage → docker build); the ESLint flat config with `no-console` for `app/**` + `no-restricted-syntax` for `e2e/**`; the 11 Playwright specs covering golden paths + the load-bearing concurrent-rollback test; the perf-budgets spec using `statisticalAssert` with N=20 samples.

**Coverage actually achieved:** 90.93% statements / 89.20% branches / 92.92% functions / 90.77% lines — comfortably above the 70% threshold.

**Human-edit summary:**
- *AI got right:* test patterns evolved organically. Story 1.6's pattern-verification test was the first "discipline-test-passes-trivially-now" example; the same pattern was applied to the Gap I-1 grep script (Story 1.5) and the ESLint `no-restricted-syntax` rule (Story 2.7). All three become enforcement the moment there's something to enforce against.
- *Human caught and changed:* Playwright suite race conditions (Story 2.9). The AI's initial deterministic-timing tests had several timing-related false positives; the human's "skip permission asks" enabled the AI to iterate quickly through 5+ rounds of test-fix-rerun until 11/11 passed reliably.
- *Worth replicating:* body-content-based route handlers (vs URL-pattern-based) for cleaner deterministic test setup. `route.continue()` with conditional logic on `request.postData()` made the concurrent-rollback test stable.

---

## Stage 11 — Artifact Set & Methodology Documentation (this stage)

**Date completed:** 2026-05-01

**Driving prompts:** Stories 3.1 (README), 3.2 (CONVENTIONS), 3.3 (DECISIONS-NOT-MADE), 3.4 (AI-INTEGRATION-LOG = this document), 3.5 (trainee dry-run placeholder). Stories 3.1–3.4 are pure documentation; 3.5 awaits a real human dry-run before v1 ships.

**Representative output excerpts:** the dual-nature opening of `README.md`; the 47-entry refused-features catalog with anchors for cross-referencing; this very file.

**Human-edit summary:**
- *AI got right:* documenting bugs found during implementation in the Stage 8 + Stage 10 sections rather than glossing over them. The "Bugs caught during implementation" table is part of the training value.
- *Human caught and changed:* TBD — this stage's review hasn't happened yet at the time of writing. Will update post-review.
- *Worth replicating:* writing AI-INTEGRATION-LOG *concurrently* with implementation rather than retroactively. Memory of what the AI got right vs what the human caught fades fast.

---

## Open Questions for Future Training Modules

1. **How early should Gap-I-1-style architecture self-validation happen?** Story 1.5's Dev Notes show the fix was applied during implementation — but it could've been caught during architecture review. Trade-off: early review adds time; late review adds risk. v1 hit the right balance by accident; future modules should make it explicit.

2. **Is the per-story implementation-context file overhead worth it?** 34 stories × ~300-line context files = ~10,000 lines of "developer guardrails." A trainee studying methodology benefits; a working developer might find it noise. Consider a "lite" mode for established teams.

3. **Should TEA amendments be auto-applied, or always require human review?** v1 applied 9 amendments verbatim from the implementation-readiness check. None were wrong. But the human's review-loop was load-bearing for the corrections in Stages 1, 2, 3.

4. **What's the right cadence for AI ↔ human handoffs?** v1's pattern was "AI proposes a stage's full output; human reviews + corrects in 1-3 rounds; AI integrates." Other patterns (per-Story, per-AC) would change the pacing — unclear if better or worse.

These questions are flagged for the next BMAD methodology revision.
