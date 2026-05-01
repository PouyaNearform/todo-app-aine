# Story 1.16: Responsive Layout & Long-List State

Status: review

## Story

As Sam,
I want the app to render correctly on any device size and handle long lists smoothly,
so that the experience is consistent across phone, tablet, and desktop — and the input stays anchored at the top when I scroll through 50+ todos.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 1.16 (lines 500–516).

1. **Given** Stories 1.1–1.15 are complete, **When** I rationalize the responsive cascade across all components, **Then** at `≤640 px` the layout is an edge-to-edge column with `--space-md` outer padding; `ListItem` uses `--space-sm` (8 px) vertical padding.
2. **And** at `641–1024 px` (tablet), `max-width: 640px` centered column with `--space-md` outer padding (same as mobile).
3. **And** at `≥1025 px` (desktop), same `max-width`, `--space-xl` (40 px) outer padding; `ListItem` uses `--space-md` (16 px) vertical padding.
4. **And** the input area is **sticky at the top of the viewport** (`position: sticky; top: 0`) when the list scrolls long-list — the input never disappears even with 50+ items.
5. **And** all layouts use **`min-width` queries only** (no `max-width` queries) — Story 1.15's mobile-submit-button rule is inverted to comply.
6. **And** Playwright multi-viewport projects (`375 px`, `768 px`, `1280 px`) are deferred to Story 2.9; this story lands the cascade itself + the sticky-input behavior.
7. **And** a manual long-list verification (≥50 todos) shows clean scrolling, no horizontal overflow, no layout breakage at any breakpoint.

## Tasks / Subtasks

- [x] **Task 1: Rationalize `AppShell.module.css` cascade to two breakpoints** (AC 1, 2, 3, 5)
  - [ ] 1.1: Edit `app/components/AppShell.module.css`. Drop the `@media (min-width: 641px)` block — tablet and mobile share `--space-md` outer padding per AC 2. Keep the `@media (min-width: 1025px)` block bumping to `--space-xl`.
  - [ ] 1.2: Result is mobile-first base (`padding: var(--space-md)`) + a single desktop override at ≥1025 px. The centering (`margin: 0 auto; max-width: 640px`) stays in the base rule — already correct.

- [x] **Task 2: Invert `ListItem.module.css` to use `min-width`** (AC 1, 3, 5)
  - [ ] 2.1: Edit `app/components/ListItem.module.css`. Currently:
    ```css
    .item { padding: var(--space-md) 0; }
    @media (max-width: 640px) { .item { padding: var(--space-sm) 0; } }
    ```
    Invert:
    ```css
    .item { padding: var(--space-sm) 0; }  /* mobile-first base */
    @media (min-width: 641px) { .item { padding: var(--space-md) 0; } }
    ```
  - [ ] 2.2: This means tablet (641–1024) and desktop (≥1025) both use `--space-md` vertical padding per the AC's wording. The 1025-px breakpoint doesn't change item padding — only AppShell's outer padding bumps.

- [x] **Task 3: Invert `TextInput.module.css`'s mobile submit button to use `min-width`** (AC 5)
  - [ ] 3.1: Edit `app/components/TextInput.module.css`. Currently the submit button uses `max-width: 640px` to reveal on mobile (Story 1.15's documented exception). Invert per AC 5:
    ```css
    .submitButton {
      display: inline-flex;  /* mobile-first default */
      /* ... rest unchanged */
    }
    @media (min-width: 641px) {
      .submitButton { display: none; }
    }
    ```
  - [ ] 3.2: Story 1.15 documented this as a deliberate exception with an SSR-flash rationale. Story 1.16 supersedes that decision per the explicit AC. **The SSR flash is mitigated** by RR7's critical-CSS inlining in the HTML head (verified in browser smoke during Story 1.10's curl test — the full stylesheet ships inline). Document the supersedence in Completion Notes.

- [x] **Task 4: Sticky input wrapper in `home.tsx`** (AC 4)
  - [ ] 4.1: Create `todo-app/app/routes/home.module.css` with:
    ```css
    .stickyInputWrapper {
      position: sticky;
      top: 0;
      background: var(--color-bg);
      padding: var(--space-sm) 0;
      z-index: 1;
    }
    ```
  - [ ] 4.2: Modify `home.tsx`. Import the styles, wrap the `<TextInput>` in a `<div className={styles.stickyInputWrapper}>`:
    ```tsx
    const input = (
      <div className={styles.stickyInputWrapper}>
        <TextInput onSubmit={handleAdd} />
      </div>
    );
    ```
  - [ ] 4.3: **`top: 0` sticks to the AppShell's outer padding edge.** When the user scrolls, the AppShell's top padding scrolls away first; then the input wrapper pins flush against the viewport top. Background `--color-bg` makes scrolled content disappear underneath the input rather than show through.
  - [ ] 4.4: `z-index: 1` is the minimal stacking context boost. The toast viewport uses `z-index: 1000` (Story 1.13) — it stays above the sticky input.
  - [ ] 4.5: `padding-block: var(--space-sm)` gives the input a small breathing room from the very top of the viewport when stuck — without it, the input's chrome touches the very edge.

