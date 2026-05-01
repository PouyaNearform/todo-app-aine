# Story 1.7: Service Layer — listTodos

Status: review

## Story

As a developer wiring data access,
I want a `listTodos(ctx)` service function that returns todos filtered by `ownerId`,
so that the loader can read the user's list through the thin service-layer seam — closing the four-component seam set (utility → middleware → ownership-check → service+schema).

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 1.7 (lines 339–352).

1. **Given** Stories 1.4 and 1.5 are complete, **When** I implement `app/services/todos.ts` exporting `listTodos(ctx: RequestContext): Promise<Todo[]>`, **Then** the function queries Drizzle for todos where `owner_id = ctx.ownerId`, ordered by `created_at DESC`.
2. **And** an unknown `ownerId` (no rows match) returns `[]` (not an error). FR22 — *empty list, never error*.
3. **And** the `Todo` TypeScript type is shared via `app/types/todo.ts` so client code (loaders, components, optimistic store) and server code (services) consume the same type without reaching into `db/schema.ts` directly.
4. **And** integration test runs against a real Postgres test DB, asserting: (a) empty case returns `[]`; (b) single-todo case returns 1 item; (c) two-todo case returns them in `created_at DESC` order; (d) foreign `ownerId` returns `[]`.
5. **And** the service consumes `ctx.ownerId` exclusively — never `ctx.principal.browserKey`. The Gap I-1 grep script (Story 1.5 Task 5) MUST exit 0 after this story lands. *This is the first story where the script has something to check.*

## Tasks / Subtasks

- [x] **Task 1: Create the shared `Todo` type module** (AC 3)
  - [ ] 1.1: Create `todo-app/app/types/todo.ts`. Re-export `Todo` and `NewTodo` from `db/schema.ts` via `export type { Todo, NewTodo } from "../../db/schema";`. Type-only re-export is erased at build, so client bundle is unaffected by `db/schema.ts`'s server-only Drizzle imports.
  - [ ] 1.2: Document the choice in a top-of-file comment (3-4 lines): "Re-exports the inferred-from-schema type so server + client share one definition. Adding a drift check is unnecessary — the integration test exercises the actual Drizzle row shape, so any schema-vs-type divergence surfaces there."
  - [ ] 1.3: This file will accumulate other shared types in later stories (`MutationStatus`, `ErrorCode`, etc., per architecture line 551). Don't pre-define those — Story 1.9+ owns each.

- [x] **Task 2: Implement `app/services/todos.ts` with `listTodos`** (AC 1, 2, 5)
  - [ ] 2.1: Create directory `todo-app/app/services/`.
  - [ ] 2.2: Write `app/services/todos.ts`:
    ```ts
    import { desc, eq } from "drizzle-orm";
    import { db } from "../../db/client";
    import { todos } from "../../db/schema";
    import type { RequestContext } from "~/middleware/request-context";
    import type { Todo } from "~/types/todo";

    export async function listTodos(ctx: RequestContext): Promise<Todo[]> {
      return db
        .select()
        .from(todos)
        .where(eq(todos.ownerId, ctx.ownerId))
        .orderBy(desc(todos.createdAt));
    }
    ```
  - [ ] 2.3: **Critical: use `ctx.ownerId`, NOT `ctx.principal.browserKey`.** This is exactly the Gap I-1 discipline the grep script enforces. Confirm `pnpm check:gap-i1` exits 0 after writing this file.
  - [ ] 2.4: Do NOT import the `app/services/todos` file into anything client-side. The `db/client` import means this module is server-only. Loaders (Story 1.8+) will import it.
  - [ ] 2.5: Don't add createTodo, toggleComplete, deleteTodo yet — Stories 1.10–1.12 own those. Resist the temptation to anticipate them; doing so spreads the seam-discipline learning across stories that should focus on it cleanly.

