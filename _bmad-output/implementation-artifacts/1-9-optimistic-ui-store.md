# Story 1.9: Optimistic UI Store (Foundation)

Status: review

## Story

As a developer wiring client-side state,
I want a hand-rolled optimistic-UI store mounted at the AppShell level,
so that subsequent verb-implementation stories (Stories 1.10–1.12 add/toggle/delete) have a single state primitive to dispatch through, with rollback semantics already proven.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 1.9 (lines 372–388).

1. **Given** Story 1.8 is complete, **When** I implement `app/lib/optimistic-store.ts` (`useReducer` + Context + dispatch helpers), **Then** the state shape is `{ todos: Todo[], pendingMutations: Record<MutationId, PendingMutation> }`.
2. **And** action types are `'addTodo' | 'toggleComplete' | 'deleteTodo' | 'confirmMutation' | 'revertMutation'` (plus a foundational `'seed'` action used to hydrate from loader data — see Dev Notes).
3. **And** each `PendingMutation` carries enough info to revert without re-fetching:
   - `{ kind: 'add'; tempTodo: Todo }`
   - `{ kind: 'toggle'; id: string; previousStatus: boolean }`
   - `{ kind: 'delete'; previousTodo: Todo }`
4. **And** `OptimisticStoreProvider` is mounted in `app/root.tsx` (wrapping the `<AppShell>` children, which is the route's Outlet) and the home route seeds it from `loaderData.todos` via a `useSeedFromLoader(todos)` hook.
5. **And** unit tests cover: each action type's reducer logic, concurrent pending mutations don't corrupt state, revert restores prior status correctly.
6. **And** failure of one pending mutation never blocks dispatching another (FR29) — verified by a test that dispatches two adds, reverts one, asserts the other still applies cleanly and remains in `pendingMutations`.

## Tasks / Subtasks

- [x] **Task 1: Define core types in `app/types/todo.ts`** (AC 1, 3)
  - [ ] 1.1: Append to `app/types/todo.ts`:
    ```ts
    export type MutationId = string;
    export type PendingMutation =
      | { kind: "add"; tempTodo: Todo }
      | { kind: "toggle"; id: string; previousStatus: boolean }
      | { kind: "delete"; previousTodo: Todo };
    ```
  - [ ] 1.2: `Todo` is already re-exported from `db/schema.ts`. Reference inside `PendingMutation` resolves naturally.
  - [ ] 1.3: Don't yet add `MutationStatus = 'pending' | 'confirmed' | 'failed'` (architecture line 276's example) — the v1 store doesn't need it because mutation status is implied by presence/absence in the `pendingMutations` map. Adding it now would be over-engineering.

- [x] **Task 2: Implement the reducer + state shape** (AC 1, 2, 3)
  - [ ] 2.1: Create `todo-app/app/lib/optimistic-store.ts`. At the top, define:
    ```ts
    export type State = {
      todos: Todo[];
      pendingMutations: Record<MutationId, PendingMutation>;
    };

    export type Action =
      | { type: "seed"; todos: Todo[] }
      | { type: "addTodo"; mutationId: MutationId; tempTodo: Todo }
      | { type: "toggleComplete"; mutationId: MutationId; id: string }
      | { type: "deleteTodo"; mutationId: MutationId; id: string }
      | { type: "confirmMutation"; mutationId: MutationId; serverTodo?: Todo }
      | { type: "revertMutation"; mutationId: MutationId };

    export const INITIAL_STATE: State = { todos: [], pendingMutations: {} };
    ```
  - [ ] 2.2: Implement `reducer(state: State, action: Action): State` with these branches (immutable, all object-spread/array-map style):
    - `seed` → `{ todos: action.todos, pendingMutations: {} }` (replaces both; revalidation flows happen *after* `confirmMutation` so pendingMutations is empty at seed time)
    - `addTodo` → prepend `tempTodo` to `todos` (newest-first DESC ordering); record `pendingMutations[mutationId] = { kind: 'add', tempTodo }`
    - `toggleComplete` → flip `completionStatus` on the matching todo; record `{ kind: 'toggle', id, previousStatus: <prior value> }`. **If the todo isn't in state.todos**, no-op (defensive: avoids corrupting state if a stale dispatch fires post-revert).
    - `deleteTodo` → remove the todo from the list; record `{ kind: 'delete', previousTodo }`. Same no-op fallback.
    - `confirmMutation` → drop `pendingMutations[mutationId]`. **For `kind === 'add'` mutations**, if `serverTodo` is provided AND its `id !== tempTodo.id`, replace the tempTodo in the list with the serverTodo (this handles the rare case where the server overrides the client UUID — uncommon with our `INSERT ... ON CONFLICT DO NOTHING` contract but supported defensively).
    - `revertMutation` → look up `pendingMutations[mutationId]`, undo per kind:
      - `add` → remove `tempTodo` from `todos` by id
      - `toggle` → restore `previousStatus` on the matching todo (no-op if todo no longer present — e.g., concurrent delete)
      - `delete` → re-insert `previousTodo` at its prior position (use `created_at DESC` ordering to find insertion point)
      - Always drop `pendingMutations[mutationId]` after revert
  - [ ] 2.3: Use a `switch (action.type)` with `default: return state` exhaustive-narrowing pattern. TS strict-mode enforces all variants are handled.

