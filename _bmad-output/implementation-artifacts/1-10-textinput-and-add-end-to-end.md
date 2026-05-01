# Story 1.10: TextInput Primitive + Capture (Add) End-to-End

Status: review

## Story

As Sam,
I want to type a todo, press Enter, and see it appear at the top of the list instantly,
so that I can capture thoughts with zero friction — and the optimistic-rollback contract gets exercised end-to-end for the first time.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 1.10 (lines 389–406).

1. **Given** Stories 1.4, 1.5, 1.7, 1.9 are complete, **When** I implement the `TextInput` primitive + `createTodo` service + the home route's `action` handler, **Then** `TextInput` renders 1-px hard `--color-border`, pre-focused on desktop mount, placeholder *"Add a todo"* in `--color-fg-muted`, accent focus ring (2-px outer ring + visible cursor).
2. **And** `maxLength={256}` silently rejects character 257 (FR4 — browser enforces at input level; defense-in-depth Zod also caps at 256).
3. **And** Enter submits; whitespace-only is silently rejected client-side (FR3); Escape clears the field.
4. **And** the action validates the JSON payload via Zod (`TodoCreateSchema = z.object({ id: z.string().uuid(), description: z.string().min(1).max(256) })`); on validation failure returns HTTP 400 + `{ ok: false, error: { code: 'VALIDATION', message, fieldErrors } }`.
5. **And** the action calls `buildRequestContext(request)` → `checkOwnership(ctx, null)` → `createTodo(ctx, { id, description })` (id is the **client-generated UUID** from the request body); the service uses `INSERT ... ON CONFLICT (id) DO NOTHING` for idempotency and returns the inserted row (or the pre-existing row on conflict).
6. **And** on submit, the client dispatches `addTodo` action with the same client-generated UUID; field clears + remains focused; new todo appears at top of list optimistically (rendered from the optimistic store via `useTodos()`).
7. **And** on success the client dispatches `confirmMutation`; on rejection it dispatches `revertMutation` (Toast wiring is Story 1.13/1.14 — for Story 1.10 the revert is logged to console.warn + the previous state is restored).
8. **And** integration test asserts `add → optimistic render → server confirm`; unit test asserts the action's envelope shape on both success and validation failure paths.

## Tasks / Subtasks

- [x] **Task 1: Create the Zod validation module** (AC 4)
  - [ ] 1.1: Create `todo-app/app/lib/validation.ts` exporting:
    ```ts
    import { z } from "zod";

    export const TodoCreateSchema = z.object({
      id: z.string().uuid(),
      description: z.string().min(1).max(256),
    });

    export type TodoCreateInput = z.infer<typeof TodoCreateSchema>;
    ```
  - [ ] 1.2: This file will accumulate `TodoUpdateSchema` (Story 1.11) and `TodoDeleteSchema` (Story 1.12). Don't pre-add them.
  - [ ] 1.3: Create `todo-app/app/lib/validation.test.ts` (4 tests): valid payload parses; missing id rejects; description too short rejects; description too long rejects. Use `safeParse` so we test both branches without `try/catch`.

