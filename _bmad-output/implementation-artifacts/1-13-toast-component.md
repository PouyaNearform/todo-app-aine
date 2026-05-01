# Story 1.13: Toast Component

Status: review

## Story

As Sam,
I want a calm recovery surface when a mutation fails on the backend,
so that I see what failed, can retry, and don't lose the data I typed — without modal interruption.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 1.13 (lines 444–461).

1. **Given** Story 1.9 is complete, **When** I implement `Toast.tsx` + `Toast.module.css` + a small toast store mounted in `app/root.tsx`, **Then** Toast floats at bottom-right (desktop, 280 px wide) or bottom-center (mobile, full-width-minus-padding).
2. **And** chrome: 1-px `--color-border` frame, `--shadow-toast` (`2px 2px 0 var(--color-border)` hard offset, no blur), `--color-bg` background, square corners.
3. **And** layout inside: bold heading row + dismiss × glyph (top-right), body line with truncated description (≤ 40 chars + ellipsis if truncated) in single quotes, Retry button aligned right.
4. **And** slides in over `--motion-duration-quick` from below the viewport edge.
5. **And** persists indefinitely until acted on (Retry / Dismiss); does **not** auto-dismiss.
6. **And** accessibility: `role="status"`, `aria-live="polite"`, `aria-atomic="true"`; Retry button has `aria-label="Retry: <description>"`; dismiss has `aria-label="Dismiss"`; `prefers-reduced-motion: reduce` collapses slide-in to instant.
7. **And** does not trap focus (Tab moves through Retry → Dismiss → back to underlying UI).
8. **And** unit test confirms ARIA + role attributes + truncation; Playwright slide-in/persistence assertions are deferred to Story 2.9.

## Tasks / Subtasks

- [x] **Task 1: Create the toast store** (AC 5, 7)
  - [ ] 1.1: Create `todo-app/app/lib/toast-store.tsx`. Pattern mirrors `optimistic-store.tsx`: `useReducer` + Context + hooks. Smaller surface — just add/dismiss/list.
  - [ ] 1.2: Types:
    ```ts
    export type ToastId = string;
    export type Toast = {
      id: ToastId;
      heading: string;       // e.g. "Couldn't save"
      description: string;   // the user's original payload (will be truncated for display)
      onRetry: () => void;   // Story 1.14 passes a closure that re-dispatches the mutation
    };
    ```
  - [ ] 1.3: State + actions:
    ```ts
    type ToastState = { toasts: Toast[] };
    type ToastAction =
      | { type: "show"; toast: Toast }
      | { type: "dismiss"; id: ToastId };
    ```
  - [ ] 1.4: Reducer: `show` appends to the toasts array (newest at the end — matches UX spec line 1098 "Newest at bottom, oldest at top" for stacking); `dismiss` filters by id.
  - [ ] 1.5: Provider: `ToastProvider({ children })` with empty initial state. Hooks: `useToasts()` (list), `useShowToast()` (returns a callback), `useDismissToast()` (returns a callback).
  - [ ] 1.6: Helper: `export function showToastFromMutationFailure(showToast, kind, description, onRetry): void` — Story 1.14 will use this. For Story 1.13 the helper just exists (untested by the dispatcher path; tested by unit-tested code).

- [x] **Task 2: Build the Toast presentational component** (AC 1, 2, 3, 4, 6, 7)
  - [ ] 2.1: Create `todo-app/app/components/Toast.tsx`. Signature: `function Toast({ toast, onDismiss }: { toast: Toast; onDismiss: () => void })`.
  - [ ] 2.2: Internals:
    ```tsx
    function truncate(s: string, max = 40): string {
      return s.length <= max ? s : s.slice(0, max - 1) + "…";
    }

    return (
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className={styles.toast}
        data-testid="toast"
      >
        <div className={styles.headerRow}>
          <strong className={styles.heading}>{toast.heading}</strong>
          <button
            type="button"
            className={styles.dismissButton}
            aria-label="Dismiss"
            onClick={onDismiss}
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
        <p className={styles.body}>'{truncate(toast.description)}'</p>
        <div className={styles.actionRow}>
          <button
            type="button"
            className={styles.retryButton}
            aria-label={`Retry: ${truncate(toast.description)}`}
            data-testid="toast-retry"
            onClick={() => {
              toast.onRetry();
              onDismiss();
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
    ```
  - [ ] 2.3: **Important**: clicking Retry both invokes `onRetry()` AND dismisses the toast immediately. UX spec line 477: "successful retry auto-dismisses the corresponding Toast (FR30)" — Story 1.14 will make the dismissal conditional on success; for Story 1.13 the dismiss-on-click is the simple v1 behavior. Document.
  - [ ] 2.4: Export the `truncate` helper alongside (Story 1.14 may want to use it elsewhere).

