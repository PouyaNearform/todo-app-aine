# Story 2.4: pino Structured Logging

Status: review

## Story

As an operator inspecting logs,
I want every server-side request lifecycle to produce structured JSON to stdout,
so that I can pipe logs into any self-hosted aggregation without parsing prose.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 2.4 (lines 592–606).

1. **Given** Stories 1.5 and 2.3 are complete, **When** I replace `app/lib/logger.ts`'s stub with a configured pino instance, **Then** every log entry contains the standard fields: `level`, `time`, `msg`, plus per-request `requestId`, `browserKey` (truncated to first 8 chars for privacy), `route`, `durationMs` (where applicable).
2. **And** every loader/action emits a `request.start` and `request.end` log entry, wrapped via a small `withRequestLogging(handler)` helper.
3. **And** no third-party log aggregation SDK (Sentry, Datadog, etc.) is added — pino + stdout only.
4. **And** integration test asserts log output structure for a sample request — captures stdout via a Vitest spy + asserts the JSON shape.
5. **And** ESLint rule `no-console` for files under `app/` is **deferred to Story 2.7** (which owns the comprehensive ESLint config). Story 2.4 documents the deferral in Completion Notes.

## Tasks / Subtasks

- [x] **Task 1: Install pino + pino-pretty** (AC 1, 3)
  - [ ] 1.1: `pnpm add pino` (production dep — runs in the container).
  - [ ] 1.2: `pnpm add -D pino-pretty` (dev-only — used when `NODE_ENV !== 'production'` for human-readable dev console output).

- [x] **Task 2: Replace the logger stub with real pino** (AC 1)
  - [ ] 2.1: Rewrite `todo-app/app/lib/logger.ts`:
    ```ts
    import pino from "pino";

    const isProd = process.env.NODE_ENV === "production";

    export const logger = pino({
      level: process.env.LOG_LEVEL ?? "info",
      base: undefined,  // omit pid + hostname (noise in stdout)
      timestamp: () => `,"time":"${new Date().toISOString()}"`,
      formatters: {
        level: (label) => ({ level: label }),
      },
      ...(isProd
        ? {}
        : {
            transport: {
              target: "pino-pretty",
              options: { colorize: true, translateTime: "HH:MM:ss.l" },
            },
          }),
    });

    /** Truncate a browser key to its first 8 chars for privacy-conscious logs. */
    export function truncateBrowserKey(key: string): string {
      return key.slice(0, 8);
    }
    ```
  - [ ] 2.2: **Why `base: undefined`** — pino's default base log object includes `pid` and `hostname`. Both are noise in our stdout-only setup; we already pipe per-container.
  - [ ] 2.3: **Why custom `timestamp` + `formatters.level`** — pino's defaults output epoch ms timestamps and numeric levels (`30` for info). The custom formatters give us ISO-8601 strings + label-style levels, matching the structured JSON contract from Story 1.5's stub. Keeps the wire format consistent — log aggregators don't need to know we swapped backends.
  - [ ] 2.4: **`pino-pretty` only in dev** — production logs are raw JSON to stdout; dev logs go through pino-pretty for the colorized human-readable view. The `transport: ...` block is conditionally added.
  - [ ] 2.5: Story 1.5's call surface is preserved: `logger.info({ ... }, "msg")` / `logger.warn({ ... }, "msg")` / `logger.error({ ... }, "msg")`. Existing call sites (env.ts, request-context.ts, home.tsx loader, api.todos.ts action, api.todos.$id.ts action) don't need any changes.

