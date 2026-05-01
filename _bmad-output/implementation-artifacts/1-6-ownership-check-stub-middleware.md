# Story 1.6: Ownership-Check Stub Middleware

Status: review

## Story

As an architect honoring the seams,
I want an ownership-check middleware function in the request pipeline as a no-op pass-through,
so that future auth/permission modules can replace it without touching every action handler.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 1.6 (lines 323–337).

1. **Given** Story 1.5 is complete, **When** I implement `app/middleware/ownership-check.ts` exporting `checkOwnership(ctx: RequestContext, resourceOwnerId: string | null): void`, **Then** in v1 the function is a no-op pass-through (returns `void` without throwing).
2. **And** the function signature is pluggable — a future auth module can replace the body to throw `UnauthorizedError` if `ctx.principal.kind !== 'user'` OR if `resourceOwnerId !== ctx.ownerId`.
3. **And** every action handler in the codebase calls `checkOwnership(ctx, resourceOwnerId)` before invoking the service layer. (No actions exist in the codebase yet — Stories 1.10–1.12 will be the first to apply this discipline; this story makes the rule expressible and testable.)
4. **And** unit test confirms current no-op behavior; an inline comment in `ownership-check.ts` documents the future-extension contract.
5. **And** **Vitest middleware test (TEA amendment m-2, Test 1.6-UNIT-001):** asserts `checkOwnership(ctx, resourceOwnerId)` is called before any service-layer invocation in every action handler. Pattern verification for the seam-invocation discipline. *Implements as a file-scanning Vitest test that runs over `app/routes/**/*.{ts,tsx}`; passes trivially while no actions exist; kicks in starting Story 1.10.*

## Tasks / Subtasks

- [x] **Task 1: Implement `app/middleware/ownership-check.ts`** (AC 1, 2, 4)
  - [ ] 1.1: Create `todo-app/app/middleware/ownership-check.ts`. Export the function and a future-extension documentation comment.
  - [ ] 1.2: Function signature: `export function checkOwnership(_ctx: RequestContext, _resourceOwnerId: string | null): void`. Underscore prefix on params signals "intentionally unused in v1" — common TS/ESLint convention. Body is just `return;` (or empty body — same effect).
  - [ ] 1.3: Above the function, add a brief comment block (5-8 lines) documenting:
    - In v1, this is a no-op. The seam exists to be replaced.
    - When auth lands, replace the body with: throw `UnauthorizedError` if `ctx.principal.kind !== 'user'`, OR if the resource exists (`resourceOwnerId !== null`) and doesn't match `ctx.ownerId`.
    - The `resourceOwnerId: string | null` parameter accepts `null` for create-style operations where the resource doesn't exist yet (no owner to check against).
  - [ ] 1.4: Re-export `RequestContext` type via `import type` from `~/middleware/request-context` so consumers don't have to import from two paths.