- [x] **Task 3: Build the ToastViewport rendering all active toasts** (AC 1, 5)
  - [ ] 3.1: Create the `ToastViewport` component within `Toast.tsx` (or a separate file — colocated is cleaner):
    ```tsx
    export function ToastViewport() {
      const toasts = useToasts();
      const dismiss = useDismissToast();
      if (toasts.length === 0) return null;
      return (
        <div className={styles.viewport}>
          {toasts.map((t) => (
            <Toast key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </div>
      );
    }
    ```
  - [ ] 3.2: ToastViewport handles its own visibility — returns `null` when no toasts, renders the stack otherwise. No Portal needed; placed in root.tsx as a sibling of AppShell, position: fixed handles the visual placement.

- [x] **Task 4: Write the CSS** (AC 1, 2, 4, 6)
  - [ ] 4.1: Create `todo-app/app/components/Toast.module.css`:
    ```css
    .viewport {
      position: fixed;
      bottom: var(--space-md);
      right: var(--space-md);
      display: flex;
      flex-direction: column-reverse;  /* newest at bottom of stack */
      gap: var(--space-sm);
      pointer-events: none;            /* viewport is just a container */
      z-index: 1000;
    }

    @media (max-width: 640px) {
      .viewport {
        right: var(--space-md);
        left: var(--space-md);
      }
    }

    .toast {
      width: 280px;
      pointer-events: auto;
      background: var(--color-bg);
      border: var(--border-width) solid var(--color-border);
      box-shadow: var(--shadow-toast);
      padding: var(--space-md);
      animation: slide-in var(--motion-duration-quick) var(--motion-easing);
    }

    @media (max-width: 640px) {
      .toast {
        width: 100%;
      }
    }

    @keyframes slide-in {
      from { transform: translateY(100%); opacity: 0; }
      to { transform: translateY(0); opacity: 1; }
    }

    @media (prefers-reduced-motion: reduce) {
      .toast {
        animation: none;
      }
    }

    .headerRow { display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-sm); }
    .heading { font-size: var(--font-size-lg); font-family: var(--font-body); font-weight: 600; line-height: 1.3; }
    .dismissButton {
      border: none; background: transparent; cursor: pointer; padding: 0;
      width: 24px; height: 24px;
      font-size: 18px; color: var(--color-fg-muted);
      display: inline-flex; align-items: center; justify-content: center;
    }
    .dismissButton:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }

    .body {
      margin-top: var(--space-sm);
      font-size: var(--font-size-sm);
      color: var(--color-fg);
      word-wrap: break-word;
      overflow-wrap: anywhere;
    }

    .actionRow { display: flex; justify-content: flex-end; margin-top: var(--space-md); }

    .retryButton {
      border: var(--border-width) solid var(--color-border);
      border-radius: var(--border-radius);
      background: var(--color-bg);
      color: var(--color-fg);
      padding: var(--space-sm) var(--space-md);
      font-family: var(--font-body);
      font-size: var(--font-size-base);
      font-weight: 600;
      cursor: pointer;
    }
    .retryButton:hover { background: var(--color-fg); color: var(--color-bg); }
    .retryButton:active { box-shadow: var(--shadow-pressed); }
    .retryButton:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px; }
    ```
  - [ ] 4.2: The reduced-motion override is also handled globally by `app/styles/global.css`'s `prefers-reduced-motion` block (Story 1.2 set this up — `transition-duration: 0ms !important` on all elements). The local override here is belt-and-suspenders for the keyframe animation specifically.
  - [ ] 4.3: `pointer-events: none` on the viewport + `pointer-events: auto` on each `.toast` lets the user click through gaps in the stacked toasts (rare at v1 scale but correct).