- [x] **Task 3: Implement Context + Provider + hooks** (AC 4)
  - [ ] 3.1: Below the reducer, define:
    ```ts
    type StoreContextValue = { state: State; dispatch: React.Dispatch<Action> };
    const StoreContext = createContext<StoreContextValue | null>(null);

    export function OptimisticStoreProvider({ children, initialTodos = [] }: { children: React.ReactNode; initialTodos?: Todo[] }) {
      const [state, dispatch] = useReducer(reducer, { todos: initialTodos, pendingMutations: {} });
      const value = useMemo(() => ({ state, dispatch }), [state]);
      return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
    }
    ```
  - [ ] 3.2: Public hooks:
    - `useStore(): StoreContextValue` — throws if no provider in tree
    - `useTodos(): Todo[]` — convenience wrapper returning `useStore().state.todos`
    - `usePendingMutations(): Record<MutationId, PendingMutation>` — convenience wrapper
    - `useDispatch(): React.Dispatch<Action>` — convenience wrapper
  - [ ] 3.3: `useSeedFromLoader(todos: Todo[])` — useEffect hook that dispatches `{ type: 'seed', todos }` whenever the input array reference changes. This is what the home route calls. Use a stable comparison strategy: dispatch only when the *content* changes meaningfully (use `JSON.stringify(todos.map(t => t.id))` as a cheap dep, or just dispatch on every `todos` ref change since RR7 returns a fresh array per loader run anyway — the latter is simpler and correct since the reducer's seed action is idempotent for equal inputs).

- [x] **Task 4: Mount provider in `app/root.tsx`** (AC 4)
  - [ ] 4.1: Modify `app/root.tsx`'s `Layout` function — wrap `<AppShell>{children}</AppShell>` inside `<OptimisticStoreProvider>`:
    ```tsx
    <body>
      <OptimisticStoreProvider>
        <AppShell>{children}</AppShell>
      </OptimisticStoreProvider>
      <ScrollRestoration />
      <Scripts />
    </body>
    ```
  - [ ] 4.2: The provider mounts above AppShell. Architecture line 235 ("Optimistic store ↔ error envelope ↔ idempotency contract") puts the store at the AppShell level, which is conceptually the root frame. **Store-up, AppShell-down** lets future stories add a Toast component (Story 1.13) inside the provider but outside AppShell if needed for layout, while keeping all route components inside the provider.
  - [ ] 4.3: Don't pass `initialTodos` at the provider level — the seed comes from the route's `useSeedFromLoader` hook. The provider starts with `[]`; the seed runs on the first effect tick after the route mounts. Brief state of "empty store while seed pending" is acceptable because Story 1.8's component still reads from `useLoaderData()` directly (not from the store) — this story builds the store; Story 1.10 is when the component starts reading from it.

- [x] **Task 5: Wire `useSeedFromLoader` in the home route** (AC 4)
  - [ ] 5.1: In `app/routes/home.tsx`, near the top of the default-export component (before any conditional returns), call `useSeedFromLoader(data.ok ? data.data.todos : [])`. This runs as a side effect — the existing rendering logic (Loading/Error/Empty/List) is unchanged.
  - [ ] 5.2: This is intentionally **non-load-bearing** for Story 1.9's UI. The store is being seeded but no UI reads from it yet. Story 1.10 will refactor home.tsx to render from `useTodos()` instead of `useLoaderData().data.todos`.
  - [ ] 5.3: Update `home.test.tsx`'s `vi.mock` calls if needed — adding a hook call to the component shouldn't break the existing test fixtures because the store provider isn't required in the test (the hook is no-op without a provider; we can either add a default `useEffect` guard or wrap the test stub in the provider). Decision: wrap `createRoutesStub` content in `<OptimisticStoreProvider>` so the home component runs the hook successfully; tests don't assert store state, just rendered output.

- [x] **Task 6: Write unit tests for the reducer** (AC 5)
  - [ ] 6.1: Create `todo-app/app/lib/optimistic-store.test.ts`. Use jsdom (default — for the React rendering tests) for any tests that exercise the Provider; pure reducer tests don't need an env override.
  - [ ] 6.2: Test cases (organize as `describe("reducer", ...)` + `describe("Provider integration", ...)`):
    - `seed`: replaces todos and clears pending
    - `addTodo`: prepends tempTodo, records pending
    - `addTodo`: two consecutive adds both appear at the front in dispatch order
    - `toggleComplete`: flips completionStatus, records previousStatus
    - `toggleComplete` on missing id: no-op
    - `deleteTodo`: removes todo, records previousTodo
    - `deleteTodo` on missing id: no-op
    - `confirmMutation`: drops pending entry; for add with serverTodo + different id, replaces tempTodo with serverTodo
    - `revertMutation`: kind=add removes tempTodo
    - `revertMutation`: kind=toggle restores previousStatus
    - `revertMutation`: kind=delete re-inserts previousTodo
    - `revertMutation` for unknown mutationId: no-op
  - [ ] 6.3: **Concurrent-mutations test** (AC 5 — concurrent pending mutations don't corrupt state):
    - Dispatch addTodo(A), addTodo(B), confirmMutation(A) — assert state.todos has both A and B; pendingMutations only has B.
    - Dispatch addTodo(A), addTodo(B), revertMutation(A) — assert state.todos has only B; pendingMutations only has B.
  - [ ] 6.4: **FR29 test** (AC 6 — failure of one mutation doesn't block another):
    - Dispatch addTodo(A) → revertMutation(A); then dispatch addTodo(B) → confirmMutation(B). Assert B succeeds independently; state.todos has B; pendingMutations is empty.
  - [ ] 6.5: **Provider integration test:**
    - Render `<OptimisticStoreProvider><TestConsumer /></OptimisticStoreProvider>` where TestConsumer calls `useTodos()` and renders count.
    - Inside, dispatch via `useDispatch()` and assert the rendered count updates.
    - Verify `useStore` throws when called outside the provider.

- [x] **Task 7: Verify quality gates and commit**
  - [ ] 7.1: `pnpm typecheck` exit 0.
  - [ ] 7.2: `pnpm test` should report ~50 tests passing (33 prior + ~17 new).
  - [ ] 7.3: `pnpm dev` — visit localhost; verify the EmptyState/list rendering hasn't regressed (Story 1.9 doesn't change visible behavior).
  - [ ] 7.4: `pnpm check:gap-i1` exit 0.
  - [ ] 7.5: `git add . && git commit -m "Story 1.9: optimistic UI store foundation"`.

## Dev Notes

### Why this story matters (training-identity context)

Story 1.9 lands the **load-bearing client behavior** (architecture line 201: "the optimistic-rollback contract is the load-bearing client behavior"). Per the anti-flattening rule on optimistic UI:

> Optimistic UI is "applied client-side immediately, with explicit rollback on backend rejection AND a payload-preserving Retry toast." NOT "fast UI", NOT "fire-and-forget."

This story builds the rollback infrastructure *before* any mutation actually uses it. That's deliberate: Stories 1.10/1.11/1.12 each add one verb (add/toggle/delete) end-to-end including the rollback path. If the store were built in Story 1.10, the next two stories would re-derive it; building it once in Story 1.9 means each verb story focuses on its own API + UI work, dispatching through a stable store API.

The hand-rolled choice (~100-200 LOC, useReducer + Context) is itself a documented refusal — architecture rejected Redux Toolkit, Zustand, TanStack Query (line 201). The trainee can read the entire store implementation in one sitting; that's part of the lead differentiator (minimalism through documented refusals).

### Architectural context

- **State management library: none.** Hand-rolled per architecture line 201. ~100-200 LOC target. **Don't import a state library.**
- **Reducer pattern:** immutable updates via `useReducer`. Object spread for objects, `[...arr]`/`arr.map()`/`arr.filter()` for arrays. No mutations, no Immer (would add a dependency).
- **Action shape (architecture line 359):** `{ type: ActionType, payload: ... }` — except in v1 we put payload fields directly on the action object rather than nested under `.payload`. This is the slightly-modern style; matches `Action = { type: 'addTodo'; mutationId: ...; tempTodo: ... }`. Discriminated unions narrow naturally on `action.type`.
- **PendingMutation shape (architecture lines 367–370 — locked):** the three kinds are `add`, `toggle`, `delete`. Each carries the *complete* info to revert without re-fetching. This is the architectural promise of FR29: "concurrent mutations during rollback must not corrupt state" — because revert is purely local.
- **Optimistic-mutation lifecycle (architecture lines 384–392):**
  ```
  dispatch(addTodo) → state has tempTodo + pending[id] = { kind: 'add', tempTodo }
     ↓
  fetch ok:true → dispatch(confirmMutation, id) → pending[id] cleared
     ↓ (or)
  fetch ok:false → dispatch(revertMutation, id) → tempTodo removed; toast (Story 1.13) surfaces
  ```
- **The `'seed'` action is foundational, not in the original AC list.** It's needed because the provider mounts in `root.tsx` with empty initial state, and the home route hydrates it from loader data. The architecture's original action list (`addTodo`, `toggleComplete`, `deleteTodo`, `confirmMutation`, `revertMutation`) covers mutations; `seed` is the route-handoff. Documented here so future readers know the full surface.
- **No `useSyncExternalStore`** — architecture line 201 mentioned it as an option ("possibly `useSyncExternalStore`"). For v1 the simpler `useReducer` + `useContext` pattern is sufficient. `useSyncExternalStore` is for stores outside React (e.g., a third-party library); ours lives entirely inside React.

### Carry-over from prior stories

From **Story 1.8**:
- `home.tsx` is the route component. Its rendering currently reads `data.data.todos` from `useLoaderData()`. **This story does NOT change that** — we just add `useSeedFromLoader(data.data.todos)` as a side effect. Story 1.10 will refactor the rendering to read from the store.
- The home route's test `home.test.tsx` mocks `~/services/todos` and `db/client`. Adding the store hook means the test must wrap the route content in `<OptimisticStoreProvider>` — adjust the `createRoutesStub` setup accordingly.

From **Story 1.7**: `Todo` type is in `app/types/todo.ts` (re-exported from schema). Store types extend this module.

From **Story 1.2**: `AppShell` is mounted in `app/root.tsx`. The `OptimisticStoreProvider` wraps `AppShell` (so it's *outside* the visible chrome but *inside* the `<body>`).

### Files being modified — current state

- **`todo-app/app/types/todo.ts`** — currently 5 lines (re-export of `Todo`/`NewTodo`). Append `MutationId` + `PendingMutation` types.
- **`todo-app/app/root.tsx`** — currently 65 lines. Add `OptimisticStoreProvider` import + wrap `<AppShell>` in `<Layout>`.
- **`todo-app/app/routes/home.tsx`** — currently 87 lines. Add `useSeedFromLoader(...)` call inside the default export.
- **`todo-app/app/routes/home.test.tsx`** — currently 65 lines. Wrap stub content in `<OptimisticStoreProvider>`.

### Testing standards (for this story)

- Pure reducer tests don't need a React env — they're plain function tests. Use the default jsdom env for the file (consistent with Story 1.3); Provider integration tests use jsdom for React rendering.
- For Provider tests, use `@testing-library/react`'s `render` + `act` for dispatch operations.
- Don't write integration tests against the live DB — this story is pure client-state.
- Each test creates its own `tempTodo` via a small helper to avoid shared mutable fixtures.

### LLM-developer guardrails

- **Don't add Immer or any other immutability helper.** Hand-rolled reducer per architecture. ~100-200 LOC budget keeps the file trainee-readable.
- **Don't add a "loading" or "status" field per todo.** The architecture's design uses presence in `pendingMutations` to imply "this todo's id is mid-mutation." Adding a status field on the Todo would create two sources of truth.
- **Don't read `useLoaderData()` from inside the store.** The store is a pure client-state primitive. The seed comes from the *consumer* (the route component), not from the store reaching out to the loader. Coupling them would break testability.
- **Don't dispatch `seed` from inside the provider.** The provider is generic — it accepts an optional `initialTodos` prop and otherwise stays neutral. The route owns the seeding decision (only the home route knows what counts as "the loader's todos").
- **Don't expose the reducer or its types as the public API.** The exports are: `OptimisticStoreProvider`, `useStore`, `useTodos`, `usePendingMutations`, `useDispatch`, `useSeedFromLoader`, plus the action-creator helpers (Stories 1.10+ will add `dispatchAddTodo`, etc.). Internal: reducer function, state/action types are exported only for testing.
- **Don't make the provider re-render on every dispatch unless state changed.** `useMemo` on `{ state, dispatch }` only re-creates the value when `state` reference changes (which `useReducer` guarantees only happens on actual state transitions). Without `useMemo`, every render of the provider would invalidate consumers.
- **Don't put dispatcher logic (action creators) in this story.** This story's API is the raw `dispatch(action)`. Action-creator helpers like `dispatchAddTodo(dispatch, description)` will live in this same file but are added by Story 1.10 (when there's a real call site to motivate them).

### Cross-cutting AC compliance check

- ✓ Token discipline: N/A (no CSS).
- ✓ Import discipline: `app/lib/optimistic-store.ts` imports from `~/types/todo` (types only) and React. No imports from `app/services/*`, `app/middleware/*`, `app/routes/*`, `db/*`.
- ✓ Optimistic UI rollback contract: this IS the contract's implementation. Reducer revert paths cover all three mutation kinds.
- ✓ `pnpm typecheck` + `pnpm test` pass.
- N/A color/focus, data-testid.

### Project Structure Notes

- This story is the *first* file in `app/lib/` to use React (the existing `browser-key.ts` and `logger.ts` are pure JS/TS). The file uses `import { useReducer, useContext, useMemo, createContext, useEffect } from "react"`.
- After Story 1.9, `app/lib/` has 3 files: `browser-key.ts`, `logger.ts`, `optimistic-store.ts`. Plus tests for each. Architecture (line 541) anticipates this layout.

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 1.9: Optimistic UI Store (Foundation)" lines 372–388
- `_bmad-output/planning-artifacts/architecture.md` line 44 (FR25–FR30 optimistic UI contract)
- `_bmad-output/planning-artifacts/architecture.md` line 83 (rollback contract: payload preserved, concurrent-safe)
- `_bmad-output/planning-artifacts/architecture.md` line 201 (hand-rolled state, ~100-200 LOC; rejection of Redux/Zustand/TanStack Query)
- `_bmad-output/planning-artifacts/architecture.md` line 235 (optimistic store ↔ error envelope ↔ idempotency)
- `_bmad-output/planning-artifacts/architecture.md` line 299 (file path: `app/lib/optimistic-store.ts`)
- `_bmad-output/planning-artifacts/architecture.md` lines 358–372 (locked state shape + PendingMutation discriminated union)
- `_bmad-output/planning-artifacts/architecture.md` lines 384–392 (optimistic-mutation lifecycle pseudocode)
- `_bmad-output/planning-artifacts/prd.md` § FR25–FR30 (optimistic UI requirements; FR29 = concurrent-mutation safety)
- Memory: `feedback_anti_flattening.md` (optimistic UI = applied + explicit rollback + payload-preserving Retry; do not flatten to "fast UI")

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context), acting as Amelia (Senior Software Engineer) under the bmad-dev-story workflow.

### Debug Log References

- **Initial test run hung** (826-second duration, 1 file failing). Root cause: `useSeedFromLoader([])` was called with a fresh `[]` literal each render in the error case. The hook's `useEffect` dep was `[todos]`; fresh `[]` ref each render → effect refires → reducer dispatches seed → state ref changes → provider re-renders → home re-renders → fresh `[]` again → infinite loop.
- **Fix:** added a `useRef`-based content-key dedupe inside `useSeedFromLoader`. Hook now only dispatches when `length:id@status,...` key actually differs from previous. Belt-and-suspenders: also added `const EMPTY_TODOS: Todo[] = []` at module scope in `home.tsx` so the error case passes a stable reference.
- **After fix:** `Test Files 8 passed (8) | Tests 53 passed (53)` in 4.00s. Massive duration drop from 826s → 4s confirms the loop fix.
- `pnpm typecheck` exit 0; `pnpm check:gap-i1` exit 0.

### Completion Notes List

**Final LOC: ~190 lines for `optimistic-store.tsx`.** Within architecture's 100–200 LOC target. The full file is comfortably readable in one sitting.

**File renamed `.ts` → `.tsx`.** The Provider uses JSX (`<StoreContext.Provider>`); a `.ts` file can't compile JSX. Architecture line 299's `optimistic-store.ts` listing was approximate. Imports use `~/lib/optimistic-store` (no extension), so the rename was transparent to callers. Captured as a minor architecture-vs-reality deviation.

**`useSeedFromLoader` content-key dedupe is the load-bearing nuance.** Without it, callers passing fresh array literals (the most natural pattern in conditional code) trigger infinite re-render loops. The hook is now defensive — a future caller can't break it accidentally. The key encodes `length:id@status` per todo, so seeding correctly fires when contents *actually* change (e.g., after revalidation introduces a new todo).

**The reducer's `seed` action always returns a new state reference**, even when content is identical. That's by design (simpler logic). The hook-level dedupe is the right place to prevent unnecessary dispatches; doing it in the reducer would require the reducer to compute the content key too — duplicating the work and tightly coupling reducer correctness to a specific equality check.

**Provider position in `root.tsx`:** wraps `<AppShell>{children}</AppShell>`. Placing it *outside* AppShell rather than inside means future Toast positioning (Story 1.13) can render via a Portal *anywhere* in the tree and still consume the store. Stories 1.10–1.12 will exercise the dispatcher hooks; Story 1.13's Toast will be the first read-side consumer of `usePendingMutations` for displaying retry-on-failure surfaces.

**`useStore` throws on missing provider — verified by test.** This is the standard "fail loudly" Context pattern. A future component placed outside the provider will get a clear error message at mount, not a silent `undefined` deref later.

**Defensive reducer no-ops** (`toggleComplete`/`deleteTodo` on missing id; `confirmMutation`/`revertMutation` on missing mutationId) protect against stale-dispatch races. E.g., if a user toggles a todo, then concurrently deletes it, then the toggle's response arrives — the confirm targets a now-absent todo. The no-op makes this safe rather than an exception.

**`insertByCreatedAtDesc` correctness for revert(delete):** when restoring a deleted todo, finds the first existing todo with `createdAt < deleted.createdAt` and inserts before it. Tested with two todos where delete-then-revert restores correct DESC ordering. Edge case (revert finds no older todo) appends to the end — correct since the deleted todo would be the oldest.

**No action-creator helpers yet.** Stories 1.10–1.12 will add `dispatchAddTodo(dispatch, description, ownerId)` etc. Doing so now would be premature without a real call site.

**Home test setup updated:** wrapped `<Stub />` in `<OptimisticStoreProvider>` so `useSeedFromLoader` works inside the route component during tests. The 4 existing route tests still pass — none asserted store state, only rendering output.

**The loader now returns a fresh `data` object per call**, but inside RR7's `useLoaderData()`, the returned reference is stable across re-renders within the same loader invocation. The infinite loop was caused by my `[]` literal fallback, not by RR7.

### File List

**Created:**
- `todo-app/app/lib/optimistic-store.tsx` (190 lines — reducer + Provider + hooks)
- `todo-app/app/lib/optimistic-store.test.tsx` (~270 lines — 20 tests)

**Modified:**
- `todo-app/app/types/todo.ts` — added `MutationId` and `PendingMutation` types
- `todo-app/app/root.tsx` — added `OptimisticStoreProvider` wrap inside `<body>`
- `todo-app/app/routes/home.tsx` — added `useSeedFromLoader` call + `EMPTY_TODOS` sentinel
- `todo-app/app/routes/home.test.tsx` — wrapped `<Stub />` in `<OptimisticStoreProvider>`

**Commit:** `Story 1.9: optimistic UI store foundation` (parent: `73966f4` from Story 1.8).

### Change Log

- **2026-04-30** — Story 1.9 implemented. Hand-rolled optimistic store (~190 LOC) lands. Provider mounted at root; home route seeds it from loader data via the dedupe-aware `useSeedFromLoader` hook. Total tests: 53/53 across 8 files. Stories 1.10–1.12 will dispatch through this store for add/toggle/delete; Story 1.13's Toast will consume `pendingMutations` for retry surfaces.