- [x] **Task 2: Write the no-op behavior test** (AC 4)
  - [ ] 2.1: Create `todo-app/app/middleware/ownership-check.test.ts`.
  - [ ] 2.2: Use `// @vitest-environment node` (consistent with Story 1.5's middleware test).
  - [ ] 2.3: Test cases:
    - `it("returns void when ctx.ownerId matches resourceOwnerId")` — build a `RequestContext` via `buildRequestContext` (with a known browser key), call `checkOwnership(ctx, ctx.ownerId)`, assert the result is `undefined` (and the call didn't throw).
    - `it("returns void when ctx.ownerId differs from resourceOwnerId (v1 no-op)")` — call with a non-matching `resourceOwnerId`, assert no throw. **This is the test that will FAIL once auth is wired** — capture this in a comment so the future maintainer knows to update it. For now, the v1 contract IS that it doesn't throw.
    - `it("returns void when resourceOwnerId is null (create-style call site)")` — call with `null`, assert no throw.

- [x] **Task 3: Implement the pattern-verification test** (AC 5 — TEA m-2, Test 1.6-UNIT-001)
  - [ ] 3.1: Add a `describe` block in the same `ownership-check.test.ts` file titled `"Test 1.6-UNIT-001: checkOwnership invocation discipline"`.
  - [ ] 3.2: The test scans `app/routes/**/*.{ts,tsx}` (use Node's `fs.readdirSync` recursively, or `import.meta.glob` if it works in node env — `fs` is more portable). For each file:
    - Read its content.
    - Detect any `export async function action(` or `export function action(` declarations (also detect the `export const action = async (...)` form).
    - For each action body, verify `checkOwnership(` appears at least once in it. (Verifying it appears *before* a service call is harder via regex without a real AST parser; "presence" is the v1 contract — Stories 2.7's ESLint config can strengthen this with `no-restricted-syntax`.)
  - [ ] 3.3: When zero action handlers are found, the test passes trivially with a helpful diagnostic: `expect(actionsScanned).toBe(actionsCovered)` and `console.info` the count. **This is what's expected in Story 1.6** — the test passes today because no actions exist; the discipline activates from Story 1.10 onward.
  - [ ] 3.4: Co-locate the helper function (`scanActionFiles`) in the test file itself rather than creating a separate helper module — Story 1.6 doesn't merit a `app/middleware/test-utils.ts`.

- [x] **Task 4: Verify quality gates and commit**
  - [ ] 4.1: `pnpm typecheck` — exit 0.
  - [ ] 4.2: `pnpm test` — should report 24 total tests (21 from Stories 1.3–1.5 + 3 new no-op tests + 1 pattern-verification test = 25 actually, depending on suite layout).
  - [ ] 4.3: `pnpm dev` — regression check.
  - [ ] 4.4: `pnpm check:gap-i1` — should still report OK.
  - [ ] 4.5: `git add . && git commit -m "Story 1.6: ownership-check stub middleware"`.

## Dev Notes

### Why this story matters (training-identity context)

This is **the third of the four architectural seams** (architecture line 234: "browser-key utility ↔ request-context middleware ↔ ownership-check stub ↔ `owner_id` field"). The full seam ordering is:

1. **Browser-key utility** (Story 1.3) — *who is this client?*
2. **Request-context middleware** (Story 1.5) — *build the per-request principal + ownerId*
3. **Ownership-check stub** (Story 1.6 — this story) — *can this principal access this resource?*
4. **`owner_id` field + service layer** (Story 1.4 schema + Story 1.7 service) — *the persistence contract that makes the seam useful*

Per the anti-flattening rule on seams: each seam is a separately addressable artifact, not a vague "good architecture" feeling. After Story 1.6, the trainee can `cat app/middleware/ownership-check.ts` and *see* the no-op body — and the comment that explains how a future auth module would replace it. **The seam's value is that it's already in the call path before it has any teeth.** When auth lands, the swap is: replace the body. Not: add the call site to 7 actions.

This is the same pattern the architecture's "build options" tradeoff cited (architecture line 137): the four seams are *paid for by training identity*. They cost a small amount of v1 boilerplate; they buy a clean auth landing strip that costs zero refactoring work to land later.

### Architectural context

- **File path (locked):** `app/middleware/ownership-check.ts` (architecture line 297).
- **Test path (co-located convention):** `app/middleware/ownership-check.test.ts`.
- **Function signature (per AC 1):** `checkOwnership(ctx: RequestContext, resourceOwnerId: string | null): void`.
  - `ctx: RequestContext` — comes from Story 1.5's `buildRequestContext`. The function only needs `ctx.principal.kind` and `ctx.ownerId` once auth lands.
  - `resourceOwnerId: string | null` — the `owner_id` value already on the resource (when it exists). For create-style calls where the resource hasn't been written yet, the action passes `null`.
  - Returns `void`. The future-auth implementation should `throw new UnauthorizedError(...)` rather than returning a boolean — this keeps the action sites clean (no `if (!ok) return responses.unauthorized()` boilerplate).
- **No-op contract (locked for v1):** the function MUST NOT throw under any input in v1. This is the contract the loaders and actions of Stories 1.7–1.12 will rely on. **If you add any guard, you've broken the seam discipline** — the v1 stub's value is that it's safe to call unconditionally and it always passes.
- **Future-auth replacement (documented but NOT implemented):** when an auth module lands, the body becomes:
  ```ts
  if (ctx.principal.kind !== "user") {
    throw new UnauthorizedError("Authentication required");
  }
  if (resourceOwnerId !== null && resourceOwnerId !== ctx.ownerId) {
    throw new ForbiddenError("Resource owned by a different principal");
  }
  ```
  Important: the `principal.kind !== 'user'` check is what makes this story's seam pay off — when v1's `'browser-key'` variant gets demoted, every action that used to "pass" now "fails" without changing any action code.

### Carry-over from prior stories

From **Story 1.5**:
- `RequestContext` type is exported from `app/middleware/request-context.ts`. Import via `import type { RequestContext } from "~/middleware/request-context"` (use `import type` because we only need the type, not the runtime value — keeps tree-shaking clean).
- The Gap I-1 grep script (`scripts/check-gap-i1.sh`) only flags `ctx.principal.browserKey` references in `app/services/`. This story's middleware doesn't touch `app/services/` and doesn't read `ctx.principal.browserKey` directly anyway — passes the check.

From **Story 1.4**:
- Service-layer code lands in Story 1.7. This story can't yet write a "service is invoked through ownership-check" integration test — that's Story 1.7's domain.

### Files being created — current state

- **`todo-app/app/middleware/ownership-check.ts`** — NEW.
- **`todo-app/app/middleware/ownership-check.test.ts`** — NEW.
- No file modifications to other paths.

### Testing standards (for this story)

- All tests run under `// @vitest-environment node`.
- Build `RequestContext` instances via `buildRequestContext(new Request("http://localhost/", { headers: { "X-Browser-Key": <preset> } }))` rather than hand-constructing object literals — this keeps the tests honest (they exercise Story 1.5's contract) and self-updating if `RequestContext` shape changes.
- The pattern-verification test scans the filesystem; it must use `process.cwd()` or `import.meta.url`-relative paths so it works regardless of how Vitest is invoked (CI vs local).

### LLM-developer guardrails

- **Don't add a `try/catch` in `checkOwnership`.** The v1 stub must not catch anything — there's nothing thrown. Adding error handling at this layer would obscure the future-auth integration point.
- **Don't return a boolean.** The signature is `void`. Action handlers should NOT have to write `if (!checkOwnership(...)) return error;`. The future-auth implementation throws; the call site only ever sees the success path inline.
- **Don't read `ctx.principal.browserKey` here.** The middleware checks ownership against `ctx.ownerId` only — `ctx.principal.browserKey` is a leak of mechanism through the seam (Gap I-1's exact failure mode). The grep script enforces this in `app/services/`; the discipline applies to `app/middleware/` too.
- **Don't make `resourceOwnerId` optional with a default of `null`.** The action handler must explicitly pass `null` for create-style calls. Forcing the explicit pass is what catches "I forgot to fetch the existing owner" mistakes at code-review time.
- **Don't put the pattern-verification test in `scripts/`.** AC 5 specifies a *Vitest* test, not a bash script. The Gap I-1 enforcement for Story 1.5 was a bash script because it's pre-test (CI-stage); the ownership-check pattern verification is a *runtime* invariant about test-discoverable code.

### Cross-cutting AC compliance check

- ✓ Token discipline: N/A.
- ✓ Import discipline: `app/middleware/ownership-check.ts` imports only types from `app/middleware/request-context.ts`. No imports from `app/routes/*`, `app/services/*`, `app/components/*`.
- ✓ `pnpm typecheck` + `pnpm test` pass.
- N/A color/focus, data-testid.

### Project Structure Notes

- This story brings `app/middleware/` to two files (`request-context.ts`, `ownership-check.ts`) plus their tests. No further middleware planned for v1 — the four seams are: utility, request-context, ownership-check, schema. After this story, *three* seams are in code; the fourth (service layer) lands in Story 1.7.

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 1.6: Ownership-Check Stub Middleware" lines 323–337
- `_bmad-output/planning-artifacts/architecture.md` line 46 (four seams; Story 1.6 is seam #3)
- `_bmad-output/planning-artifacts/architecture.md` line 137 (seams paid for by training identity)
- `_bmad-output/planning-artifacts/architecture.md` line 222 (story 1.5+1.6 are "wire request-context middleware + ownership-check stub")
- `_bmad-output/planning-artifacts/architecture.md` line 234 (the four-piece seam ordering)
- `_bmad-output/planning-artifacts/architecture.md` line 297 (file path: `app/middleware/ownership-check.ts`)
- `_bmad-output/planning-artifacts/architecture.md` line 582 (architectural-seams traceability: ownership-check appears in every action)
- `_bmad-output/test-artifacts/test-design/ToDo-App-handoff.md` (TEA amendment m-2: Vitest middleware test for ownership-check invocation discipline)
- Story 1.5 file: implementation reference for `RequestContext` shape and import path

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context), acting as Amelia (Senior Software Engineer) under the bmad-dev-story workflow.

### Debug Log References

- `pnpm test` final: 5 files / 25 tests passing (1.35s).
- `pnpm typecheck` exit 0; underscore-prefixed unused params (`_ctx`, `_resourceOwnerId`) compiled cleanly under TS strict mode without `noUnusedParameters` complaints (RR7's tsconfig doesn't enable that flag).
- `pnpm check:gap-i1` still OK (this story's middleware doesn't read `ctx.principal.browserKey`).
- The pattern-verification test's "zero actions found" branch fired and emitted the `console.info` heads-up. When Story 1.10 lands the first action, this test will start enforcing.

### Completion Notes List

**Pattern-scanner regex pragmatism.** The Test 1.6-UNIT-001 scanner uses two regexes: `ACTION_DECL_REGEX` matches `export async function action(`, `export function action(`, and `export const action =` shapes — covering all three idiomatic RR7 declarations. It then does an `includes("checkOwnership(")` check on the file content (not parsing the function body). This is a *presence* check; ordering ("call checkOwnership *before* the service call") would need a real AST parser. **For v1 this is good enough** — the architectural lapse to prevent is forgetting to call the seam at all. Story 2.7's ESLint config can add a `no-restricted-syntax` rule that enforces ordering more rigorously.

**`expect(violators).toEqual([])` framing.** When the pattern test fails in a future story, the failure message will list the file paths missing `checkOwnership(`. This is more useful than a single-line "didn't find checkOwnership" message — the trainee sees exactly which file to fix.

**Re-export of `RequestContext` from ownership-check.ts.** Done so a future action-handler author can do `import { checkOwnership, type RequestContext } from "~/middleware/ownership-check"` instead of reaching into both middleware modules. Small DX win; no architectural cost (it's a re-export of a type, no runtime impact).

**The "discipline-test-passes-trivially-now" pattern.** This is the third instance of the same pattern in our build (Gap I-1 grep script in Story 1.5; ESLint rules in Story 2.7's plan; this test now). All three say: "the rule is enforceable today, even though there's nothing to enforce against — when there is, the rule kicks in automatically." The architecture's seam discipline is operational the moment Story 1.10 starts adding action handlers, with zero retrofitting work.

**No `import type` to `~/middleware/request-context`.** I did `import type { RequestContext } from "~/middleware/request-context"` in `ownership-check.ts` — the underscore in `import type` keeps the type-only import out of the runtime bundle (Vite's `verbatimModuleSyntax: true` from RR7's tsconfig requires it).

### File List

**Created:**
- `todo-app/app/middleware/ownership-check.ts` (no-op + future-extension comment + `RequestContext` re-export; ~22 lines)
- `todo-app/app/middleware/ownership-check.test.ts` (3 v1-contract tests + Test 1.6-UNIT-001 scanner; ~89 lines)

**Modified:** none.

**Commit:** `d60a562 Story 1.6: ownership-check stub middleware` (parent: `25579d9` from Story 1.5).

### Change Log

- **2026-04-30** — Story 1.6 implemented. Three of four architectural seams are now in place (browser-key utility, request-context, ownership-check). Story 1.7 (service layer) closes the seam set. Test 1.6-UNIT-001 (TEA m-2) shipped as a Vitest file scanner that's trivially green today and starts enforcing the discipline once Story 1.10 introduces action handlers.