- [x] **Task 5: Mount the ToastProvider and ToastViewport in root.tsx** (AC 1)
  - [ ] 5.1: Modify `app/root.tsx`. Wrap `<OptimisticStoreProvider>` in `<ToastProvider>` (toasts may outlive any single mutation, so they live at the same shell level):
    ```tsx
    <body>
      <ToastProvider>
        <OptimisticStoreProvider>
          <AppShell>{children}</AppShell>
        </OptimisticStoreProvider>
        <ToastViewport />
      </ToastProvider>
      <ScrollRestoration />
      <Scripts />
    </body>
    ```
  - [ ] 5.2: ToastViewport is a sibling of OptimisticStoreProvider (not nested inside) — toasts are rendered by the provider's portal-equivalent (the fixed-position viewport). Ordering matters: the provider must wrap *both* the AppShell and the viewport, so both can `useToasts`.

- [x] **Task 6: Tests** (AC 8)
  - [ ] 6.1: Create `app/components/Toast.test.tsx` (jsdom env). Test cases:
    - `it("renders heading, truncated description in single quotes, Retry, and Dismiss")`
    - `it("truncates description >40 chars with ellipsis")`
    - `it("does not truncate descriptions ≤40 chars")`
    - `it("calls onRetry then onDismiss when Retry is clicked")`
    - `it("calls onDismiss when × is clicked")`
    - `it("has role=status, aria-live=polite, aria-atomic=true")`
    - `it("Retry button's aria-label includes the truncated description")`
  - [ ] 6.2: Create `app/lib/toast-store.test.tsx`. Test cases:
    - Provider supplies empty state by default
    - `useShowToast()` adds a toast
    - `useDismissToast(id)` removes the matching toast
    - Multiple toasts coexist (FR-equivalent for Toast stacking)
    - `useToasts()` outside provider throws

- [x] **Task 7: Verify gates and commit**
  - [ ] 7.1: `pnpm typecheck` exit 0.
  - [ ] 7.2: `pnpm test` ~107 tests passing (94 prior + ~13 new).
  - [ ] 7.3: `pnpm dev` — visit; no toast visible until Story 1.14 wires the dispatchers. Manual test: in DevTools console, programmatically call `showToast({ id: "x", heading: "Test", description: "hello", onRetry: () => {} })` (would need to expose a debug hook — skip if too invasive; rely on the unit test). For now, just confirm root.tsx renders cleanly with the new provider.
  - [ ] 7.4: `pnpm check:gap-i1` exit 0.
  - [ ] 7.5: `git add . && git commit -m "Story 1.13: Toast component + toast store"`.

## Dev Notes

### Why this story matters

Story 1.13 ships the **calm recovery surface** the optimistic-rollback contract has been waiting for. Stories 1.10/1.11/1.12 each had a `console.warn` placeholder where the Toast would surface; Story 1.14 will replace those placeholders with real toasts. Story 1.13 builds the surface; Story 1.14 wires it to the dispatchers.

Per the anti-flattening rule on optimistic UI:

> Optimistic UI is "applied client-side immediately, with explicit rollback on backend rejection AND a payload-preserving Retry toast."

The Toast IS the "payload-preserving Retry" piece. Story 1.13 builds the Toast capable of carrying a payload (the `onRetry` closure), but doesn't yet wire it. Story 1.14 closes that loop.

Per **calm-by-default** (memory: `feedback_anti_flattening.md`):
- No exclamation marks in headings
- No "Oops!" or "Sorry!"
- No red color (the `--color-bg`/`--color-fg`/`--color-border` palette is the same as the rest of the app — the *layout* signals "this is a recovery surface", not the color)
- No auto-dismiss (forces deliberate user action)
- No spinner during retry (Story 1.14: optimistic re-apply on retry)
- Slide-in motion is brief (120 ms) and signals "this just appeared"

### Architectural context

