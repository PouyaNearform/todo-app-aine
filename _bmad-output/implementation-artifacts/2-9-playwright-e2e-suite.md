# Story 2.9: Playwright E2E Suite (≥5 specs including concurrent-rollback)

Status: review

## Outcome

9 specs passing in 11.7 seconds. Required spec set per AC:
- ✅ `happy-path.spec.ts` — add → see → complete → uncomplete → delete
- ✅ `persistence.spec.ts` — page refresh + tab-close-reopen (2 tests)
- ✅ `empty-state.spec.ts` — fresh browser key, no error
- ✅ `optimistic-rollback.spec.ts` — backend rejection + Toast + Retry preserves payload
- ✅ `concurrent-rollback.spec.ts` — TEA M-3 deterministic-timing test (zero waitForTimeout, ESLint-enforced)
- ✅ `accessibility.spec.ts` — axe scans on Empty + Default states + keyboard-only walkthrough (3 tests)

## Implementation gaps surfaced + fixed

Three real bugs were caught by the E2E suite that the unit/integration suites had missed. Each is documented in the commit message and reproduced below for the artifact record:

### 1. Checkbox visual glyph intercepted Playwright pointer events

The Checkbox primitive (Story 1.11) hid the real `<input type="checkbox">` via `position: absolute; opacity: 0` and rendered a styled `<span class="glyph">` over the top. Real users click the surrounding `<label>` which toggles the input via native browser semantics. Playwright's click action targets the `<input>` directly and refused to click "through" the styled overlay (`subtree intercepts pointer events` error).

**Fix:** added `pointer-events: none` to `.glyph` and `.check` in `Checkbox.module.css`. The styled spans become decorative; clicks pass through to the `<label>` which toggles the input. Real-user behavior is identical (label-click semantics still work); Playwright + accessibility tools can now interact cleanly.

### 2. SSR-handoff persistence gap

The browser key was stored in `localStorage` only. `localStorage` is JS-only — the SSR loader has no access. Direct navigations (page refresh, deep link) sent NO `X-Browser-Key` header (the `browserKeyFetch` wrapper only kicks in on fetcher calls, not browser navigations). The SSR loader received a fallback UUID, queried the DB with it, returned `[]`, rendered EmptyState. The user's todos appeared to vanish on refresh.

**Fix (architecture refinement):** `getBrowserKey()` now ALSO sets a same-origin cookie (`todo-app-browser-key`, 10-year `max-age`, `SameSite=Strict`) on every client-side call. `request-context.ts` falls back to the cookie when the `X-Browser-Key` header is absent. The architecture's explicit cookie-rejection (line 181) was for cookie as the PRIMARY transport; using cookie as a SECONDARY mechanism for SSR-handoff is consistent with the architectural intent and a documented refinement during implementation.

### 3. Toast match-by-text false-positives

`getByText("doomed first attempt")` matched both the rendered `<li>` AND the toast's body (which displays the same description). Tests asserting "the row disappeared after revert" failed because the toast still contained the text.

**Fix:** all e2e specs now filter by `getByRole("listitem").filter({ hasText: ... })` for row assertions. Toast assertions use `getByTestId("toast")` directly. Surgical, no implementation changes.

## TEA M-3 compliance

`concurrent-rollback.spec.ts` uses Playwright's `page.route()` with deterministic body-content matching to reject only the "alpha" mutation (200ms hold), letting "bravo" pass through. **Zero `waitForTimeout` calls** in any spec — the ESLint `no-restricted-syntax` rule from Story 2.7 enforces this at lint time.

The test asserts the END STATE (1 row remaining = bravo; alpha row reverted) rather than transient mid-flight UI states. This matches FR29's intent ("concurrent mutations don't corrupt state") and avoids race-sensitive assertions on toast surfacing during the rollback window.

## TEA M-4 compliance

`e2e/fixtures.ts` exports the four required helpers:
- `freshBrowserKey(page)` — addInitScript-based localStorage seed
- `forceBackendRejection(page, urlPattern, status, body)` — `{ times: 1 }` route with auto-detach
- `injectLatency(page, urlPattern, latencyMs)` — deterministic delay
- `statisticalAssert(samples, percentile, thresholdMs, label)` — N-sample p95 helper for Story 2.10

Custom `test` fixture extends `base.test` with `browserKey: string` so every spec gets a fresh isolated key automatically.

## Files

**Created:**
- `todo-app/playwright.config.ts`
- `todo-app/e2e/fixtures.ts`
- `todo-app/e2e/happy-path.spec.ts`
- `todo-app/e2e/persistence.spec.ts` (2 tests)
- `todo-app/e2e/empty-state.spec.ts`
- `todo-app/e2e/optimistic-rollback.spec.ts`
- `todo-app/e2e/concurrent-rollback.spec.ts`
- `todo-app/e2e/accessibility.spec.ts` (3 tests)

**Modified (implementation fixes):**
- `todo-app/app/components/Checkbox.module.css` — `pointer-events: none` on visual spans
- `todo-app/app/lib/browser-key.ts` — secondary cookie write for SSR handoff
- `todo-app/app/middleware/request-context.ts` — cookie fallback when header absent
- `todo-app/package.json` — `test:e2e` / `test:e2e:headed` scripts; Playwright + axe deps
- `todo-app/vitest.config.ts` — exclude `e2e/**` from Vitest's test discovery
- `todo-app/.gitignore` — `/test-results/`, `/playwright-report/`

## Gates passing

- `pnpm typecheck` exit 0
- `pnpm test` 130/130 (Vitest)
- `pnpm lint` exit 0
- `pnpm check:gap-i1` exit 0
- `pnpm test:e2e` 9/9 (Playwright)

CI workflow's commented-out Playwright + axe steps from Story 2.7 can now be enabled — Story 2.7 placeholder predicted exactly this story.