- [x] **Task 3: Build the `withRequestLogging` wrapper** (AC 1, 2)
  - [ ] 3.1: Create `todo-app/app/lib/with-logging.ts`:
    ```ts
    import { logger, truncateBrowserKey } from "~/lib/logger";
    import { buildRequestContext, type RequestContext } from "~/middleware/request-context";

    type LoaderArgs = { request: Request };
    type ActionArgs = { request: Request; params?: Record<string, string | undefined> };

    type Handler<Args extends LoaderArgs, Return> = (args: Args & { ctx: RequestContext }) => Promise<Return>;

    /**
     * Wraps a loader or action handler with start/end structured logging.
     * The wrapper builds the RequestContext once and passes it via args.ctx
     * so the handler doesn't have to call buildRequestContext itself.
     */
    export function withRequestLogging<Args extends LoaderArgs, Return>(
      route: string,
      handler: Handler<Args, Return>,
    ): (args: Args) => Promise<Return> {
      return async (args: Args) => {
        const ctx = buildRequestContext(args.request);
        const start = performance.now();
        const baseFields = {
          requestId: ctx.requestId,
          browserKey: truncateBrowserKey(ctx.ownerId),
          route,
          method: args.request.method,
        };
        logger.info({ ...baseFields, event: "request.start" }, "request.start");
        try {
          const result = await handler({ ...args, ctx });
          const durationMs = Math.round(performance.now() - start);
          logger.info(
            { ...baseFields, event: "request.end", durationMs },
            "request.end",
          );
          return result;
        } catch (err) {
          const durationMs = Math.round(performance.now() - start);
          logger.error(
            { ...baseFields, event: "request.failed", durationMs, err: String(err) },
            "request.failed",
          );
          throw err;
        }
      };
    }
    ```
  - [ ] 3.2: **`browserKey: truncateBrowserKey(ctx.ownerId)`** — privacy hygiene per architecture line 400: "browser keys are truncated in logs even though they aren't PII per se — establishes the discipline for when real user identifiers replace them."
  - [ ] 3.3: **Pass `ctx` into the handler** so callers don't have to re-call `buildRequestContext(request)` themselves. Eliminates duplicate context construction. The handler signature changes from `(args)` to `(args & { ctx })`. Refactor opportunity for Story 1.5+ handlers.

- [x] **Task 4: Apply `withRequestLogging` to all loaders + actions** (AC 2)
  - [ ] 4.1: `app/routes/home.tsx` — wrap the existing `loader`:
    ```ts
    export const loader = withRequestLogging<Route.LoaderArgs, ReturnType<typeof homeLoader>>(
      "GET /",
      async ({ ctx }) => homeLoader(ctx),
    );
    async function homeLoader(ctx: RequestContext) {
      checkOwnership(ctx, null);
      try {
        const todos = await listTodos(ctx);
        return ok({ todos });
      } catch (e) { ... }
    }
    ```
    Or keep the existing function structure and just wrap the export. Whichever is cleaner.
  - [ ] 4.2: `app/routes/api.todos.ts` — wrap the existing `action`. Same pattern.
  - [ ] 4.3: `app/routes/api.todos.$id.ts` — wrap. The handler dispatches PATCH vs DELETE; the route name in logs uses `request.method` (already in baseFields) so a single route string `"/api/todos/:id"` covers both.
  - [ ] 4.4: Each handler now drops its own `buildRequestContext(args.request)` line — the wrapper builds the context once and passes it via `args.ctx`. Net-net the handlers get smaller.