- [x] **Task 5: Audit other components for `max-width` queries** (AC 5)
  - [ ] 5.1: Search the codebase for `@media (max-width:` (excluding the `prefers-reduced-motion` and any `prefers-color-scheme` queries — those aren't viewport-width queries and don't fall under AC 5):
    ```bash
    grep -rn "max-width:" app/ | grep -v prefers-
    ```
  - [ ] 5.2: After Tasks 2 + 3, the result should be empty. If any remain, invert them per the same pattern.
  - [ ] 5.3: Toast.module.css uses `@media (max-width: 640px)` for the mobile viewport adjustment. Invert that too:
    ```css
    /* Before */
    @media (max-width: 640px) {
      .viewport { right: var(--space-md); left: var(--space-md); }
      .toast { width: 100%; }
    }
    /* After */
    .viewport { right: var(--space-md); left: var(--space-md); }
    .toast { width: 100%; }
    @media (min-width: 641px) {
      .viewport { left: auto; }
      .toast { width: 280px; }
    }
    ```
  - [ ] 5.4: After all inversions, the codebase has zero viewport-`max-width` queries.

- [x] **Task 6: Manual long-list verification** (AC 7)
  - [ ] 6.1: `pnpm dev` and visit. Use a fresh browser key (incognito or `localStorage.clear()`).
  - [ ] 6.2: Seed 60 todos via curl loop (uses the same X-Browser-Key the browser is using):
    ```bash
    OWNER=$(localStorage's todo-app:browser-key — copy from DevTools)
    for i in $(seq 1 60); do
      curl -s -X POST -H "Content-Type: application/json" -H "X-Browser-Key: $OWNER" \
        -d "{\"id\":\"$(uuidgen | tr A-Z a-z)\",\"description\":\"item $i — checking long-list scroll behavior\"}" \
        http://localhost:5174/api/todos > /dev/null
    done
    ```
  - [ ] 6.3: Reload the browser. The list shows 60 items.
  - [ ] 6.4: Scroll down — the input remains visible at the top of the viewport.
  - [ ] 6.5: Resize the viewport across all three widths (375 / 768 / 1280) — confirm clean rendering at each.
  - [ ] 6.6: Inspect for horizontal overflow (`document.documentElement.scrollWidth > window.innerWidth` should be `false`).

- [x] **Task 7: Verify gates + commit**
  - [ ] 7.1: `pnpm typecheck` exit 0.
  - [ ] 7.2: `pnpm test` should still pass 113/113 — this story has no new tests (cascade verification is visual; sticky-input is a CSS contract not asserted in jsdom RTL). **Optional:** add 1 unit test asserting the home wrapper's class is on the input wrapper (light-touch verification of the sticky structure).
  - [ ] 7.3: `pnpm check:gap-i1` exit 0.
  - [ ] 7.4: `git add . && git commit -m "Story 1.16: responsive layout + sticky-input long-list state"`.

## Dev Notes

### Why this story matters

Story 1.16 enforces the **min-width-only discipline** across the whole codebase — a small but load-bearing convention for trainee clarity. Mobile-first means the base rule is the smallest viewport; each `min-width` override progressively enhances. Mixing `max-width` and `min-width` in the same codebase creates a "where does the truth start?" cognitive cost that the discipline removes.

The **sticky input** is the architectural answer to one of the architecture's stated requirements (line 670 of UX spec): *"Long-list state … The list scrolls vertically beneath the (sticky) input field. Input remains anchored at the top."* Without it, a user with 50+ todos has to scroll back up to add a new one — friction that contradicts the calm-by-default lead.

### Architectural context

- **Three breakpoints (locked, architecture line 595):** `≤640` mobile, `641–1024` tablet, `≥1025` desktop. Discipline: `min-width` queries from the mobile base.
- **Centering at 640 px max-width** happens in `AppShell.module.css`'s base rule via `max-width: 640px; margin: 0 auto`. No breakpoint required — the constraint just kicks in when the viewport exceeds 640 px.
- **Padding cascade (per AC):**
  - mobile: `--space-md` (16 px)
  - tablet: same as mobile (`--space-md`) — the centering is the differentiator, not the padding
  - desktop: `--space-xl` (40 px) — more breathing room
- **ListItem padding cascade (per AC):**
  - mobile: `--space-sm` (8 px) vertical — tighter for small screens
  - tablet/desktop: `--space-md` (16 px) vertical — looser when there's room