- **Component file path:** `app/components/Toast.tsx` (architecture line 540 referenced; may not have explicit listing).
- **Toast store as a separate provider:** mirrors `OptimisticStoreProvider`'s pattern. Could live alongside in `optimistic-store.tsx`, but keeping it separate makes the toast surface independently testable + replaceable.
- **No portal:** the ToastViewport renders inside the React tree (sibling of AppShell). `position: fixed` handles the visual placement. Portals would be needed if there were CSS containing constraints (e.g., `overflow: hidden` on a parent), but our AppShell doesn't have any.
- **Stacking order:** newest at the bottom (UX spec line 1098), so the viewport uses `flex-direction: column-reverse`. Each new toast pushes existing toasts up.
- **No focus trap:** Tab order goes Retry → Dismiss → back to the underlying UI (input, list items). The toast is *non-blocking* — the user can keep typing while a toast is visible.
- **Single-quoted body text:** matches UX spec line 1115 (`*"'pick up dry cleaning'"*`). The single quotes around the truncated description visually distinguish the user's data from the toast's chrome text.
- **Heading wording (locked, UX spec line 1114):** "Couldn't save" / "Couldn't update" / "Couldn't delete". No exclamation marks. Title-case. Calm, factual.

### Carry-over from prior stories

From **Story 1.9**: the useReducer + Context + hooks pattern. Toast store is a smaller copy of OptimisticStoreProvider's shape.

From **Story 1.10/1.11/1.12**: each dispatcher currently `console.warn`s on failure. Story 1.14 will swap those for `showToast(...)` calls; this story prepares the API surface (the `Toast` type + `useShowToast` hook).

From **Story 1.2**: tokens (--shadow-toast, --motion-duration-quick, --motion-easing) are pre-defined for exactly this use case. Story 1.13 is finally the consumer.

### Files being created/modified

- `app/lib/toast-store.tsx` — NEW (provider + hooks; ~75 lines)
- `app/lib/toast-store.test.tsx` — NEW
- `app/components/Toast.tsx` — NEW (Toast + ToastViewport; ~70 lines)
- `app/components/Toast.module.css` — NEW
- `app/components/Toast.test.tsx` — NEW
- `app/root.tsx` — MODIFIED (wrap providers + add ToastViewport)

### Testing standards

- Toast component tests use jsdom env + RTL. Assert ARIA attributes via `getAttribute` or `toHaveAttribute`.
- For the truncation test, use a 41-char string to verify the boundary (40-char input shouldn't truncate; 41-char should).
- The store's "useToasts outside provider throws" test uses the same `vi.spyOn(console, "error")` pattern as Story 1.9's `useStore` test.

### LLM-developer guardrails

- **Don't add a "type" field to Toast (warning/error/info).** Per UX spec there's only one variant — recovery for failed mutations. Adding type creates a slope toward color-as-only-signal.
- **Don't add auto-dismiss.** The user must explicitly act (Retry or Dismiss). UX spec line 458: "persists indefinitely until acted on".
- **Don't add a "Cancel"/"Undo" button distinct from Dismiss.** v1 has just two affordances: Retry and Dismiss.
- **Don't add a duration prop.** No `<Toast duration={5000}>`; the persistence is a contract, not a configurable knob.
- **Don't trap focus inside the toast.** Tab goes Retry → Dismiss → back to underlying UI (NOT looped back to Retry). UX spec line 460 is explicit.
- **Don't use `position: absolute`** on the toast. It's `fixed`-positioned by the viewport; the toast is `position: static` inside its container. Architecture decisions about z-index belong on the viewport, not on individual toasts.
- **Don't pre-wire the dispatchers to use the Toast.** That's Story 1.14's job. Touching the dispatchers in this story spreads the change across two stories.

### Cross-cutting AC compliance

- ✓ Token discipline: every CSS rule consumes only token vars (no raw hex, no magic numbers except 280 px width per UX spec).
- ✓ Import discipline: `app/components/Toast.tsx` imports from `~/lib/toast-store` (allowed: components consume the store hook). No imports from `app/services/*`.
- ✓ Color is never the only signal: layout + heading text + Retry button shape are the cues; color palette is identical to the rest of the app.
- ✓ Visible focus indicator: 2-px accent ring on Retry and Dismiss buttons.
- ✓ Native HTML semantics: `<button type="button">` for both actions; `role="status"` provides the live region semantic.
- ✓ data-testid: `toast` and `toast-retry` per TEA M-2.
- ✓ `pnpm typecheck` + `pnpm test` + `pnpm check:gap-i1` all pass.

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 1.13" lines 444–461
- `_bmad-output/planning-artifacts/architecture.md` line 540 (Toast.tsx in component inventory)
- `_bmad-output/planning-artifacts/architecture.md` line 235 (toast in the optimistic-store ↔ envelope ↔ idempotency triad)
- `_bmad-output/planning-artifacts/ux-design-specification.md` § Toast lines 1074–1116 (Toast primitive spec — full anatomy, states, content, ARIA)
- Memory: `feedback_anti_flattening.md` (calm-by-default = stance not absence; toast is recovery, not "error")
- Memory: `project_visual_language.md` (--shadow-toast hard offset matches System 7 alert panels)
- Story 1.9 file: useReducer + Context pattern reused for toast-store

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context).