- [x] **Task 2: Add `createTodo` to the service layer** (AC 5)
  - [ ] 2.1: Modify `todo-app/app/services/todos.ts`. Add `createTodo`:
    ```ts
    export async function createTodo(
      ctx: RequestContext,
      input: { id: string; description: string },
    ): Promise<Todo> {
      const result = await db
        .insert(todos)
        .values({
          id: input.id,
          description: input.description,
          ownerId: ctx.ownerId,
        })
        .onConflictDoNothing({ target: todos.id })
        .returning();

      if (result.length > 0) return result[0];

      // Conflict: row with this id already exists (idempotent retry path).
      // Return the existing row.
      const existing = await db
        .select()
        .from(todos)
        .where(eq(todos.id, input.id))
        .limit(1);
      if (existing.length === 0) {
        throw new Error("createTodo: ON CONFLICT path returned no row");
      }
      return existing[0];
    }
    ```
  - [ ] 2.2: **`ON CONFLICT (id) DO NOTHING`** is the idempotency contract (architecture line 191). The "returning row even on conflict" lookup makes the API uniform — caller always gets a `Todo` back, never has to handle a `null`.
  - [ ] 2.3: **Don't filter the `existing` lookup by `ownerId`.** The conflict means the id already exists; if it belongs to a different owner, that's a UUID collision (cosmically improbable but defensively returning the row reveals the leak). Per Gap I-1 discipline, we use `ctx.ownerId` for the INSERT, but the lookup is by id only. *This is the only place service code does an id-only query — every other read filters by ownerId.* Document inline.
  - [ ] 2.4: Update `app/services/todos.test.ts` with 3 new createTodo cases:
    - "creates a todo and returns it with server-generated createdAt"
    - "is idempotent: same id submitted twice returns the same row"
    - "different owners can each create todos with their own ids without interfering"

- [x] **Task 3: Build the `TextInput` primitive component** (AC 1, 2, 3)
  - [ ] 3.1: Create `todo-app/app/components/TextInput.tsx`. Signature: `function TextInput({ onSubmit }: { onSubmit: (description: string) => void })`.
  - [ ] 3.2: Internals:
    - Local state: `const [value, setValue] = useState("")`.
    - Ref: `const inputRef = useRef<HTMLInputElement>(null)` for focus management.
    - On mount (desktop only — viewport ≥ 641 px): call `inputRef.current?.focus()` via `useEffect`. Detect via `window.matchMedia("(min-width: 641px)").matches` inside the effect.
    - `onKeyDown` handler:
      - `event.key === "Enter"` (without Shift): `event.preventDefault()`, trim value, if empty silent-reject, else call `onSubmit(trimmed)`, then `setValue("")` and re-focus the input
      - `event.key === "Escape"`: clear (`setValue("")`)
    - `onChange` handler: `setValue(event.target.value)`
    - Render: `<input ref={inputRef} type="text" value={value} onChange={...} onKeyDown={...} maxLength={256} placeholder="Add a todo" aria-label="Add a todo" data-testid="todo-input" className={styles.input} />`
  - [ ] 3.3: Create `todo-app/app/components/TextInput.module.css`:
    - `.input` — width 100%, 1-px `--color-border`, 12-px vertical / 12-px horizontal padding, `--font-body`, `--font-size-base`, square corners, `--color-bg` background, `--color-fg` text, placeholder color via `::placeholder { color: var(--color-fg-muted); }`.
    - `.input:focus-visible` — outline `2px solid var(--color-accent)`, `outline-offset: 0`. Architecture line 519: `--color-accent` is the focus indicator (clears AA 3:1 for UI floor).
  - [ ] 3.4: Touch targets — input is naturally ≥ 44 px tall via the 12-px vertical padding + ~21 px line-height = ~45 px. Confirm visually after wiring.