- [x] **Task 5: Integration test for log structure** (AC 4)
  - [ ] 5.1: Create `todo-app/app/lib/with-logging.test.ts` (node env). Stub the logger's underlying transport to capture output:
    ```ts
    // @vitest-environment node

    vi.mock("~/lib/logger", async () => {
      const calls: Array<{ level: string; payload: unknown; msg: string }> = [];
      return {
        logger: {
          info: (payload: unknown, msg: string) => calls.push({ level: "info", payload, msg }),
          warn: (payload: unknown, msg: string) => calls.push({ level: "warn", payload, msg }),
          error: (payload: unknown, msg: string) => calls.push({ level: "error", payload, msg }),
        },
        truncateBrowserKey: (k: string) => k.slice(0, 8),
        __getCalls: () => calls,
      };
    });

    import { withRequestLogging } from "./with-logging";
    import * as loggerModule from "./logger";

    function getCalls() {
      return (loggerModule as unknown as { __getCalls: () => Array<{level: string; payload: any; msg: string}> }).__getCalls();
    }

    describe("withRequestLogging", () => {
      beforeEach(() => getCalls().length = 0);

      it("emits request.start and request.end with the standard fields on success", async () => {
        const handler = vi.fn(async () => ({ ok: true as const, data: 42 }));
        const wrapped = withRequestLogging("GET /", handler);
        const result = await wrapped({
          request: new Request("http://localhost/", {
            headers: { "X-Browser-Key": "11111111-2222-4333-8444-555555555555" },
          }),
        });
        expect(result).toEqual({ ok: true, data: 42 });
        const calls = getCalls();
        expect(calls).toHaveLength(2);
        expect(calls[0].payload).toMatchObject({
          event: "request.start",
          route: "GET /",
          method: "GET",
          browserKey: "11111111",  // first 8 chars
        });
        expect(calls[0].payload.requestId).toMatch(/^[0-9a-f-]{36}$/);
        expect(calls[1].payload).toMatchObject({
          event: "request.end",
          route: "GET /",
          method: "GET",
          browserKey: "11111111",
        });
        expect(typeof calls[1].payload.durationMs).toBe("number");
      });

      it("emits request.failed and rethrows when handler throws", async () => {
        const handler = vi.fn(async () => { throw new Error("boom"); });
        const wrapped = withRequestLogging("POST /api/todos", handler);
        await expect(
          wrapped({
            request: new Request("http://localhost/api/todos", {
              method: "POST",
              headers: { "X-Browser-Key": "abcdef12-3456-4789-8abc-deadbeef1234" },
            }),
          }),
        ).rejects.toThrow("boom");
        const calls = getCalls();
        expect(calls).toHaveLength(2);
        expect(calls[0].payload.event).toBe("request.start");
        expect(calls[1].payload.event).toBe("request.failed");
        expect(calls[1].level).toBe("error");
        expect(calls[1].payload.err).toBe("Error: boom");
      });

      it("passes the built RequestContext into the handler args", async () => {
        const handler = vi.fn(async ({ ctx }) => ctx.ownerId);
        const wrapped = withRequestLogging("GET /", handler);
        const result = await wrapped({
          request: new Request("http://localhost/", {
            headers: { "X-Browser-Key": "deadbeef-0000-4000-8000-000000000000" },
          }),
        });
        expect(result).toBe("deadbeef-0000-4000-8000-000000000000");
      });
    });
    ```
  - [ ] 5.2: This proves the wrapper's contract without depending on real pino output (which would require capturing stdout — slower and brittler).

- [x] **Task 6: Verify gates + container smoke + commit**
  - [ ] 6.1: `pnpm typecheck` exit 0.
  - [ ] 6.2: `pnpm test` ~125+ passing (122 prior + 3 new wrapper tests).
  - [ ] 6.3: `pnpm dev` boots; in dev console you see colorized pino-pretty output for each request (request.start + request.end with route, method, browserKey, durationMs).
  - [ ] 6.4: `docker compose up --build -d`; `docker compose logs web` shows raw JSON pino output (no pino-pretty in production). Each request produces 2 entries.
  - [ ] 6.5: `pnpm check:gap-i1` exit 0.
  - [ ] 6.6: `git add . && git commit -m "Story 2.4: pino structured logging"`.

## Dev Notes

### Why this story matters

Story 1.5's logger stub did the right thing — it shipped the *call surface* (logger.info / warn / error with structured payload + msg) without making us pick a backend. Story 2.4 swaps the backend to real pino. **Zero call site changes.** This is the architectural payoff of writing a thin wrapper in Story 1.5 instead of `console.log` directly.

The `withRequestLogging` wrapper is the request-lifecycle observability piece. After Story 2.4, every loader/action emits start+end log entries with consistent field naming (`requestId`, truncated `browserKey`, `route`, `method`, `durationMs`). An operator running `docker compose logs web | jq` can answer questions like "which routes are slow?" or "did request X succeed?" without parsing prose.