### Debug Log References

- Final test run: `Test Files 13 passed (13) | Tests 108 passed (108)` in 3.32s.
- `pnpm typecheck` exit 0; `pnpm check:gap-i1` exit 0.
- No browser-side smoke needed — Toast doesn't render until something `showToast()`s. Story 1.14 will provide the first real call sites; manual visual verification of the rendered Toast happens then.

### Completion Notes List

**Toast store as a separate provider** (not folded into `optimistic-store.tsx`). Reasons: independently testable; toasts may outlive a single mutation (a Retry that succeeds dismisses the toast, then later the same kind of mutation may fail again — different toast instance); the toast surface is a *recovery* concept, not a *mutation state* concept.

**`pointer-events: none` on the viewport, `auto` on each toast.** This lets users click underneath a stacked toast region (rare at v1 scale but correct). Each toast independently captures clicks for its Retry/Dismiss buttons.

**`column-reverse` stacking** — newest toast renders at the bottom of the stack (closest to where the slide-in animation enters from). UX spec line 1098 calls for this.

**`Toast.test.tsx`'s truncation tests use exact-string matching** to prove the boundary: 40 chars stays untouched; 50 chars becomes 39+ellipsis. The `truncate` helper is exported separately so future surfaces (validation field error displays?) can reuse it.

**`vi.fn()` is used for `onRetry` in tests.** The tests don't yet exercise the full Retry-then-revert-the-mutation flow — that's Story 1.14. For now they assert the component calls onRetry and onDismiss in the right order on click.

**Provider mount ordering matters.** ToastProvider wraps everything else (OptimisticStoreProvider + AppShell + ToastViewport). The viewport sits as a *sibling* of the StoreProvider, not nested — both consume the same toast context. If the viewport were inside `<AppShell>`, the toast would inherit AppShell's max-width: 640px constraint and wouldn't span the full viewport on mobile.

**Test count climbed from 94 → 108** (+14 new tests).

**Architectural-vs-implementation note:** architecture line 540 listed `app/components/Toast.tsx`. The implementation also adds `app/lib/toast-store.tsx` — not in the architecture's file inventory, but consistent with the OptimisticStoreProvider pattern. Document as a minor extension; doesn't conflict with anything.

### File List

**Created:**
- `todo-app/app/lib/toast-store.tsx` (~75 lines — provider + hooks)
- `todo-app/app/lib/toast-store.test.tsx` (5 tests)
- `todo-app/app/components/Toast.tsx` (~70 lines — Toast + ToastViewport + truncate)
- `todo-app/app/components/Toast.module.css`
- `todo-app/app/components/Toast.test.tsx` (7 Toast tests + 2 truncate tests)

**Modified:**
- `todo-app/app/root.tsx` — wrapped OptimisticStoreProvider + AppShell + ToastViewport in `<ToastProvider>`

**Commit:** Story 1.13: Toast component + toast store (parent: Story 1.12).

### Change Log

- **2026-04-30** — Story 1.13 implemented. Toast component + toast store ready. Story 1.14 will replace the three `console.warn` placeholders in the mutation dispatchers with `showToast()` calls + a Retry closure that re-dispatches the original mutation. Total tests: 108/108 across 13 files.