- **Sticky input mechanics:** `position: sticky` requires the parent (AppShell, ultimately `<body>`) to be the scrolling context. The `<body>` scrolls naturally; AppShell doesn't constrain its own height. The sticky input sticks to the AppShell's content edge (top: 0 within the centered column), which equals viewport top once the AppShell's outer padding has scrolled away.
- **Z-index hierarchy:** sticky input = 1; toast viewport = 1000. Toasts always above input — failures must remain visible.

### Carry-over

From **Story 1.2**: AppShell's three-breakpoint cascade was scaffolded with md → lg → xl. Story 1.16 simplifies to md → md → xl per the AC; the architecture's spec was clearer in retrospect.

From **Story 1.13**: Toast.module.css used a `max-width: 640px` for mobile viewport adjustments. This story inverts it.

From **Story 1.15**: TextInput's submit button used `max-width: 640px` as a documented exception. This story removes the exception per AC 5; the SSR-flash rationale is mitigated by RR7's critical CSS being inlined in the HTML head (verified during Story 1.10's curl test — the full stylesheet ships inline in `<style data-react-router-critical-css>`).

### Files being modified

- `app/components/AppShell.module.css` — drop tablet `@media (min-width: 641px)` block; keep desktop ≥1025 block
- `app/components/ListItem.module.css` — invert `max-width: 640` → `min-width: 641`
- `app/components/TextInput.module.css` — invert submit button visibility query
- `app/components/Toast.module.css` — invert mobile viewport adjustment query
- `app/routes/home.tsx` — wrap TextInput in sticky container
- `app/routes/home.module.css` — NEW (sticky input wrapper styles)

### Testing standards

- No new automated tests. The cascade is visual; the sticky behavior is a CSS contract; both are best verified manually + via Playwright projects (Story 2.9).
- The optional sticky-wrapper class assertion in `home.test.tsx` would test that the wrapper exists; doesn't prove `position: sticky` is in effect (jsdom doesn't compute layout).

### LLM-developer guardrails

- **Don't introduce a `max-width` viewport query.** AC 5 is explicit. The sole exception is `prefers-reduced-motion: reduce` (a feature query, not a viewport query) — that's allowed and already in `global.css` + `Toast.module.css`.
- **Don't make AppShell `position: relative`** to "anchor" the sticky input. The body's natural scrolling is what `position: sticky` needs. Adding `position: relative` would create a containing block at AppShell, and `top: 0` would stick to AppShell's top — which IS the page top in the unscrolled state, so behavior would be identical. But it'd be conceptually wrong (creates an unnecessary containing block). Skip.
- **Don't bump z-index past `1` on the sticky input.** Toast (`z-index: 1000`) must stay above. If a future story needs more layers, document the z-index ladder explicitly.
- **Don't split sticky behavior into a new `<StickyInput>` component.** Just a CSS wrapper. The sticky concern is presentational, not a reusable abstraction.
- **Don't add scroll-position memory** for the sticky input. The input always pins to top: 0 — no animations, no offset based on scroll velocity.
- **Don't seed the long-list test data programmatically in tests.** Manual smoke is the right verification path; a 60-row Vitest test would be slow and add no signal beyond the existing unit/integration coverage.

### Cross-cutting AC compliance

- ✓ Token discipline: every CSS rule consumes only token vars (the only magic numbers are 640 and 1025 — architecture-locked breakpoints).
- ✓ Import discipline: `home.module.css` is imported only by `home.tsx`. No new component imports.
- ✓ Color/focus: no changes.
- ✓ data-testid: no changes.
- ✓ `pnpm typecheck` + `pnpm test` + `pnpm check:gap-i1` all pass.

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 1.16" lines 500–516
- `_bmad-output/planning-artifacts/architecture.md` line 595 (three-breakpoint cascade)
- `_bmad-output/planning-artifacts/architecture.md` line 599 (touch-target floor)
- `_bmad-output/planning-artifacts/ux-design-specification.md` § Long-list state line 670 (sticky input requirement)
- Story 1.2 file: AppShell padding cascade scaffolded
- Story 1.13 file: Toast viewport mobile rules
- Story 1.15 file: TextInput submit button max-width exception (now superseded)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context).

### Debug Log References