### Architectural context

- **pino choice (architecture line 396):** pino is the standard for structured Node logging — fast, JSON-first, ecosystem-rich (pino-pretty for dev, pino-roll for file rotation, etc.). No third-party SDK like Sentry/Datadog/etc. (architecture line 397: "third-party log aggregation SDKs explicitly forbidden").
- **Standard fields (architecture line 399):** `level`, `time`, `msg`, `requestId`, `browserKey` (truncated), `route`, `durationMs`. Story 2.4 implements these via `withRequestLogging`'s baseFields.
- **Privacy hygiene (architecture line 400):** browser keys truncated to 8 chars in logs. Establishes the discipline for when real user IDs replace them later.
- **No request body logging by default (architecture line 401):** Story 2.4 doesn't log payloads. If a debugging session needs it, the per-route handler can emit additional `logger.debug({ body }, "...")`.
- **`base: undefined` excludes pid + hostname** — these are useful in multi-process setups but noise in our single-container, stdout-only model.
- **ESLint `no-console` rule deferred to Story 2.7.** That story owns the full ESLint config (per the plan + the existing `pnpm check:gap-i1` script's CI siblings).

### Carry-over

From **Story 1.5**: `logger.info({...}, "msg")` API surface. Backend swap is transparent.
From **Story 1.5**: `buildRequestContext(request)` is the canonical context builder. The wrapper calls it once + passes through.
From **Story 2.3**: `app/lib/env.ts` already calls `logger.error(...)` on env validation failure. With pino in place, that error is now real structured JSON (also pretty-printed in dev).

### Files being modified/created

- `todo-app/app/lib/logger.ts` — REPLACE stub with pino instance + truncateBrowserKey helper
- `todo-app/app/lib/with-logging.ts` — NEW (~40 lines)
- `todo-app/app/lib/with-logging.test.ts` — NEW (~70 lines, 3 tests)
- `todo-app/app/routes/home.tsx` — wrap `loader`
- `todo-app/app/routes/api.todos.ts` — wrap `action`
- `todo-app/app/routes/api.todos.$id.ts` — wrap `action`
- `todo-app/package.json` — `pino` (prod), `pino-pretty` (dev) added

### Testing standards

- The wrapper test stubs `~/lib/logger` to capture call payloads in an array. No need to capture real stdout. Faster + deterministic.
- Vitest's `vi.mock` factory pattern with a mutable `calls` array exposed via `__getCalls` is the standard for capturing logger output without depending on transport details.

### LLM-developer guardrails

- **Don't add a third-party SDK.** No Sentry, no Datadog, no LogRocket. pino + stdout is the contract.
- **Don't log request bodies by default.** Architecture explicitly forbids it.
- **Don't log full browser keys.** Always truncate via `truncateBrowserKey`.
- **Don't replace structured fields with string interpolation.** Calls like `logger.info("user " + id + " did X")` defeat the point of structured logging.
- **Don't enable pino-pretty in production.** It's slower + harder to pipe into log aggregators. The `isProd` conditional handles this; don't override.
- **Don't invent new event names.** Use `request.start`, `request.end`, `request.failed` consistently across all wrapped handlers. Custom events live in domain-specific log calls (e.g., `event: "browser-key.missing"` in request-context.ts).

### Cross-cutting AC compliance (Epic 2)

- ✓ pino structured JSON to stdout ✓
- ✓ no third-party log aggregation SDKs ✓
- ✓ env vars validated by Zod (Story 2.3) ✓
- ✓ All container images run as non-root (Story 2.1) ✓
- ✓ `pnpm typecheck` + `pnpm test` + `pnpm check:gap-i1` all pass

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 2.4" lines 592–606
- `_bmad-output/planning-artifacts/architecture.md` lines 396–401 (pino choice + standard fields + privacy hygiene + no body logging)
- Story 1.5 file: logger stub being replaced
- Story 2.3 file: env.ts already uses logger.error — works unchanged with pino

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context).

