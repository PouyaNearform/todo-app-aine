# Story 1.11: Checkbox Primitive + Toggle Complete End-to-End

Status: review

## Story

As Sam,
I want to tap a checkbox to mark a todo complete (or undo it),
so that the list reflects what I've finished — instantly, with visible strike-through that holds even for a colorblind user.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 1.11 (lines 408–424).

1. **Given** Story 1.10 is complete, **When** I implement the `Checkbox` primitive + `toggleComplete` service + the per-item `PATCH /api/todos/:id` action, **Then** `Checkbox` is a real `<input type="checkbox">` (hidden via `appearance: none`); 16×16 visible glyph in 1-px frame; vintage Mac checkmark via two CSS borders rotated -45°; ≥44×44 hit area via wrapper padding.
2. **And** focus state shows the `--color-accent` ring on the wrapper (not the glyph); `aria-label` is set from the parent ListItem's description ("Toggle: <description>" or similar).
3. **And** the action calls `buildRequestContext(request)` → fetch the existing todo's `ownerId` → `checkOwnership(ctx, existingOwnerId)` → `toggleComplete(ctx, id, completed)` service.
4. **And** `toggleComplete` service is naturally idempotent (UPDATE to the same value is a no-op).
5. **And** `ListItem` renders strike-through + `--color-fg-faded` text when `completionStatus === true` — color is *not* the only signal (strike-through carries the meaning per FR12).
6. **And** tap dispatches the `toggleComplete` action; optimistic update flips the state immediately; on success `confirmMutation`; on rejection (404 / 5xx) `revertMutation` restores the previous status.
7. **And** the optimistic flip happens synchronously in the same React render tick as the click event (verified by integration test asserting the new state appears before any awaited fetch resolves; Playwright's <100 ms timing assertion lands in Story 2.9).

## Tasks / Subtasks

- [x] **Task 1: Add `TodoUpdateSchema` to validation** (AC 3)
  - [ ] 1.1: Append to `app/lib/validation.ts`:
    ```ts
    export const TodoUpdateSchema = z.object({
      completed: z.boolean(),
    });
    export type TodoUpdateInput = z.infer<typeof TodoUpdateSchema>;
    ```
  - [ ] 1.2: Add 2 tests to `app/lib/validation.test.ts`: accepts `{ completed: true }`, accepts `{ completed: false }`, rejects `{ completed: "yes" }` (string instead of boolean), rejects when `completed` is missing.

- [x] **Task 2: Add `toggleComplete` and `getTodoOwnership` to the service layer** (AC 3, 4)
  - [ ] 2.1: Add to `app/services/todos.ts`:
    ```ts
    // Ownership-bypass lookup. Used ONLY by action handlers to feed
    // checkOwnership(ctx, resourceOwnerId). All other reads filter by ownerId.
    export async function getTodoOwnership(id: string): Promise<string | null> {
      const rows = await db
        .select({ ownerId: todos.ownerId })
        .from(todos)
        .where(eq(todos.id, id))
        .limit(1);
      return rows.length > 0 ? rows[0].ownerId : null;
    }

    export async function toggleComplete(
      ctx: RequestContext,
      id: string,
      completed: boolean,
    ): Promise<Todo | null> {
      const result = await db
        .update(todos)
        .set({ completionStatus: completed })
        .where(and(eq(todos.id, id), eq(todos.ownerId, ctx.ownerId)))
        .returning();
      return result.length > 0 ? result[0] : null;
    }
    ```
  - [ ] 2.2: Import `and` from `drizzle-orm` (already imported `eq, desc`).
  - [ ] 2.3: Add 4 integration tests to `app/services/todos.test.ts`:
    - "toggleComplete flips false → true and returns the updated row"
    - "toggleComplete is idempotent: setting completed=true on an already-true row is a no-op return"
    - "toggleComplete returns null when id doesn't exist"
    - "toggleComplete returns null when the todo belongs to a different ownerId (cross-owner isolation)"
    - "getTodoOwnership returns the ownerId for an existing row"
    - "getTodoOwnership returns null for a non-existent id"

- [x] **Task 3: Build the `Checkbox` primitive component** (AC 1, 2)
  - [ ] 3.1: Create `todo-app/app/components/Checkbox.tsx`. Signature: `function Checkbox({ checked, onToggle, ariaLabel }: { checked: boolean; onToggle: (next: boolean) => void; ariaLabel: string })`.
  - [ ] 3.2: Internals:
    ```tsx
    return (
      <label className={styles.wrapper} data-testid={`todo-checkbox-${ariaLabel}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onToggle(e.target.checked)}
          aria-label={ariaLabel}
          className={styles.input}
        />
        <span className={styles.glyph} aria-hidden="true">
          {checked ? <span className={styles.check} /> : null}
        </span>
      </label>
    );
    ```
    - The `<label>` wrapper provides the 44×44 hit area + the focus ring container.
    - The `<input>` is sized 16×16 + `appearance: none` + visually hidden via `position: absolute; opacity: 0` so the styled `<span>` renders the glyph.
    - The `<span class="glyph">` shows the 16×16 frame; the inner `<span class="check">` (when checked) is the rotated-border tick.
  - [ ] 3.3: Create `todo-app/app/components/Checkbox.module.css`:
    - `.wrapper` — `display: inline-flex; align-items: center; justify-content: center; padding: 14px;` (14px padding around 16px glyph = 44px hit area). Cursor pointer.
    - `.input` — `appearance: none; position: absolute; opacity: 0; width: 16px; height: 16px;` (still tab-focusable; the visible glyph is the `<span>`).
    - `.glyph` — 16×16, 1-px `--color-border`, `display: inline-flex; align-items: center; justify-content: center;`, `--color-bg` background.
    - `.check` — the angled tick: `display: block; width: 10px; height: 6px; border-left: 1px solid var(--color-fg); border-bottom: 1px solid var(--color-fg); transform: rotate(-45deg) translateY(-1px);`.
    - `.input:focus-visible + .glyph` — outline `2px solid var(--color-accent)`, `outline-offset: 3px` (creates the wrapper-level ring per AC 2).
  - [ ] 3.4: **Note:** the `data-testid` uses the `ariaLabel` as the suffix (which is the description). For interactive E2E tests, this matches TEA M-2's `data-testid="todo-checkbox-${id}"` convention loosely — the test design used `id`, but `ariaLabel` (description) is a stable enough discriminator at v1 scale. Document the deviation; Story 2.9 (Playwright) can refactor if needed.

- [x] **Task 4: Add `dispatchToggleComplete` to the optimistic store** (AC 6)
  - [ ] 4.1: Append to `app/lib/optimistic-store.tsx`:
    ```ts
    export async function dispatchToggleComplete(
      dispatch: Dispatch<Action>,
      id: string,
    ): Promise<void> {
      const mutationId = crypto.randomUUID();
      // The reducer will read the previousStatus from current state when
      // computing the toggle; here we don't know the current value (the
      // dispatch reads it inside the reducer). We need to know the *next*
      // value to send to the server, though — read it from the dispatched
      // state by checking pending after dispatch... actually simpler: the
      // ListItem already knows the current state; pass it via the action.
      // For now, encode the desired next value in the dispatch flow:
      // (1) dispatch toggle (reducer flips), (2) read next value from caller.
      // ↳ Caller must pass `next: boolean` so we can POST it.
    }
    ```

    Wait — reconsidering: the dispatcher needs to know `next: boolean` to send to the server. The simplest API is to pass it in:
    ```ts
    export async function dispatchToggleComplete(
      dispatch: Dispatch<Action>,
      id: string,
      next: boolean,
    ): Promise<void> {
      const mutationId = crypto.randomUUID();
      dispatch({ type: "toggleComplete", mutationId, id });
      try {
        const res = await browserKeyFetch(`/api/todos/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: next }),
        });
        const envelope = (await res.json()) as { ok: boolean; data?: Todo; error?: unknown };
        if (envelope.ok) {
          dispatch({ type: "confirmMutation", mutationId });
        } else {
          console.warn("toggleComplete failed; reverting", envelope);
          dispatch({ type: "revertMutation", mutationId });
        }
      } catch (e) {
        console.warn("toggleComplete network error; reverting", e);
        dispatch({ type: "revertMutation", mutationId });
      }
    }
    ```
  - [ ] 4.2: Note: the reducer's `toggleComplete` flips the current state and stashes `previousStatus`. The dispatcher only needs to send the *new* value (which is `!current`) to the server. The caller (ListItem) computes this from props and passes both `id` and the desired `next` value.

- [x] **Task 5: Implement `app/routes/api.todos.$id.ts` resource route** (AC 3)
  - [ ] 5.1: Create the file with a `PATCH` action:
    ```ts
    export async function action({ request, params }: Route.ActionArgs) {
      if (request.method !== "PATCH") {
        return Response.json(err("METHOD_NOT_ALLOWED", "Use PATCH or DELETE"), { status: 405 });
      }
      const id = params.id;
      if (!id) {
        return Response.json(err("VALIDATION", "Missing id"), { status: 400 });
      }

      const ctx = buildRequestContext(request);

      let body: unknown;
      try { body = await request.json(); } catch {
        return Response.json(err("VALIDATION", "Invalid JSON body"), { status: 400 });
      }
      const parsed = TodoUpdateSchema.safeParse(body);
      if (!parsed.success) {
        return Response.json(
          err("VALIDATION", "Invalid input", parsed.error.flatten().fieldErrors as Record<string, string[]>),
          { status: 400 },
        );
      }

      const existingOwner = await getTodoOwnership(id);
      if (existingOwner === null) {
        return Response.json(err("NOT_FOUND", "Todo not found"), { status: 404 });
      }
      checkOwnership(ctx, existingOwner);

      try {
        const updated = await toggleComplete(ctx, id, parsed.data.completed);
        if (updated === null) {
          // Race: row was deleted between the ownership check and the update,
          // OR ownership doesn't match (defense in depth via the WHERE filter).
          return Response.json(err("NOT_FOUND", "Todo not found"), { status: 404 });
        }
        return Response.json(ok(updated), { status: 200 });
      } catch (e) {
        logger.error({ event: "action.toggleComplete.failed", requestId: ctx.requestId, err: String(e) }, "toggleComplete action failed");
        return Response.json(err("INTERNAL", "Couldn't update"), { status: 500 });
      }
    }
    ```
  - [ ] 5.2: This action handles **PATCH only** for Story 1.11. Story 1.12 will extend the same file with a DELETE branch (one action that switches on `request.method`). The 405 fallback already returns the right error for DELETE in this story.
  - [ ] 5.3: Register in `app/routes.ts`: add `route("api/todos/:id", "routes/api.todos.$id.ts")`.

- [x] **Task 6: Wire the Checkbox into ListItem** (AC 5, 6)
  - [ ] 6.1: Modify `app/components/ListItem.tsx` to render the real `<Checkbox>` instead of the placeholder span.
  - [ ] 6.2: ListItem signature stays `{ todo: Todo }`. Add `useDispatch()` hook to get the dispatcher; on toggle, call `dispatchToggleComplete(dispatch, todo.id, !todo.completionStatus)`.
  - [ ] 6.3: Keep the `data-completed` attribute and the `descriptionDone` className for the existing strike-through styling (no CSS change needed).
  - [ ] 6.4: Replace the placeholder visual checkbox span:
    ```tsx
    // OLD:
    <span className={styles.checkbox} aria-hidden="true">
      {completed ? <span className={styles.check} /> : null}
    </span>

    // NEW:
    <Checkbox
      checked={completed}
      onToggle={(next) => dispatchToggleComplete(dispatch, todo.id, next)}
      ariaLabel={`Toggle: ${todo.description}`}
    />
    ```
  - [ ] 6.5: Remove the now-unused `.checkbox` and `.check` rules from `ListItem.module.css` (Checkbox owns its own styling). Keep the row layout, divider, and description rules.

- [x] **Task 7: Tests for the action and the optimistic toggle flow**
  - [ ] 7.1: Create `app/routes/api.todos.$id.test.ts` (node env, mocks the service module). 7 tests:
    - "PATCH with bad method (POST/DELETE) returns 405"
    - "PATCH with bad JSON returns 400 VALIDATION"
    - "PATCH with bad payload (completed: 'yes') returns 400 VALIDATION"
    - "PATCH for non-existent id returns 404"
    - "PATCH for valid id returns 200 with envelope"
    - "PATCH that toggleComplete returns null (race) returns 404"
    - "PATCH that throws returns 500 INTERNAL"
  - [ ] 7.2: Update `app/routes/home.test.tsx`. Add an "optimistic toggle" test:
    - Mount with one todo (completionStatus: false)
    - Mock `fetch` to resolve with `{ ok: true, data: { ...todo, completionStatus: true } }`
    - Click the checkbox (find by `getByRole("checkbox")` or by the label)
    - Assert the ListItem's `data-completed` attribute is `"true"` synchronously (before `await waitFor`)
    - Assert fetch was called with PATCH to `/api/todos/<id>` with `{ completed: true }` body
  - [ ] 7.3: Skip the "Playwright <100 ms" assertion — that's Story 2.9's concern. The integration test above proves the optimistic flip is synchronous, which is what matters for this story.

- [x] **Task 8: Verify gates + manual browser test + commit**
  - [ ] 8.1: `pnpm typecheck` exit 0.
  - [ ] 8.2: `pnpm test` ~80 tests passing (68 prior + ~12 new).
  - [ ] 8.3: `pnpm check:gap-i1` exit 0.
  - [ ] 8.4: `pnpm dev` — visit `localhost:5174/`. Add a todo, click its checkbox; the strike-through should appear instantly. Refresh — the row stays completed (DB persisted). Click again — uncheck.
  - [ ] 8.5: Test cross-owner protection via curl: create a todo with one X-Browser-Key, try to PATCH it with a different X-Browser-Key — should get 404.
  - [ ] 8.6: `git add . && git commit -m "Story 1.11: Checkbox primitive + toggle complete end-to-end"`.

## Dev Notes

### Why this story matters

Story 1.11 is the **second mutation verb**, exercising the same optimistic-rollback pattern as Story 1.10 but with a different semantic shape (toggle vs add). After Story 1.11:
- The optimistic store now has 2 of 3 mutation dispatchers (add, toggle); Story 1.12 closes with delete
- The `:id`-parameterized resource route shape is established for Story 1.12 to extend with DELETE
- `checkOwnership` is called for the first time with a real `resourceOwnerId` (not null) — exercising the ownership-bypass lookup pattern
- The cross-owner isolation contract gets its first wire-level test (curl with mismatched X-Browser-Key returns 404)

### Architectural context

- **Resource-route shape:** `app/routes/api.todos.$id.ts` is a per-item resource route with PATCH (this story) + DELETE (Story 1.12 extension). One file, switches on `request.method`. Architecture line 287/516 mentions `todos.$id.tsx`; in our refactor (Story 1.10) the resource routes live under `api/`, so the file is `api.todos.$id.ts`.
- **Idempotency for toggle:** UPDATE-to-same-value is a SQL no-op (zero rows affected, but `.returning()` may still return the row depending on Drizzle behavior — verify in Task 2). The architecture's "naturally idempotent" claim (line 192) means retries are safe even if the first attempt's response was lost in transit.
- **Ownership-check + service-layer:** the action does TWO queries — `getTodoOwnership` (read), then `toggleComplete` (write). The read feeds `checkOwnership(ctx, existingOwnerId)` per the seam discipline. The write filters by `WHERE id AND ownerId` as defense in depth. **Both layers exist for a reason:** the action-level check is the auth-extension point (when a real auth lands, it throws); the WHERE filter is the data-layer guarantee.
- **`getTodoOwnership` is the only intentional ownership-bypass query.** Documented inline. Stories 1.12 will reuse it for delete.

### Carry-over from prior stories

From **Story 1.10**:
- The resource-route + dispatcher pattern is now the standard for mutations. Story 1.11 follows it exactly.
- `dispatchAddTodo`'s structure (optimistic dispatch → fetch → confirm/revert) is the template for `dispatchToggleComplete`.
- The Vitest pattern scanner from Story 1.6 will see `checkOwnership(` in `api.todos.$id.ts` and pass.

From **Story 1.9**:
- The reducer's `toggleComplete` action flips the matching todo's `completionStatus` AND records `previousStatus` for revert. Already tested — this story doesn't add reducer tests, just dispatcher + UI tests.

From **Story 1.8**:
- `ListItem` exists with placeholder visual checkbox. Story 1.11 replaces it with the real `Checkbox` primitive.
- `data-completed` attribute on `<li>` is the test-discriminator for strike-through assertion.

### Files being modified — current state

- `app/services/todos.ts` (currently has `listTodos`, `createTodo`) — adding `toggleComplete`, `getTodoOwnership`.
- `app/services/todos.test.ts` — adding 6 tests.
- `app/lib/validation.ts` — adding `TodoUpdateSchema`.
- `app/lib/validation.test.ts` — adding 4 tests.
- `app/components/ListItem.tsx` — replacing visual checkbox span with real Checkbox component; wiring onToggle.
- `app/components/ListItem.module.css` — removing `.checkbox` + `.check` rules.
- `app/lib/optimistic-store.tsx` — adding `dispatchToggleComplete`.
- `app/routes.ts` — adding the `:id` resource route registration.
- `app/routes/home.test.tsx` — adding the optimistic-toggle integration test.

### Testing standards

- All new service tests follow Story 1.7 pattern: `describeIfDb`, fresh ownerId per test, `await sql.end()` cleanup.
- The action test mocks `~/services/todos` (covers `listTodos`, `createTodo`, `toggleComplete`, `getTodoOwnership`).
- The optimistic-toggle integration test in `home.test.tsx` requires the Checkbox to be wired through the store — confirms the full optimistic loop works.

### LLM-developer guardrails

- **Don't make Checkbox keyless when used inside `.map()`.** ListItem already has its own key from `<ListItem key={t.id} />` — the Checkbox doesn't need an explicit key.
- **Don't rely on the input's native checkbox styling.** The whole point of `appearance: none` + the styled `<span>` glyph is the vintage-Mac visual. Removing the glyph and using browser-default checkboxes would violate UX spec.
- **Don't skip the `aria-label` prop.** Screen readers need to know which todo is being toggled. `"Toggle: <description>"` is the canonical pattern.
- **Don't compute the next state inside the reducer's `toggleComplete` based on stale `previousStatus`.** The reducer flips the current value in state — same tick, no race. The dispatcher needs to send the *target* value (`!current`) to the server, which is computed at the call site (ListItem knows the current value from its prop).
- **Don't add a "loading" state to Checkbox.** The optimistic flip is the response.
- **Don't expose `getTodoOwnership` to the rest of the app.** It's an action-handler-only helper. ListItems that need to render a todo's owner already get it from the loader-fed store; no other consumer should call this function. Comment it inline.
- **Don't add a CSRF check.** Architecture line 182: the requirement of the custom X-Browser-Key header IS the CSRF mitigation. Adding a token would violate the documented refusal.

### Cross-cutting AC compliance

- ✓ Token discipline: Checkbox.module.css and ListItem.module.css consume only token vars.
- ✓ Import discipline: Checkbox is a pure UI component (no service imports). ListItem imports from `~/lib/optimistic-store` (allowed: components consume the store hook). The action route imports services, middleware, types.
- ✓ Color is never the only signal: `data-completed="true"` + strike-through + `--color-fg-faded` is a three-layer cue.
- ✓ Visible focus indicator: 2-px accent ring on the wrapper.
- ✓ Native HTML semantics over ARIA: real `<input type="checkbox">`, just visually hidden. `aria-label` on the input.
- ✓ data-testid: `todo-checkbox-<aria-label>` on the wrapper.
- ✓ `pnpm typecheck` + `pnpm test` + `pnpm check:gap-i1` all pass.

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 1.11" lines 408–424
- `_bmad-output/planning-artifacts/architecture.md` line 192 (toggle naturally idempotent)
- `_bmad-output/planning-artifacts/architecture.md` lines 432–445 (action handler shape)
- `_bmad-output/planning-artifacts/architecture.md` lines 640–651 (toggle pseudocode flow)
- `_bmad-output/planning-artifacts/ux-design-specification.md` lines 940–977 (Checkbox primitive spec)
- `_bmad-output/planning-artifacts/prd.md` § FR12 (color is not the only signal)
- Story 1.10 file: resource route + dispatcher pattern template
- Memory: `feedback_anti_flattening.md` (color is never the only signal — strike-through carries the meaning)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context).

### Debug Log References

- Final test run: `Test Files 11 passed (11) | Tests 86 passed (86)` in 2.80s.
- `pnpm typecheck` exit 0; `pnpm check:gap-i1` exit 0 (toggleComplete uses `ctx.ownerId`, never `ctx.principal.browserKey`).
- **End-to-end curl verification of all 4 paths:**
  - Create row as owner A → 201 envelope ✓
  - Toggle row as owner A → 200 envelope with `completionStatus: true` ✓
  - Cross-owner PATCH attempt → **404 NOT_FOUND** ✓ (this is the cross-owner isolation guarantee proven at the wire)
  - Bad payload (`completed: "yes"`) → 400 with `fieldErrors.completed` ✓
  - Non-existent id → 404 ✓

### Completion Notes List

**Cross-owner isolation verified at the wire level.** This is the seam architecture's payoff visible in production behavior. Owner A creates a row; Owner B tries to mutate it; the response is `404 NOT_FOUND`. The action's `getTodoOwnership` lookup returns Owner A's id; `checkOwnership(ctx, ownerA)` is a no-op in v1 (auth would throw); the `toggleComplete` service's `WHERE id AND ownerId = ctx.ownerId` filter is what actually denies the mutation. Defense in depth holds.

**Two queries per PATCH is intentional.** The action does a SELECT (`getTodoOwnership`) before the UPDATE (`toggleComplete`). Reasons: (1) feeds `checkOwnership` the right `resourceOwnerId` for the seam discipline; (2) provides a clean 404 path before attempting the update. The performance cost (~5 ms extra per request on local Postgres) is paid for by the auth-readiness payoff: when auth lands, only `checkOwnership` changes — the action shape doesn't.

**`getTodoOwnership` is the only ownership-bypass query in the codebase.** Documented inline. Usage is restricted to action handlers feeding `checkOwnership`. If a future story tries to use it elsewhere, that's a code-review nit. Pattern enforcement could be added to `pnpm check:gap-i1` later (grep `getTodoOwnership(` outside `app/routes/`).

**Checkbox visual hidden via `position: absolute; opacity: 0`** rather than `display: none` — this preserves keyboard focus + screen-reader interaction with the real `<input type="checkbox">`. The styled `<span>` glyph is the visible affordance. Standard accessible-checkbox pattern.

**Optimistic flip is synchronous within the React click event.** The `dispatchToggleComplete` dispatcher fires `dispatch({ type: 'toggleComplete', ... })` before `await browserKeyFetch(...)`. Reducer is synchronous; the new state shows in the very next render. Test asserts `data-completed="true"` *before* the fetch resolves (the fetch is held open via a promise the test controls). Story 2.9's Playwright spec will assert the same property under <100 ms (per architecture line 424).

**`previousStatus` capture works.** The reducer's `toggleComplete` arm reads `target.completionStatus` *before* flipping and stashes it as `pendingMutations[mutationId].previousStatus`. On `revertMutation`, the matching arm restores that value. Verified in Story 1.9's reducer tests; this story's wire-level revert path uses the same code unchanged.

**Resource-route shape stays clean for Story 1.12.** `app/routes/api.todos.$id.ts` currently handles PATCH only, with the `if (request.method !== "PATCH")` guard returning 405 for everything else. Story 1.12 will switch on method: PATCH → toggle, DELETE → delete. The 405 fallback is the right "extension point" — Story 1.12 just adds a `} else if (request.method === "DELETE") {` branch.

**Test count climbed from 68 → 86** (+18 new tests across this story: 4 schema + 6 service + 7 action + 1 RTL toggle).

### File List

**Created:**
- `todo-app/app/components/Checkbox.tsx` (~22 lines)
- `todo-app/app/components/Checkbox.module.css`
- `todo-app/app/routes/api.todos.$id.ts` (~70 lines — resource route)
- `todo-app/app/routes/api.todos.$id.test.ts` (7 action tests)

**Modified:**
- `todo-app/app/lib/validation.ts` — added `TodoUpdateSchema`
- `todo-app/app/lib/validation.test.ts` — 4 new tests
- `todo-app/app/services/todos.ts` — added `toggleComplete` + `getTodoOwnership`
- `todo-app/app/services/todos.test.ts` — 6 new integration tests
- `todo-app/app/lib/optimistic-store.tsx` — added `dispatchToggleComplete`
- `todo-app/app/components/ListItem.tsx` — wired Checkbox + dispatcher
- `todo-app/app/components/ListItem.module.css` — removed orphan `.checkbox`/`.check` (Checkbox owns them)
- `todo-app/app/routes.ts` — registered `/api/todos/:id`
- `todo-app/app/routes/home.test.tsx` — extended vi.mock; added optimistic-toggle RTL test

**Commit:** `Story 1.11: Checkbox primitive + toggle complete end-to-end` (parent: Story 1.10).

### Change Log

- **2026-04-30** — Story 1.11 implemented. Second mutation verb landed; Checkbox primitive + dispatcher pattern + per-item resource route. Cross-owner isolation verified end-to-end via curl (Owner B cannot mutate Owner A's row → 404). Total tests: 86/86 across 11 files. Story 1.12 (delete) will extend `api.todos.$id.ts` with a method branch — same pattern, fewer new pieces.
