# Story 1.12: Delete Glyph + Delete End-to-End

Status: review

## Story

As Sam,
I want to tap a × glyph to delete a todo permanently with no confirmation prompt,
so that clearing the list is single-tap-fast — recovery happens via Toast on backend rejection only.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 1.12 (lines 426–442).

1. **Given** Story 1.11 is complete, **When** I add the delete glyph to `ListItem` + `deleteTodo` service + extend `api.todos.$id.ts` with a DELETE branch, **Then** the delete glyph (`×`) renders right-aligned in `ListItem`, 18-px in `--color-fg-muted`, ≥44×44 hit area.
2. **And** the glyph is hidden by default on desktop (opacity 0), reveals on row hover via `--motion-duration-quick`; always visible at ≤640 px breakpoint (mobile has no hover).
3. **And** `aria-label="Delete: <description>"` is set on the button so screen-reader users know what they're deleting.
4. **And** the action calls `buildRequestContext(request)` → `getTodoOwnership(id)` → `checkOwnership(ctx, existingOwner)` → `deleteTodo(ctx, id)` service.
5. **And** the service treats not-found as success (idempotent — already-gone IS the desired state). Returns the deleted row OR `null` on already-gone; the action returns 200 OK envelope in both cases.
6. **And** tap dispatches the `deleteTodo` action; row removed optimistically; on success `confirmMutation`; on transient 5xx `revertMutation` restores the row at its `created_at` position (the reducer's `kind: 'delete'` revert path from Story 1.9).
7. **And** **no confirmation prompt** (FR7); recovery is via Toast (Story 1.13 + 1.14 — for Story 1.12 the rollback still uses `console.warn` placeholder).

## Tasks / Subtasks

- [x] **Task 1: Add `deleteTodo` to the service layer** (AC 4, 5)
  - [ ] 1.1: Append to `app/services/todos.ts`:
    ```ts
    export async function deleteTodo(
      ctx: RequestContext,
      id: string,
    ): Promise<Todo | null> {
      const result = await db
        .delete(todos)
        .where(and(eq(todos.id, id), eq(todos.ownerId, ctx.ownerId)))
        .returning();
      return result.length > 0 ? result[0] : null;
    }
    ```
  - [ ] 1.2: Add 3 integration tests to `app/services/todos.test.ts`:
    - "deleteTodo removes the row and returns it"
    - "deleteTodo returns null when id doesn't exist (idempotent — already-gone)"
    - "deleteTodo returns null when row belongs to a different owner (cross-owner protection)"

- [x] **Task 2: Add the DELETE branch to `api.todos.$id.ts`** (AC 4, 5)
  - [ ] 2.1: Modify the action's method dispatch. Replace the `if (request.method !== "PATCH") return 405` guard with a switch:
    ```ts
    if (request.method === "PATCH") {
      // existing PATCH handler body
    } else if (request.method === "DELETE") {
      // new DELETE handler
    } else {
      return Response.json(err("METHOD_NOT_ALLOWED", "Use PATCH or DELETE"), { status: 405 });
    }
    ```
  - [ ] 2.2: DELETE handler logic:
    - `buildRequestContext(request)`
    - `getTodoOwnership(id)`; if `null`, return 200 with `ok({ deleted: true })` — already-gone is success per AC 5
    - `checkOwnership(ctx, existingOwner)` (the seam discipline; no-op v1)
    - `deleteTodo(ctx, id)` — captures the deleted row or null
    - On any thrown error, log + return 500 INTERNAL
    - Return 200 OK with envelope `ok({ deleted: <Todo or null> })`
  - [ ] 2.3: **DELETE has no request body to validate.** Skip the JSON parse and Zod step.
  - [ ] 2.4: Add 4 action tests to `api.todos.$id.test.ts`:
    - "DELETE for non-existent id returns 200 with deleted: true (idempotent)"
    - "DELETE for valid id returns 200 with envelope and the deleted row"
    - "DELETE for cross-owner row returns 200 with deleted: true (not 403/404 — already-gone semantics)"
    - "DELETE that throws returns 500 INTERNAL"

- [x] **Task 3: Add `dispatchDeleteTodo` helper** (AC 6)
  - [ ] 3.1: Append to `app/lib/optimistic-store.tsx`:
    ```ts
    export async function dispatchDeleteTodo(
      dispatch: Dispatch<Action>,
      id: string,
    ): Promise<void> {
      const mutationId = crypto.randomUUID();
      dispatch({ type: "deleteTodo", mutationId, id });

      try {
        const res = await browserKeyFetch(`/api/todos/${id}`, {
          method: "DELETE",
        });
        const envelope = (await res.json()) as { ok: boolean; error?: unknown };
        if (envelope.ok) {
          dispatch({ type: "confirmMutation", mutationId });
        } else {
          console.warn("deleteTodo failed; reverting", envelope);
          dispatch({ type: "revertMutation", mutationId });
        }
      } catch (e) {
        console.warn("deleteTodo network error; reverting", e);
        dispatch({ type: "revertMutation", mutationId });
      }
    }
    ```
  - [ ] 3.2: No body, no Content-Type header — DELETE is a side-effect-only verb. The X-Browser-Key header is still injected by `browserKeyFetch`.

- [x] **Task 4: Add the delete glyph affordance to `ListItem`** (AC 1, 2, 3, 6)
  - [ ] 4.1: Modify `app/components/ListItem.tsx`. Replace the `<span aria-hidden>×</span>` placeholder with a real `<button>`:
    ```tsx
    <button
      type="button"
      className={styles.deleteButton}
      aria-label={`Delete: ${todo.description}`}
      data-testid={`todo-delete-${todo.id}`}
      onClick={() => dispatchDeleteTodo(dispatch, todo.id)}
    >
      <span className={styles.deleteGlyph} aria-hidden="true">×</span>
    </button>
    ```
  - [ ] 4.2: Modify `app/components/ListItem.module.css`:
    - Replace the `.delete` rule with `.deleteButton` (the wrapper button) and `.deleteGlyph` (the inner ×).
    - `.deleteButton`:
      - 44×44 hit area (`width: 44px; height: 44px;`)
      - flex-centered content
      - `border: none; background: transparent; cursor: pointer; padding: 0;`
      - `opacity: 0` by default on desktop (≥641px); `transition: opacity var(--motion-duration-quick) var(--motion-easing);`
      - `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: -2px; opacity: 1; }` (focused = visible, even without hover)
    - `.deleteGlyph`: 18-px font-size, `color: var(--color-fg-muted);`, line-height 1
    - `.item:hover .deleteButton { opacity: 1; }` — row hover reveals the glyph
    - `@media (max-width: 640px) { .deleteButton { opacity: 1; } }` — always visible on mobile
  - [ ] 4.3: **Don't add a `:hover` on the button itself** — the *row* hover triggers the reveal. This is consistent with UX spec § ListItem ("Delete glyph fades to 100% opacity over `--motion-duration-quick`").

- [x] **Task 5: Tests for the optimistic-delete UI flow** (AC 6)
  - [ ] 5.1: Add 1 RTL test to `app/routes/home.test.tsx`:
    - "optimistically deletes when delete button is clicked"
    - Mount with one todo
    - Mock fetch to resolve with `{ ok: true, data: { deleted: true } }` (held open via promise pattern from Story 1.11's toggle test)
    - Click `getByLabelText("Delete: <description>")`
    - Assert the row disappears synchronously (queryByTestId(`todo-item-${id}`) returns null) before the fetch resolves
    - Assert fetch was called with DELETE to `/api/todos/<id>`
  - [ ] 5.2: Update `home.test.tsx`'s vi.mock to add `deleteTodo: vi.fn()` to the services mock.

- [x] **Task 6: Verify gates + browser test + commit**
  - [ ] 6.1: `pnpm typecheck` exit 0.
  - [ ] 6.2: `pnpm test` ~96 tests passing (86 prior + ~10 new).
  - [ ] 6.3: `pnpm check:gap-i1` exit 0.
  - [ ] 6.4: `pnpm dev` browser test:
    - Add a todo, click ×, row disappears
    - Hover-reveal works on desktop (mouse-over a row, × fades in)
    - Refresh — deleted row stays gone
    - Curl: `DELETE /api/todos/<nonexistent-id>` returns 200 with `{ ok: true, data: { deleted: true } }`
    - Curl: cross-owner DELETE returns 200 (idempotent already-gone semantics, NOT 404 like toggle)
  - [ ] 6.5: `git add . && git commit -m "Story 1.12: delete glyph + delete end-to-end"`.

## Dev Notes

### Why this story matters

Story 1.12 closes the **third mutation verb**, completing the read+CRUD vocabulary for v1. After this story:
- All three mutation dispatchers exist (`dispatchAddTodo`, `dispatchToggleComplete`, `dispatchDeleteTodo`)
- The optimistic-rollback contract is wired for all three verbs
- `app/services/todos.ts` matches its architectural shape (line 293: "listTodos / createTodo / toggleComplete / deleteTodo")
- The per-item resource route handles both PATCH and DELETE — clean RESTful shape
- Stories 1.13 and 1.14 can now layer the Toast surface across all three verbs uniformly

### Idempotency for DELETE — already-gone is success

Per AC 5 and architecture line 193 ("`DELETE /todos/:id`: naturally idempotent (deleting a deleted todo returns 200)"). Two consequences:

1. **The service returns null on already-gone, but the action treats null as success.** This makes retries safe — a network blip after a successful delete won't surface as an error on the next attempt.
2. **Cross-owner DELETE attempts return 200 with `deleted: true`** rather than 404. Reasoning: from the caller's perspective, "this id is no longer something I can delete" is functionally equivalent to "I already deleted it." Returning 200 makes the v1 wire behavior match the idempotent semantics. **This deviates from the toggle's 404 cross-owner behavior** — toggle wants the strong "not yours" signal because the caller might retry; delete is one-shot and "already gone" is the right signal.

This deviation is documented in Completion Notes — it's a deliberate semantic difference between PATCH and DELETE, not an inconsistency.

### Architectural context

- **DELETE service shape:** `db.delete(todos).where(and(eq(todos.id, id), eq(todos.ownerId, ctx.ownerId))).returning()`. The WHERE filter handles cross-owner protection; the `.returning()` exposes whether a row was actually deleted.
- **Action method-dispatch:** the resource route at `app/routes/api.todos.$id.ts` now handles two methods. `if/else if/else` chain on `request.method`. Story 1.11's PATCH branch stays unchanged.
- **No body for DELETE:** the request has no payload. No `request.json()` call, no Zod schema. Skip those steps in the DELETE branch.
- **Reducer's `kind: 'delete'` revert path** (from Story 1.9): re-inserts `previousTodo` at its `created_at` DESC position via `insertByCreatedAtDesc`. Tested in Story 1.9. Story 1.12 just exercises that code path live.

### Carry-over

From **Story 1.11**: the resource route + dispatcher + ListItem-wires-button pattern. Story 1.12 follows it exactly with smaller surface (no Zod schema, no body).

From **Story 1.10**: `dispatchAddTodo`'s structure for the dispatcher — copied with minor adjustments for DELETE.

From **Story 1.9**: the reducer's `deleteTodo` and `revertMutation(kind: 'delete')` arms are already tested. Just being exercised live for the first time.

### Files being modified

- `app/services/todos.ts` — add `deleteTodo` (~10 lines)
- `app/services/todos.test.ts` — 3 new integration tests
- `app/routes/api.todos.$id.ts` — add DELETE branch (~30 lines)
- `app/routes/api.todos.$id.test.ts` — 4 new action tests
- `app/lib/optimistic-store.tsx` — add `dispatchDeleteTodo` (~25 lines)
- `app/components/ListItem.tsx` — replace span placeholder with button
- `app/components/ListItem.module.css` — replace `.delete` with `.deleteButton` + `.deleteGlyph`; add hover/focus/mobile rules
- `app/routes/home.test.tsx` — add deleteTodo to vi.mock; add 1 RTL test

### Testing standards

- Service tests: `describeIfDb` skip-if-no-DB, fresh ownerIds, `await sql.end()` cleanup.
- Action tests: `vi.mock("~/services/todos")` covering all four service functions now.
- RTL test for delete: same pattern as the toggle test from Story 1.11 (held-open promise to prove optimistic UI fires before fetch resolves).

### LLM-developer guardrails

- **Don't add a confirmation prompt or "Are you sure?" modal.** AC 7 explicitly forbids it (FR7). Recovery is via Toast on backend rejection (Stories 1.13/1.14).
- **Don't return 404 from the DELETE action when the row is already gone.** Return 200 with envelope `{ deleted: true }`. This matches the idempotency contract.
- **Don't make the delete glyph permanently visible on desktop.** UX spec is explicit: hidden by default, reveals on row hover. Always-visible would clutter the calm aesthetic.
- **Don't skip the focus-visible visibility rule.** `:focus-visible { opacity: 1 }` keeps the affordance keyboard-discoverable even without a mouse hover. Without it, keyboard-only users couldn't see what they're about to activate.
- **Don't make the button's `aria-label` something generic like "Delete".** The description is the disambiguator — screen-reader users navigating a list of × buttons need to know which row each one targets.
- **Don't add a CSS transition on the row's `opacity` on delete.** UX spec § ListItem "Reverting (after backend rejection)" shows a 200-ms fade-out — that's the *revert* path. The success path is instantaneous (the row is just gone). For Story 1.12, no fade animation; the optimistic remove + the 200ms revert-fade are both instant in v1.

### Cross-cutting AC compliance

- ✓ Token discipline: ListItem.module.css uses only token vars (motion + color tokens for the fade).
- ✓ Import discipline: ListItem imports `dispatchDeleteTodo` from `~/lib/optimistic-store` (allowed). The action route imports from services + middleware + types.
- ✓ Color is never the only signal: the × glyph is a shape, not a color signal. The hover-reveal animation is a motion cue.
- ✓ Visible focus indicator: focus-visible outline + opacity:1 on the button.
- ✓ data-testid: `todo-delete-${todo.id}` on the button per TEA M-2.
- ✓ Optimistic UI rollback: kind=delete revert restores the row at correct position (Story 1.9's `insertByCreatedAtDesc`).

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 1.12" lines 426–442
- `_bmad-output/planning-artifacts/architecture.md` line 193 (DELETE naturally idempotent)
- `_bmad-output/planning-artifacts/architecture.md` line 293 (todos.ts exports the four CRUD verbs)
- `_bmad-output/planning-artifacts/ux-design-specification.md` § ListItem (delete glyph, hover-reveal, mobile-always-visible, revert fade)
- `_bmad-output/planning-artifacts/prd.md` § FR7 (no confirmation prompt)
- Story 1.9 file: reducer's deleteTodo + revertMutation(delete) paths
- Story 1.11 file: per-item resource route pattern template

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context).

### Debug Log References

- Final test run: `Test Files 11 passed (11) | Tests 94 passed (94)` in 2.77s.
- `pnpm typecheck` exit 0.
- **End-to-end DELETE verification:**
  - Create as Owner A → DELETE returns 200 with the deleted row ✓
  - DELETE again (already-gone) → 200 with `{ deleted: true, row: null }` ✓
  - DELETE non-existent id → 200 with `{ deleted: true, row: null }` ✓
  - GET / shows EmptyState after deletion ✓

### Completion Notes List

**DELETE returns 200 even for cross-owner attempts**, deviating from PATCH's 404. This is the intentional already-gone semantics: from the caller's perspective, "this row is no longer something I can act on" is functionally equivalent to "I already deleted it." Returning 200 makes retries idempotent in all paths. PATCH/toggle has different semantics — the caller might retry against a real condition, so the 404 is the right signal there.

**Refactored the resource route into method-dispatched helpers** (`handlePatch` and `handleDelete`) rather than letting the action grow into a long if/else. Cleaner separation of concerns; each helper owns its own envelope shape and error handling.

**Delete glyph hover-reveal works on desktop, always-visible on mobile.** CSS-only; no JS for the visibility toggle. The `:focus-visible` rule keeps the affordance keyboard-discoverable even without a mouse hover (`opacity: 1` on the button itself). The accent-colored outline ring lands on focus per UX spec.

**Three mutation verbs done.** After Story 1.12, the app supports the full add/toggle/delete vocabulary end-to-end with optimistic UI for all three. Stories 1.13/1.14 will replace the three `console.warn` placeholders with the real Toast surface — the dispatchers' structure is already shaped for that swap (each one calls `console.warn` at the exact spot where `dispatch({ type: 'showToast', ... })` will go).

**Test count climbed from 86 → 94** (+8 new tests across this story: 3 service + 4 action + 1 RTL).

**Touch-target audit:** the 44×44 hit area on `.deleteButton` matches the architecture's WCAG-AA requirement. UX spec required ≥44 px; we hit exactly that. Visible glyph is 18 px (the `×` character) inside the 44-px button — same hit-area-larger-than-glyph pattern as the Checkbox primitive (Story 1.11).

**No fade animation on optimistic delete.** UX spec § ListItem mentions a 200-ms fade-out for the *revert* path (kind=delete revert). For Story 1.12, both success-delete and revert-delete are instant. Adding the revert fade would require coordinating the reducer + a CSS animation + a delayed re-insertion — a notable complexity bump. Deferred to Story 1.14 (Wire Optimistic Rollback + Retry Across All Three Mutations) or Story 2.7's polish pass.

### File List

**Modified:**
- `todo-app/app/services/todos.ts` — added `deleteTodo` (~10 lines)
- `todo-app/app/services/todos.test.ts` — 3 new integration tests
- `todo-app/app/routes/api.todos.$id.ts` — refactored to method-dispatch + DELETE handler (~110 lines total)
- `todo-app/app/routes/api.todos.$id.test.ts` — 4 new DELETE action tests
- `todo-app/app/lib/optimistic-store.tsx` — added `dispatchDeleteTodo` (~22 lines)
- `todo-app/app/components/ListItem.tsx` — replaced placeholder span with real `<button>` wired to dispatcher
- `todo-app/app/components/ListItem.module.css` — `.delete` → `.deleteButton` + `.deleteGlyph` with hover-reveal/focus-visible/mobile-always-visible rules
- `todo-app/app/routes/home.test.tsx` — extended vi.mock; added optimistic-delete RTL test

**Commit:** `68d8264 Story 1.12: delete glyph + delete end-to-end` (parent: Story 1.11).

### Change Log

- **2026-04-30** — Story 1.12 implemented. Third mutation verb landed; three-verb CRUD vocabulary now end-to-end. The optimistic-rollback contract is operational across all mutations. DELETE's idempotent already-gone semantics differ from PATCH's 404 by design — captured in Completion Notes. Total tests: 94/94 across 11 files. Stories 1.13 (Toast) + 1.14 (wire toasts to mutation failures) will replace the three `console.warn` placeholders with a real recovery surface.