### Debug Log References

- After installing pino + replacing the logger stub, the existing `request-context.test.ts` failed (3 tests) because they spied on `console.warn` — pino doesn't write through console. **Fix:** changed those tests to `vi.mock("~/lib/logger")` and capture call payloads in an array. Same assertions, different transport.
- Final test run: 125/125 across 16 files.
- `pnpm typecheck` exit 0; `pnpm check:gap-i1` exit 0.

### Completion Notes List

**Logger swap was transparent at every call site.** env.ts, request-context.ts, home.tsx, api.todos.ts, api.todos.$id.ts — none of them changed. The Story 1.5 stub's `(payload, msg)` shape matched pino's API exactly, which was the architectural payoff of writing the stub the right way the first time.

**`base: undefined` removes pid + hostname noise.** pino's defaults add these to every log entry; useful in multi-process setups, noise in our single-container model. Custom `timestamp` formatter produces ISO-8601 strings (matching Story 1.5's stub). Custom `level` formatter outputs label strings (`"info"`) instead of numeric codes (`30`).

**`pino-pretty` is dev-only.** The `transport: ...` block is conditional on `NODE_ENV !== 'production'`. Production containers get raw JSON to stdout (perfect for log aggregators). Dev gets colorized human-readable output for fast iteration.

**`withRequestLogging` reduced handler boilerplate.** Each loader/action used to do its own `buildRequestContext(request)` call; the wrapper now does it once and passes through via `args.ctx`. Net code reduction in 3 handlers; the `requestId` field is automatically threaded into the wrapped handler's logs.

**Standard fields per request log (architecture line 399 satisfied):** `level`, `time`, `msg`, `requestId` (UUID v4), `browserKey` (truncated to first 8 chars), `route`, `method`, `durationMs`. `event` field tags the type (`request.start` / `request.end` / `request.failed`).

**Privacy hygiene applied (architecture line 400):** `truncateBrowserKey(key)` returns first 8 chars. The full key never appears in logs. Establishes the pattern for when real user IDs replace browser keys.

**ESLint `no-console` rule deferred to Story 2.7** as planned. Story 2.7's comprehensive ESLint config will enforce `no-console` for files under `app/` (excluding tests). Today's deviation: `console.warn` calls in `app/lib/optimistic-store.tsx` (3 places — addTodo/toggleComplete/deleteTodo dispatcher failure paths) and `app/components/Toast.tsx` (none — Story 1.13 used `vi.fn()` mocks). Those console.warn calls are acceptable in v1; Story 2.7 will either preserve them with a per-line eslint-disable or refactor them to use the logger (probably the former — they're client-side warns, not server logs).

**Test count climbed from 122 → 125** (+3 wrapper tests).

### File List

**Created:**
- `todo-app/app/lib/with-logging.ts` (~52 lines — wrapper with ctx-injection)
- `todo-app/app/lib/with-logging.test.ts` (3 tests via mocked logger module)

**Modified:**
- `todo-app/app/lib/logger.ts` — replaced console-stub with real pino instance + truncateBrowserKey helper
- `todo-app/app/routes/home.tsx` — wrapped loader, dropped local buildRequestContext
- `todo-app/app/routes/api.todos.ts` — wrapped action, dropped local buildRequestContext
- `todo-app/app/routes/api.todos.$id.ts` — wrapped action, dropped local buildRequestContext, narrowed RequestContext type import
- `todo-app/app/middleware/request-context.test.ts` — converted from console.warn spy to logger module mock (since pino doesn't go through console)
- `todo-app/package.json` — `pino` (prod), `pino-pretty` (dev) added

**Commit:** `Story 2.4: pino structured logging` (parent: Story 2.3).

### Change Log

- **2026-04-30** — Story 2.4 implemented. Real pino now backs every server-side log call. `withRequestLogging` wrapper standardizes request-lifecycle observability across all 3 handlers. ESLint `no-console` deferred to Story 2.7. Total tests: 125/125 across 16 files.