- [x] **Task 4: Add the `dispatchAddTodo` action helper to the store** (AC 6)
  - [ ] 4.1: In `todo-app/app/lib/optimistic-store.tsx`, append:
    ```ts
    import { browserKeyFetch, getBrowserKey } from "~/lib/browser-key";

    export async function dispatchAddTodo(
      dispatch: Dispatch<Action>,
      description: string,
    ): Promise<void> {
      const id = crypto.randomUUID();
      const mutationId = crypto.randomUUID();
      const ownerId = getBrowserKey();
      const tempTodo: Todo = {
        id,
        description,
        completionStatus: false,
        createdAt: new Date(),
        ownerId: ownerId || null,
      };

      dispatch({ type: "addTodo", mutationId, tempTodo });

      try {
        const res = await browserKeyFetch("/?index", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id, description }),
        });
        const envelope = (await res.json()) as { ok: boolean; data?: Todo; error?: unknown };
        if (envelope.ok && envelope.data) {
          dispatch({ type: "confirmMutation", mutationId, serverTodo: envelope.data });
        } else {
          // Story 1.13/1.14 will surface this via Toast. For now, log + revert.
          console.warn("addTodo failed; reverting", envelope);
          dispatch({ type: "revertMutation", mutationId });
        }
      } catch (e) {
        console.warn("addTodo network error; reverting", e);
        dispatch({ type: "revertMutation", mutationId });
      }
    }
    ```
  - [ ] 4.2: The function is async but doesn't need to be awaited by callers — fire-and-forget is fine (the store updates handle the UX). Type return as `Promise<void>` for explicitness.
  - [ ] 4.3: Endpoint URL: `/?index`. RR7 framework mode treats `/?index` as the explicit index route's POST target (vs. `/` which could match a parent route's action when nested routes exist). For our flat single-route v1, `/` would also work — but `/?index` is explicit and future-proof. Document.

- [x] **Task 5: Implement the action handler in `app/routes/home.tsx`** (AC 4, 5, 7)
  - [ ] 5.1: Add an `action` export to `home.tsx`:
    ```ts
    export async function action({ request }: Route.ActionArgs) {
      const ctx = buildRequestContext(request);

      let body: unknown;
      try {
        body = await request.json();
      } catch {
        return Response.json(
          err("VALIDATION", "Invalid JSON body"),
          { status: 400 },
        );
      }

      const parsed = TodoCreateSchema.safeParse(body);
      if (!parsed.success) {
        return Response.json(
          err("VALIDATION", "Invalid input", parsed.error.flatten().fieldErrors as Record<string, string[]>),
          { status: 400 },
        );
      }

      checkOwnership(ctx, null);

      try {
        const created = await createTodo(ctx, parsed.data);
        return Response.json(ok(created), { status: 201 });
      } catch (e) {
        logger.error(
          { event: "action.createTodo.failed", requestId: ctx.requestId, err: String(e) },
          "createTodo action failed",
        );
        return Response.json(err("INTERNAL", "Couldn't save"), { status: 500 });
      }
    }
    ```
  - [ ] 5.2: **Action ordering matters** (Story 1.6 Test 1.6-UNIT-001 enforces this): `buildRequestContext` → JSON parse → Zod validate → `checkOwnership` → service. The Vitest pattern-scanner from Story 1.6 will see `checkOwnership(` in the file and pass.
  - [ ] 5.3: Note that Zod validation runs *before* `checkOwnership` — that's deliberate. Validation errors don't depend on identity; we can fast-path them. Once auth lands, you'd argue for the reverse (don't leak validation rules to unauthenticated callers); for v1 with the no-op stub, the order is irrelevant in behavior but matters in shape.