- [x] **Task 3: Write the integration test** (AC 4)
  - [ ] 3.1: Create `todo-app/app/services/todos.test.ts`. Use `// @vitest-environment node` header.
  - [ ] 3.2: Skip pattern (same as Story 1.4): `const hasDb = !!process.env.DATABASE_URL; const describeIfDb = hasDb ? describe : describe.skip;`. This keeps Vitest green for contributors without a Postgres reachable.
  - [ ] 3.3: Each test uses a freshly-generated `ownerId` (call `crypto.randomUUID()` per test) so suites don't step on each other and parallel runs stay isolated. **Don't truncate the table** — that would break parallel runs.
  - [ ] 3.4: Test cases:
    - `it("returns [] when no todos exist for this owner")` — generate fresh ownerId, build a `RequestContext` with that ownerId (helper below), call `listTodos(ctx)`, assert `result` is `[]`.
    - `it("returns a single todo for the given owner")` — fresh ownerId, insert one row directly via `db.insert(todos).values(...)`, call `listTodos(ctx)`, assert length 1, fields match.
    - `it("returns multiple todos in created_at DESC order")` — fresh ownerId, insert 2 rows with explicit `createdAt` 1 ms apart (or rely on insert order + tiny delay), call `listTodos`, assert order matches DESC.
    - `it("returns [] when ownerId has no rows even though other owners have rows")` — fresh ownerId-A, insert row for owner-A; fresh ownerId-B, call `listTodos(ctx-B)`, assert `[]`. *This is the cross-owner isolation guarantee — the seam's actual value.*
  - [ ] 3.5: Helper: `function makeCtx(ownerId: string): RequestContext`. Build via `buildRequestContext(new Request(...))` if straightforward, OR construct the object literal directly since this test owns the contract:
    ```ts
    function makeCtx(ownerId: string): RequestContext {
      return { requestId: crypto.randomUUID(), principal: { kind: "browser-key", browserKey: ownerId }, ownerId };
    }
    ```
    Direct construction is acceptable in test code — production code goes through `buildRequestContext`. Test isolation is the priority.
  - [ ] 3.6: `afterAll` closes the postgres pool: `await sql.end();` (import `sql` from `../../db/client`). Without this Vitest hangs on the open connection. Same lesson as Story 1.4 Task 7.