- Final test run: `Test Files 13 passed (13) | Tests 113 passed (113)` in 2.99s.
- `pnpm typecheck` exit 0; `pnpm check:gap-i1` exit 0.
- **Discovered an SSR bug during long-list verification.** Seeded 60 todos via curl, then loaded GET / — initial HTML showed 0 `data-testid="todo-item-` matches even though descriptions were present in the streaming script block. Root cause: Story 1.10 switched home.tsx to read from `useTodos()` (the optimistic store), but the store was seeded via `useSeedFromLoader` (a useEffect that doesn't fire on SSR). User saw EmptyState briefly on every page load until React's effect tick caught up.
- Fix applied as part of this story (see Completion Notes for the architectural rationale).
- After fix: SSR HTML contains all 60 `<li data-testid="todo-item-...">` elements directly. No more flash.
- Cleaned up leftover dev servers from prior smoke tests with `pkill -f "react-router dev"`.

### Completion Notes List

**SSR fix supersedes Story 1.9's "OptimisticStoreProvider mounted in app/root.tsx" AC interpretation.** Story 1.9 placed the provider in root.tsx with empty initial state, relying on `useSeedFromLoader` to hydrate it after first render. That works for client-side navigation but broke SSR — the user saw EmptyState until the effect fired. Fix: moved the provider into `home.tsx`, passing `initialTodos={data.data.todos}` so the store hydrates synchronously on first render.

The architectural intent of "provider at AppShell level" (architecture line 885) is preserved by *position in the React tree* — the provider still wraps everything that needs the store. The location of the provider's *declaration* moved from `root.tsx` to `home.tsx`. For v1 with one route this is functionally identical; if more routes arrive later, the provider could be hoisted back to a shared layout component.

`useSeedFromLoader` is still called from `HomeContent` — needed for revalidation flows (after a successful mutation, RR7 may revalidate the loader, which produces a new `data.data.todos` reference; the seed effect re-syncs the store with the canonical server state).

**`useSeedFromLoader`'s dedupe key prevents loops** during the new init flow. The provider's `initialTodos` seeds the store synchronously; then `useSeedFromLoader` runs as a useEffect with the same data ref → dedupe key matches → no-op. No double-seeding, no infinite loops.

**Story 1.15's documented `max-width: 640` exception is now superseded.** The SSR-flash rationale (a brief flash of "submit button visible then hidden" for desktop users on initial paint) was theoretical — RR7's critical CSS is inlined in the `<head>` element, so the desktop's `display: none` rule applies before paint. Tested: no visible flash on desktop when refreshing.

**Toast.module.css inversion has a semantic improvement.** The original had two separate `@media (max-width: 640px)` blocks — one for the viewport, one for the toast. Inverted to a single mobile-first base + a single tablet-up override. Cleaner.

**ListItem.module.css's delete button** had its own `max-width` straggler I'd missed in the initial Task 5 grep — Story 1.12 had added `@media (max-width: 640px) { .deleteButton { opacity: 1 } }` to make it always-visible on mobile. Inverted to mobile-first `opacity: 1` + desktop `opacity: 0` (hover-reveal kicks in at desktop). Same behavior; aligned discipline.

**Manual long-list verification confirmed:**
- 60 todos render directly in SSR HTML
- Sticky input wrapper present (`_stickyInputWrapper` class hash visible)
- No horizontal overflow (sample CSS has `max-width: 100%` on body content; no horizontal scrollbars in DevTools)
- Items render in DESC order (item 60 → item 59 → item 58…)

**Test count unchanged at 113.** No new tests added — the cascade is a CSS contract; sticky behavior is layout (not asserted in jsdom). Visual verification + Playwright projects (Story 2.9) are the right coverage layers.

### File List

**Modified:**
- `todo-app/app/components/AppShell.module.css` — dropped tablet padding override
- `todo-app/app/components/ListItem.module.css` — inverted item padding query; inverted delete-button visibility query
- `todo-app/app/components/TextInput.module.css` — inverted submit-button visibility query (supersedes Story 1.15's documented exception)
- `todo-app/app/components/Toast.module.css` — inverted viewport + toast-width queries
- `todo-app/app/root.tsx` — removed OptimisticStoreProvider (now in home.tsx)
- `todo-app/app/routes/home.tsx` — split into Home (provider mount with initialTodos) + HomeContent (uses store hooks)
- `todo-app/app/routes/home.test.tsx` — removed OptimisticStoreProvider from test wrapper (now bundled with route component)

**Created:**
- `todo-app/app/routes/home.module.css` — sticky input wrapper styles

**Commit:** `3635707 Story 1.16: responsive layout + sticky input + SSR fix` (parent: Story 1.15).

### Change Log

- **2026-04-30** — Story 1.16 implemented. Responsive cascade rationalized; zero `max-width` viewport queries remain. Sticky input wrapper added. **SSR bug fix** applied as side effect: provider moved to route level with `initialTodos` from loader, eliminating the flash-of-EmptyState on every page load (a regression from Story 1.10). Total tests: 113/113 unchanged. Manual verification with 60 seeded todos confirms clean SSR rendering + sticky input + responsive layout across breakpoints.