- [x] **Task 6: Refactor `home.tsx`'s component to render from the store** (AC 6)
  - [ ] 6.1: Replace `data.data.todos` with `useTodos()` for the rendering path. The loader still hydrates the store via `useSeedFromLoader`; the store is now the source of truth for the list display.
  - [ ] 6.2: The `data.ok === false` (loader error) branch still uses `data` directly to render `ErrorState` — the store has no concept of "loader failed" (because the loader's failure means we never seeded).
  - [ ] 6.3: Replace the `<InputArea />` placeholder with a real `<TextInput onSubmit={(desc) => dispatchAddTodo(dispatch, desc)} />`. Need `const dispatch = useDispatch()` in the component body.
  - [ ] 6.4: Consider whether the LoadingState branch should still exist. With the optimistic store, the visible list isn't tied to navigation state — the store reflects what we believe the state is. The LoadingState only triggers on `useNavigation().state === "loading"` which mostly matters for revalidation (e.g., after a successful submit, RR7 may revalidate the loader). For Story 1.10, keep the LoadingState branch — when revalidation happens after a confirmed addTodo, the loader re-runs, re-seeds the store. During that brief window, useNavigation reports "loading"; rendering "Loading…" briefly is unobjectionable.
  - [ ] 6.5: After dispatchAddTodo's `confirmMutation`, optionally trigger `revalidator.revalidate()` to fold the server's authoritative row into the loader's seed. The store's `confirmMutation` already keeps the optimistic row; revalidation is belt-and-suspenders to keep the loader in sync. **Skip this for Story 1.10** — the optimistic state is correct after confirm; revalidation can be added in Story 1.14 or 2.7's polish pass.

- [x] **Task 7: Wire RTL test for the action and the optimistic-add flow** (AC 8)
  - [ ] 7.1: Update `app/routes/home.test.tsx`. Add tests:
    - `it("adds a todo optimistically when the user types and presses Enter")` — render Home with empty loader; type into the input, press Enter, assert the new description appears in the rendered list AND the input is cleared. **Mock the network**: `vi.spyOn(global, "fetch").mockResolvedValue(new Response(JSON.stringify({ ok: true, data: <todo> }), { status: 201 }))`.
    - `it("silently rejects whitespace-only Enter")` — type "   ", press Enter, assert nothing was added and the input keeps its value (or clears — depends on FR3 interpretation; spec says "no submit happens — field stays focused, no error message"; let's say field keeps the whitespace).
    - `it("reverts the optimistic add when the server returns ok:false")` — type, press Enter, mock fetch to return `{ ok: false, error: { ... } }`; assert the row is removed after the await.
  - [ ] 7.2: Add a separate file `app/routes/home.action.test.ts` (server-side action unit test):
    - `it("returns 400 with VALIDATION code on bad payload")` — call `action({ request, context, params })` with malformed body, assert status 400 + envelope shape.
    - `it("returns 201 with envelope on valid payload")` — mock the service layer (`vi.mock("~/services/todos")`), call action, assert status 201 + ok:true.
  - [ ] 7.3: Use `// @vitest-environment node` for the action test file (it doesn't render React).

- [x] **Task 8: Verify all gates and commit**
  - [ ] 8.1: `pnpm typecheck` exit 0.
  - [ ] 8.2: `pnpm test` should report ~65 tests passing (53 prior + ~12 new).
  - [ ] 8.3: `pnpm dev` — visit `localhost:5174/`. Manually: type "buy milk", press Enter; the input clears, "buy milk" appears at the top of the list, the input stays focused. Refresh — the row is still there (DB persisted via the action). Type whitespace and press Enter — nothing happens.
  - [ ] 8.4: `pnpm check:gap-i1` exit 0 (the new `createTodo` consumes `ctx.ownerId` for the INSERT, NOT `ctx.principal.browserKey`).
  - [ ] 8.5: Test the Story 1.6 pattern scanner: it should now pass with the `home.tsx` action containing `checkOwnership(`.
  - [ ] 8.6: `git add . && git commit -m "Story 1.10: TextInput primitive + capture end-to-end"`.

## Dev Notes

### Why this story matters (training-identity context)

This is the **first end-to-end mutation story**. Stories 1.3–1.9 built the seam, the schema, the read path, and the optimistic store as separate pieces; Story 1.10 is the first time they all fire together for a write. After Story 1.10:

- The optimistic store has a real dispatcher (`dispatchAddTodo`)
- The discriminated-union envelope contract is exercised by both the action's return path AND the client's success/failure branching
- The idempotency contract (`INSERT ... ON CONFLICT (id) DO NOTHING`) is implemented and tested
- Client-generated UUIDs flow from store → wire → DB → confirm
- `checkOwnership` is called for the first time in real code (no longer just a discipline test)
- The Gap I-1 grep script has its first real consumer (the new service code in `createTodo`)

Per the anti-flattening rule on optimistic UI: the *full* contract is "applied client-side immediately, with explicit rollback on backend rejection AND a payload-preserving Retry toast." Story 1.10 implements applied + rollback (no toast yet — Story 1.13/1.14). Console.warn is the placeholder for the toast surface; the moment Toast lands, the rollback already has a payload to preserve.

### Architectural context

- **Idempotency contract (architecture line 191):** `POST /todos` uses **client-generated UUID** + `INSERT ... ON CONFLICT (id) DO NOTHING`. Retry of the same payload re-issues the same id, produces no duplicate. This story is where that contract lands in code.
- **Discriminated-union envelope (architecture line 189):** every action returns `{ ok: true, data } | { ok: false, error }`. Status codes: 201 on create success, 400 on validation, 500 on internal error.
- **Validation contract (architecture line 174):** **Zod** on both server and client. This story implements the server-side validation in `app/lib/validation.ts`. Stories 1.11/1.12 will add `TodoUpdateSchema`. Client-side use of the same schema (for pre-flight validation) is optional — the architecture contemplates it but Story 1.10 only needs the server side.
- **Action handler shape (architecture lines 432–445 — locked example):** parse body → Zod safeParse → return 400 envelope on failure → `checkOwnership` → service call → return 201 envelope. Story 1.10's action mirrors this exactly.
- **Service-layer extension:** `app/services/todos.ts` now has `listTodos` (Story 1.7) + `createTodo` (this story). Stories 1.11/1.12 add `toggleComplete` and `deleteTodo`.
- **TextInput primitive shape (UX spec lines 894–938):** 1-px hard border, 12-px padding, `--font-body` `--font-size-base`, square corners, full column width, accent focus ring at 6.9:1. Pre-focused on desktop only (mobile keeps the field tappable but unfocused — rationale: programmatic focus on mobile doesn't reliably open the soft keyboard and confuses users).
- **Action endpoint URL `/?index`:** RR7 framework mode treats this as the explicit index route's action target. For nested-route futures, this prevents the POST from being routed to a parent route's action accidentally. For our flat v1, `/` works equivalently — `/?index` is the safer convention.

### Carry-over from prior stories

From **Story 1.9**:
- `useTodos`, `useDispatch`, `useSeedFromLoader` available from `~/lib/optimistic-store`. This story switches `home.tsx`'s rendering to `useTodos()` (the deferred refactor from Story 1.9).
- The store's `addTodo` action is the dispatch type used by `dispatchAddTodo`.
- `confirmMutation` accepts an optional `serverTodo` — this story's success branch uses it to swap any server-side data deltas into the optimistic row.

From **Story 1.7**: the existing `listTodos` query continues to drive the loader. Adding `createTodo` to the same file is consistent with the "service files mirror the entity name" convention (architecture line 328).

From **Story 1.6**: the pattern-scanner test (Test 1.6-UNIT-001) will start enforcing as soon as this story's action exists. The action calls `checkOwnership(ctx, null)` — the scanner finds it, passes.

From **Story 1.5**: `buildRequestContext(request)` is called in the action. Same loader contract.

From **Story 1.3**: `browserKeyFetch` is the wrapper used by `dispatchAddTodo` — this is the first real consumer of the wrapper outside its own tests. Header `X-Browser-Key` is automatically injected.

### Files being created/modified

```
todo-app/app/
├── components/
│   ├── TextInput.tsx                  # NEW
│   └── TextInput.module.css           # NEW
├── lib/
│   ├── optimistic-store.tsx           # MODIFIED — add dispatchAddTodo
│   ├── validation.ts                  # NEW — TodoCreateSchema
│   └── validation.test.ts             # NEW
├── routes/
│   ├── home.tsx                       # MODIFIED — add action; use useTodos(); replace InputArea with TextInput
│   ├── home.test.tsx                  # MODIFIED — add optimistic-add tests
│   └── home.action.test.ts            # NEW — server-side action unit tests
└── services/
    ├── todos.ts                       # MODIFIED — add createTodo
    └── todos.test.ts                  # MODIFIED — add createTodo integration tests
```

### Testing standards (for this story)

- TextInput-level tests deferred — the route-level integration tests cover the user-facing behavior (type → Enter → optimistic render → confirm). Standalone TextInput tests would duplicate without adding signal.
- Action handler tests use `// @vitest-environment node` and `vi.mock("~/services/todos")` to avoid real DB hits.
- Integration tests for `createTodo` service follow Story 1.7's pattern: skip if no DATABASE_URL, fresh ownerId per test, `await sql.end()` in afterAll.
- Mock `global.fetch` (not `browserKeyFetch`) in the route test — this lets the test exercise the full dispatcher path (including the header injection) while controlling the response.

### LLM-developer guardrails

- **Don't bypass `browserKeyFetch`** in the dispatcher. Calling `fetch("/?index", ...)` directly would skip the X-Browser-Key header and break the seam. Story 1.3's wrapper is the only allowed call site.
- **Don't move the action's body parse before `request.json()` succeeds.** If `request.json()` throws, the catch returns a 400 envelope. A common mistake is to wrap *both* the parse and the validation in one try/catch, conflating two different error codes.
- **Don't return `null` from `createTodo` on conflict.** The conflict path looks up and returns the existing row. The function's signature is `Promise<Todo>`, never `Promise<Todo | null>`. Callers shouldn't have to handle null.
- **Don't re-fetch in the optimistic store after confirm.** The optimistic state is correct; the loader's revalidation is separately handled (and skipped for Story 1.10). Re-fetching would defeat the optimistic UX.
- **Don't inline the Zod schema in the route file.** Schemas live in `app/lib/validation.ts` so the client can import the same schema for pre-flight validation in future stories without crossing the route boundary.
- **Don't add a "submitting" spinner to TextInput.** The optimistic UI IS the response. UX spec line 911: "**No visual change** — the UI optimistically considers the submission complete." A spinner would tell the user the system is uncertain — exactly the calm-by-default refusal we're documenting.
- **Don't auto-focus the input on mobile.** UX spec line 936: explicit refusal. The mobile soft keyboard requires user gesture.

### Cross-cutting AC compliance check

- ✓ Token discipline: TextInput.module.css consumes only token vars.
- ✓ Import discipline: `app/components/TextInput.tsx` imports nothing from `app/services/*`, `app/middleware/*`, `db/*`. The dispatcher in `app/lib/optimistic-store.tsx` imports from `~/lib/browser-key` (allowed: lib-to-lib).
- ✓ `pnpm typecheck` + `pnpm test` + `pnpm check:gap-i1` all pass.
- ✓ Color is never the only signal: TextInput's focus state combines accent border WITH a visible cursor + the inverted-block focus ring at the chrome level.
- ✓ Visible focus indicator: `:focus-visible` + 2-px accent ring.
- ✓ data-testid discipline (TEA M-2): `data-testid="todo-input"` on the input element.
- ✓ Optimistic UI rollback contract: applied + revert + (placeholder for) toast — full contract beyond toast.

### Project Structure Notes

- This story brings `app/components/` to 6 components (AppShell + 4 state + TextInput). Stories 1.11/1.12/1.13 will add Checkbox, Button, Toast.
- `app/lib/` now has 4 files: `browser-key.ts`, `logger.ts`, `optimistic-store.tsx`, `validation.ts`. Plus tests.
- The `home.tsx` route grows: `loader` (read) + `action` (create) per architecture line 515.

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 1.10: TextInput Primitive + Capture (Add) End-to-End" lines 389–406
- `_bmad-output/planning-artifacts/architecture.md` line 174 (Zod choice + drizzle-zod future, rejected Yup/Joi/Valibot)
- `_bmad-output/planning-artifacts/architecture.md` line 191 (idempotency: client UUID + ON CONFLICT DO NOTHING)
- `_bmad-output/planning-artifacts/architecture.md` line 358–392 (state mgmt + optimistic-mutation lifecycle)
- `_bmad-output/planning-artifacts/architecture.md` lines 432–445 (locked action handler example)
- `_bmad-output/planning-artifacts/architecture.md` lines 458–472 (good vs anti for client-generated UUID)
- `_bmad-output/planning-artifacts/architecture.md` line 515 (`_index.tsx`: loader + action)
- `_bmad-output/planning-artifacts/architecture.md` line 543 (`app/lib/validation.ts` location)
- `_bmad-output/planning-artifacts/ux-design-specification.md` lines 894–938 (TextInput primitive spec)
- `_bmad-output/planning-artifacts/prd.md` § FR1–FR4 (Task Capture: input affordance, Enter submit, maxlength 256, whitespace silent reject)
- `_bmad-output/test-artifacts/test-design/ToDo-App-handoff.md` § Data-TestId Requirements (`todo-input` is the canonical id)
- Memory: `feedback_anti_flattening.md` (optimistic UI = applied + rollback + payload-preserving Retry; do not flatten)
- Memory: `project_seam_naming_fix.md` (Gap I-1 — `createTodo` uses `ctx.ownerId`)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context), acting as Amelia (Senior Software Engineer) under the bmad-dev-story workflow.

### Debug Log References

- **First test run failed** with `window.matchMedia is not a function` — jsdom doesn't ship matchMedia. Added a polyfill to `vitest.setup.ts` returning `matches: false` so the desktop-only auto-focus effect is a no-op in tests (which run as if mobile). All RTL tests now pass.
- **More substantive issue discovered during browser smoke test**: a curl POST to `/?index` (the original action URL) came back as the full HTML page, not the JSON envelope. Root cause: RR7 v7's Single Fetch wraps action responses in HTML for non-fetcher form submissions. **`Accept: application/json` did not switch the behavior.** Production `dispatchAddTodo` calling `await res.json()` would have failed at runtime.
- **Refactor:** moved the create action to a **resource route** at `app/routes/api.todos.ts` (no `default` export — RR7 returns the action's `Response` directly with no HTML wrap). Updated `app/routes.ts` to register `/api/todos`. Updated `dispatchAddTodo` to POST there. Renamed `home.action.test.ts` → `api.todos.test.ts`. The change actually aligns better with architecture line 191's `POST /todos` example.
- **Final verification:** `curl -X POST /api/todos` returns clean JSON `{ok:true, data: {...}}`. Replay returns identical row (createdAt + id unchanged) — idempotency contract holds. Validation errors return `{ok:false, error: {code, fieldErrors}}`. `pnpm test` 68/68; `pnpm typecheck` exit 0; `pnpm check:gap-i1` exit 0.

### Completion Notes List

**Resource route trumps in-route action.** Architecture's `_index.tsx` could host both loader and action (line 515), but in RR7 v7 that pattern only returns JSON cleanly when called via `useFetcher` — never from a plain `browserKeyFetch` POST. Resource routes (action-only modules) are RR7's idiom for "JSON API endpoint." Since `browserKeyFetch` is required for the X-Browser-Key seam header, resource routes are the right shape. Captured as an architecture-vs-RR7-reality refinement; the `_index.tsx` example was conceptually sound but operationally incompatible with our seam transport.

**Idempotency verified at the wire level.** Two identical POSTs to `/api/todos` returned identical envelopes (same id, same createdAt, same description). Postgres's `INSERT ... ON CONFLICT (id) DO NOTHING` + the Drizzle service's "look up the existing row on conflict" path delivers the architecture's contract end-to-end.

**`createTodo` conflict-path observation.** When the second POST hit ON CONFLICT, Drizzle's `.returning()` returned `[]`, triggering the lookup branch. The lookup found the row by id (no ownerId filter — see Dev Notes guardrail). Logged behavior matches design.

**`dispatchAddTodo` revives `createdAt` from the JSON wire format.** The server returns `createdAt: "2026-04-30T17:04:33.677Z"` (ISO string); the client wraps it in `new Date(...)` before dispatching `confirmMutation`. Without this, the optimistic store's `confirmMutation` would replace the tempTodo's Date with a string, breaking the store's `Todo[]` type contract. **Important pattern** that Stories 1.11/1.12 will repeat.

**Action-test path:** all 4 action tests use `// @vitest-environment node`. They construct `new Request(...)` with the X-Browser-Key header explicitly. The mock for `~/services/todos` covers both `listTodos` (loader's import) and `createTodo` (action's import) — even though only `createTodo` is exercised, the import-side-effect path requires both stubs.

**Optimistic store now has its first real consumer.** Before Story 1.10, the store was build infrastructure with no production reads; after Story 1.10, `home.tsx` renders from `useTodos()`. The `useSeedFromLoader` hook from Story 1.9 actually does load-bearing work — when revalidation happens (none in v1 yet), the seed dedupe prevents tearing.

**TextInput primitive is intentionally minimal.** No prop for placeholder, no error states, no controlled-vs-uncontrolled toggle. Matches UX spec: no v1 flow disables the input or shows inline errors. Prop signature is just `{ onSubmit }`.

**Stories 1.11/1.12 will follow the same shape:** resource route at `/api/todos/:id` with PATCH (toggle) and DELETE actions. The pattern just established (resource route + dispatcher helper + action-test file) is reusable.

**Console.warn placeholder for the toast.** When the dispatcher detects `ok: false` or a network throw, it `console.warn`s and dispatches `revertMutation`. Story 1.13 (Toast component) + Story 1.14 (wire toasts to mutation failures) will replace the warn with a real surface. The dispatcher's structure already preserves the payload — when Toast lands, the call site changes to `dispatch({ type: 'showToast', ... })` instead of `console.warn`.

### File List

**Created:**
- `todo-app/app/lib/validation.ts` (8 lines — Zod TodoCreateSchema + inferred type)
- `todo-app/app/lib/validation.test.ts` (5 unit tests)
- `todo-app/app/components/TextInput.tsx` (~45 lines — keyboard handling + auto-focus)
- `todo-app/app/components/TextInput.module.css`
- `todo-app/app/routes/api.todos.ts` (resource route — POST /api/todos)
- `todo-app/app/routes/api.todos.test.ts` (4 action-shape tests via vi.mock)

**Modified:**
- `todo-app/app/services/todos.ts` — added `createTodo` (~25 lines)
- `todo-app/app/services/todos.test.ts` — 3 new createTodo integration tests (now 7 total in this file)
- `todo-app/app/lib/optimistic-store.tsx` — added `dispatchAddTodo` helper + browser-key import
- `todo-app/app/routes/home.tsx` — added TextInput wired to dispatchAddTodo; switched rendering to use store; removed the (briefly added) action handler in favor of the resource route
- `todo-app/app/routes/home.test.tsx` — 3 new RTL tests for optimistic add flow + extended vi.mock to cover createTodo
- `todo-app/app/routes.ts` — registered the new `/api/todos` resource route
- `todo-app/vitest.setup.ts` — added matchMedia polyfill for jsdom

**Commit:** `Story 1.10: TextInput primitive + capture (add) end-to-end` (parent: Story 1.9).

### Change Log

- **2026-04-30** — Story 1.10 implemented. First end-to-end mutation story. Optimistic store finally has a real consumer; idempotent client-UUID + ON CONFLICT contract verified at the wire level. Architecture-vs-RR7 refinement: resource routes (`/api/todos`) are the right transport for the seam, not in-route actions. Total tests: 68/68 across 10 files. Console.warn placeholder for the Toast surface coming in Story 1.13/1.14.