- [x] **Task 4: Verify quality gates and commit**
  - [ ] 4.1: `pnpm typecheck` — exit 0 (`Todo` type re-export should resolve cleanly via `~/types/todo`).
  - [ ] 4.2: `pnpm test` — should report 29 total tests passing (25 from prior + 4 new integration tests).
  - [ ] 4.3: **`pnpm check:gap-i1` — should print the same `OK` message as before, but now with `app/services/` actually existing and being scanned.** This is the first story where the grep has real content to look at. If the script accidentally flags `ctx.principal` (e.g., the test file's `makeCtx` builder constructs `principal: { kind: "browser-key", browserKey: ownerId }`), the script needs tightening — but the grep pattern `ctx\.principal\.browserKey` is specific to the *consumer* shape; constructing a `principal` object is a different concern. Run and verify.
  - [ ] 4.4: `pnpm dev` — regression check.
  - [ ] 4.5: `git add . && git commit -m "Story 1.7: service layer — listTodos"`.

## Dev Notes

### Why this story matters (training-identity context)

Story 1.7 closes the **four-component architectural seam**:

1. **Browser-key utility** (Story 1.3) — *who is the client?*
2. **Request-context middleware** (Story 1.5) — *materialize that into a per-request principal + ownerId*
3. **Ownership-check stub** (Story 1.6) — *does this principal access this resource? (no-op v1)*
4. **Service layer + schema** (Stories 1.4 schema + this story's `listTodos`) — *the persistence contract that uses ownerId for filtering*

After Story 1.7, the trainee can trace a request *all the way through* — from browser → header → middleware → context → service → SQL → `owner_id` filter → DB row. The training value of the seam architecture only becomes legible when the full path is in code. Story 1.7 lights up the path.

This is also the **first story where the Gap I-1 grep script earns its keep**. The script (Story 1.5 Task 5) was written before any service code existed; this story creates the first service file and demonstrates that the rule is mechanically enforceable.

### Architectural context

- **File path (locked):** `app/services/todos.ts` (architecture lines 293, 531).
- **Test path (co-location):** `app/services/todos.test.ts` (architecture line 532).
- **Service files mirror the entity name** (architecture line 328) — `todos.ts` exports the four CRUD verbs over time. Story 1.7 ships only `listTodos`.
- **Integration tests against real Postgres** (architecture line 680). NO mocked DB. Architecture is explicit on this — "Integration tests against a real Postgres ... No mocked DB."
- **Drizzle query API:** `db.select().from(todos).where(eq(todos.ownerId, ctx.ownerId)).orderBy(desc(todos.createdAt))`. Drizzle's `eq`, `desc`, `and` come from `drizzle-orm` (not `drizzle-orm/pg-core`). The query returns `Promise<Todo[]>` because the schema's `$inferSelect` is `Todo`.
- **Type sharing:** the architecture (line 551) places shared types in `app/types/todo.ts`. This story creates that file via re-export. Why re-export instead of duplicate definition? **Drift risk vs. discipline.** Duplicating risks two definitions diverging silently. Re-exporting routes the canonical Drizzle-inferred shape through one named import path. The integration test exercises the *actual* row shape, so any drift between Drizzle's inferred type and what consumers expect would fail the test.
- **`ctx.ownerId` consumption (Gap I-1):** the entire reason this story uses `ctx.ownerId` (and not `ctx.principal.browserKey`) is so that when auth lands, this query — and the next three (createTodo, toggleComplete, deleteTodo) — are unchanged. Service-layer call sites stay frozen; only the middleware grows.

### Carry-over from prior stories

From **Story 1.4**:
- `db/client.ts` exports `db` (drizzle instance) and `sql` (raw postgres.js client). Use `db` for the query; use `sql.end()` in test teardown.
- `db/schema.ts` exports `todos`, `Todo`, `NewTodo`. Story 1.7 imports `todos` (runtime) and re-exports `Todo` (type) via `app/types/todo.ts`.
- The transient Postgres container (`todo-app-pg-dev`) is still running. Verify with `docker ps`. If it stopped between sessions, restart with `docker start todo-app-pg-dev` (no need to recreate).

From **Story 1.5**:
- `RequestContext` shape is `{ requestId, principal, ownerId }`. The integration test's `makeCtx` helper constructs this directly because it owns the test contract.

From **Story 1.6**:
- `checkOwnership` exists but isn't called in services — it's called in *actions* (Stories 1.10+). Story 1.7's loader use (Story 1.8) is read-only and doesn't invoke `checkOwnership` (loaders use the request-context's filter; ownership is implicit because the query filters by ownerId). The pattern-verification Test 1.6-UNIT-001 only scans for `action` handlers, not loaders, so it doesn't false-positive on Story 1.8's loader.

### Files being created/modified — current state

- **`todo-app/app/types/todo.ts`** — NEW (single re-export line + comment).
- **`todo-app/app/services/todos.ts`** — NEW (single `listTodos` function; ~20 lines).
- **`todo-app/app/services/todos.test.ts`** — NEW (~80 lines).

### Testing standards (for this story)

- All tests run under `// @vitest-environment node`.
- Tests skip cleanly if `DATABASE_URL` is absent.
- Each test generates a fresh `ownerId` to avoid stepping on parallel/repeated runs. Don't truncate the `todos` table in setup — that would break parallel runs and (later) breaks integration with E2E fixtures (Story 2.9).
- For the DESC ordering test: insert two rows with explicit `createdAt` values 1 second apart (use `new Date(Date.now() - 1000)` for the older one). Don't rely on insert-order timing — Postgres can reorder writes within the same `now()` resolution.
- Use Drizzle's `db.insert(todos).values(...)` for fixture inserts (not raw SQL). Keeps the test in the same query idiom as the production service. The exception: any direct `sql\`...\`` use should be flagged in code review; the only place raw SQL is acceptable is `db/migrations/*.sql` (and the `db/migrations.test.ts` schema-state queries).

### LLM-developer guardrails

- **Don't add `createTodo`, `toggleComplete`, or `deleteTodo` to `todos.ts`.** Each gets its own story (1.10, 1.11, 1.12 respectively). Adding them now spreads the seam-discipline learning across stories that should focus on it cleanly. Yes, the schema and connection support all four operations; only `listTodos` belongs in this story.
- **Don't accept `ownerId: string` as the function argument.** Take the full `ctx: RequestContext` so the contract reads "service consumes the request context" — the same shape every other service function will adopt. Future-proofs for when `requestId` becomes a logging input (Story 2.4).
- **Don't add a `try/catch` around the Drizzle query in `listTodos`.** If the query fails, let it throw — the loader/action layer catches and renders the error state. Service code is the persistence-aware layer; error UI is the route-handler layer. Don't conflate.
- **Don't read `ctx.principal.browserKey` directly.** This is THE Gap I-1 fix, mechanically enforced by `pnpm check:gap-i1`. If you find yourself wanting to read it, you're solving the wrong problem.
- **Don't import `db/client` from anywhere under `app/components/` or `app/lib/`.** This file is server-only. Architecture's import-discipline cross-cutting AC enforces this; component code that needs todos data goes through a loader that calls `listTodos`.

### Cross-cutting AC compliance check

- ✓ Token discipline: N/A.
- ✓ Import discipline: `app/services/todos.ts` imports from `db/*` (allowed for services), `~/middleware/*` (types only), `~/types/*` (types only). Does not import from `app/routes/*` or `app/components/*`.
- ✓ Optimistic UI rollback: not applicable to read-only `listTodos`. The service's only contract for read is "return rows or empty"; no rollback semantics.
- ✓ Color/focus, data-testid: N/A.
- ✓ `pnpm typecheck` + `pnpm test` + `pnpm check:gap-i1` all pass.

### Project Structure Notes

- This story brings the `app/` tree to four directories: `components/` (Story 1.2's AppShell), `lib/` (Story 1.3's browser-key + Story 1.5's logger), `middleware/` (Stories 1.5+1.6), `services/` (this story). Plus `routes/` (RR7 default) and the new `types/`. Six total — that's the v1 structure.
- `app/types/todo.ts` is created with one re-export now; Stories 1.9 (`MutationStatus`), 1.13 (Toast errors → `ErrorCode`), and others will accumulate types in this file. Architecture line 551 lists the eventual residents.

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 1.7: Service Layer — listTodos" lines 339–352
- `_bmad-output/planning-artifacts/architecture.md` line 234 (the four seams; Story 1.7 is the persistence-anchor closer)
- `_bmad-output/planning-artifacts/architecture.md` line 293, 531–532 (file paths)
- `_bmad-output/planning-artifacts/architecture.md` line 328 (service files mirror entity name)
- `_bmad-output/planning-artifacts/architecture.md` line 551 (`app/types/todo.ts` as shared-types module)
- `_bmad-output/planning-artifacts/architecture.md` line 680 (integration tests against real Postgres; no mocked DB)
- `_bmad-output/planning-artifacts/architecture.md` line 715 (Persistence & Identity coverage map)
- `_bmad-output/planning-artifacts/prd.md` § FR22 (unknown ownerId returns empty list, not error)
- Memory: `feedback_anti_flattening.md` (seam #4 = service layer + nullable owner_id; do not flatten)
- Memory: `project_seam_naming_fix.md` (Gap I-1 — service code uses `ctx.ownerId`)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context), acting as Amelia (Senior Software Engineer) under the bmad-dev-story workflow.

### Debug Log References

- Final test run: `Test Files 6 passed (6) | Tests 29 passed (29)` in 2.17s. The 4 new integration tests (~250 ms) added little overhead — postgres.js + Drizzle on a local container is fast.
- `pnpm typecheck` exit 0; `Todo` type re-export resolved cleanly across the new `~/types/todo` import path.
- **`pnpm check:gap-i1` now scans `app/services/todos.ts` for real and exits OK.** First exercise of the script with non-trivial input. Confirmed the grep pattern `ctx\.principal\.browserKey` doesn't false-positive on the test file (which constructs `principal: { kind: "browser-key", browserKey: ownerId }` — different shape than the consumer pattern).
- DESC ordering test: 1-second gap between `createdAt` values worked reliably. Tighter gaps (sub-millisecond) would risk false negatives on systems where `now()` resolution rounds them together.

### Completion Notes List

**Drizzle's emitted SQL for the query.** Running `console.log(db.select().from(todos).where(eq(todos.ownerId, '...')).orderBy(desc(todos.createdAt)).toSQL())` would show roughly: `SELECT ... FROM "todos" WHERE "todos"."owner_id" = $1 ORDER BY "todos"."created_at" DESC`. The query uses the `idx_todos_owner_id_created_at` index from Story 1.4 — Postgres's planner should pick it up given the WHERE-then-ORDER shape. (Not verified with EXPLAIN; deferred to Story 2.10's performance-budget verification.)

**Type-only re-export discipline confirmed working.** `app/types/todo.ts` does `export type { Todo, NewTodo } from "../../db/schema"`. `pnpm typecheck` passes; the re-export is fully erased at build (no `db/schema.ts` runtime code shipped to the client). When Story 1.8's loader returns `Todo[]` to the route component, the component imports from `~/types/todo` (not `db/schema`) — discipline satisfied.

**Test parallelism via fresh ownerId per test.** Each test calls `crypto.randomUUID()` to scope its data. Vitest runs tests sequentially within a file by default, but tests-per-file may run in parallel across files (and with `--threads` enabled). The fresh-ownerId pattern means even fully-parallel runs stay isolated. **No `truncate todos`** — that would break parallel runs and the future E2E fixtures (Story 2.9).

**Postgres connection-shutdown reuse.** The `await sql.end()` in `afterAll` cleanly closes the pool — no Vitest hang. Same pattern as Story 1.4's tests (which also import `sql` from `../../db/client`). Note: with multiple test files closing the same shared pool, test ordering matters slightly; in practice each test file's `import` produces a separate module instance for `db/client` (Vitest isolates module graphs per test file unless explicitly configured otherwise), so each file gets its own pool. **Confirmed: 6 test files all run cleanly in one `pnpm test` invocation with no leaked connections.**

**Foreign-owner isolation test.** This is the test that proves the seam's *real value* — owner A's data doesn't leak to owner B's `listTodos` call. In v1 with browser-key-as-owner, this means user A's browser doesn't see user B's todos. When auth lands and `ownerId = userId`, the same query, same test, same passing assertion — that's the seam staying frozen.

**Architectural seam now complete.** After Story 1.7, the request flow from browser → header → middleware → context → service → SQL → owner_id-filtered rows → back to client is *fully wired in code*. Stories 1.8 (loader) and beyond layer UX on top; the seam architecture itself is locked.

### File List

**Created:**
- `todo-app/app/types/todo.ts` (5-line type-only re-export with header comment)
- `todo-app/app/services/todos.ts` (15-line service module with `listTodos`)
- `todo-app/app/services/todos.test.ts` (4 integration tests; ~80 lines)

**Modified:** none.

**Commit:** `Story 1.7: service layer — listTodos` (parent: `d60a562` from Story 1.6).

### Change Log

- **2026-04-30** — Story 1.7 implemented. The four-component architectural seam is now closed in code. `listTodos` is the first service-layer function; Stories 1.10/1.11/1.12 will add the three mutation siblings. Gap I-1 grep script ran on real `app/services/` content for the first time and exited OK — discipline mechanically verified, not just declared.
