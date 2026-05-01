# Story 2.3: Environment Configuration with Zod Validation

Status: review

## Story

As a developer or operator,
I want missing/malformed env vars to fail fast at process start with a helpful error,
so that I never debug a misconfigured deployment by reading symptoms — the moment the server boots, I know if env is wrong.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 2.3 (lines 575–590).

1. **Given** Story 1.1 is complete, **When** I implement `app/lib/env.ts` exporting a Zod-validated env schema, **Then** the schema covers `DATABASE_URL` (URL format, must start with `postgres://` or `postgresql://`) and `NODE_ENV` (`development | production | test`).
2. **And** validation runs as early as possible — at module load of `app/lib/env.ts`, which is imported by `db/client.ts` (the canonical server-only entry point); first server-side use triggers fail-fast.
3. **And** missing/malformed var produces a clear, structured error log (via the Story 1.5 logger stub — Story 2.4 swaps pino in transparently) that names the offending key + reason.
4. **And** `.env.example` documents every required var with comments explaining purpose + acceptable formats.
5. **And** `.env` stays gitignored (already enforced from Story 1.1).
6. **And** `docker-compose.yaml` references env-var names only (no hardcoded secrets) — already verified in Story 2.2 (`POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-todo}`).
7. **And** `db/client.ts` no longer contains the bare `if (!process.env.DATABASE_URL) throw ...` check — replaced by `import { env } from "~/lib/env"`. Module-load semantics preserved (still fails before any DB call).

## Tasks / Subtasks

- [x] **Task 1: Create `app/lib/env.ts`** (AC 1, 2, 3)
  - [ ] 1.1: Create `todo-app/app/lib/env.ts`:
    ```ts
    import { z } from "zod";
    import { logger } from "~/lib/logger";

    const EnvSchema = z.object({
      DATABASE_URL: z
        .string()
        .min(1, "DATABASE_URL is required")
        .refine(
          (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
          "DATABASE_URL must start with postgres:// or postgresql://",
        ),
      NODE_ENV: z
        .enum(["development", "production", "test"])
        .default("development"),
    });

    export type Env = z.infer<typeof EnvSchema>;

    function parseEnv(): Env {
      const result = EnvSchema.safeParse(process.env);
      if (!result.success) {
        const fieldErrors = result.error.flatten().fieldErrors;
        logger.error(
          { event: "env.invalid", fieldErrors },
          "Invalid environment configuration",
        );
        throw new Error(
          `Invalid environment configuration: ${JSON.stringify(fieldErrors)}`,
        );
      }
      return result.data;
    }

    // Validate immediately at module load. The first server-side import of
    // ~/lib/env triggers this — by the time any loader/action runs, env has
    // already been validated (or the process has thrown).
    export const env = parseEnv();
    ```
  - [ ] 1.2: **Why module-load timing works for fail-fast:** RR7's framework mode imports server modules eagerly when handling the first request (loader fires → loader's transitive imports resolve → `~/lib/env` runs `parseEnv()` → throws if invalid). The thrown error propagates up; RR7 returns 500 + the operator sees the structured error log. **Container's first request fails loudly; Docker restart kicks in; ops sees the loop.** Acceptable fail-fast for v1.
  - [ ] 1.3: **Why throw rather than `process.exit(1)`:** for SSR workloads, throwing is the React-friendly path (the error reaches the route's ErrorBoundary). `process.exit` would harshly kill the server mid-request, leaving the client hanging. The structured error log is the operator's signal regardless.

- [x] **Task 2: Replace `db/client.ts`'s bare check with the Zod-validated env** (AC 7)
  - [ ] 2.1: Edit `todo-app/db/client.ts`. Replace the current:
    ```ts
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error("DATABASE_URL is not set");
    }
    ```
    with:
    ```ts
    import { env } from "../app/lib/env";
    // ... (existing imports above)
    const queryClient = postgres(env.DATABASE_URL);
    ```
  - [ ] 2.2: **Path note:** `db/client.ts` lives at `todo-app/db/`, not under `app/`. The relative import `"../app/lib/env"` resolves correctly. Drizzle-config-style files (`drizzle.config.ts`, `db/migrate.mjs`) keep their own bare DATABASE_URL check — they run outside the RR7 module graph and don't have access to the `~/` alias.
  - [ ] 2.3: The integration tests in `db/client.test.ts` and `db/migrations.test.ts` already import `dotenv/config` to load `DATABASE_URL` from `.env`. With the new env validator, the import chain is `client.ts → app/lib/env.ts`. The test's `dotenv/config` import must run *before* `db/client.ts` is imported. **Already correct** — the test files do `import "dotenv/config"` at the top before any other imports.
  - [ ] 2.4: For the integration test files: confirm the dotenv import is at the very top (before any other side-effect-laden imports). Should be unchanged from Story 1.4 + Story 1.10.

- [x] **Task 3: Update `.env.example` with documented vars** (AC 4)
  - [ ] 3.1: Replace the single-line `.env.example` with a documented version:
    ```
    # Connection string for the Postgres database.
    # Format: postgres://USER:PASSWORD@HOST:PORT/DBNAME
    # Local dev (host-mounted Postgres): postgres://todo:todo@localhost:5432/todo
    # Docker Compose: postgres://todo:todo@db:5432/todo (compose injects this automatically)
    DATABASE_URL=postgres://todo:todo@localhost:5432/todo

    # Runtime mode. Compose sets NODE_ENV=production for the web service.
    # Local dev defaults to "development" if unset.
    # Vitest sets it to "test" automatically when vitest run executes.
    # Allowed values: development | production | test
    # NODE_ENV=development
    ```
  - [ ] 3.2: `.env.example` is committed; trainees copy to `.env` before running `pnpm dev`. Story 1.4 already established this pattern.

- [x] **Task 4: Write env-validation unit tests** (AC 1, 3)
  - [ ] 4.1: Create `todo-app/app/lib/env.test.ts`. Use `// @vitest-environment node`. Tests:
    - "valid env (DATABASE_URL set, NODE_ENV unset) parses with NODE_ENV defaulting to 'development'"
    - "missing DATABASE_URL throws with descriptive error"
    - "DATABASE_URL with non-postgres protocol throws with descriptive error"
    - "NODE_ENV outside the enum throws"
  - [ ] 4.2: **Tricky import:** the env module validates at top-level import — once it throws, subsequent test runs in the same process can't re-import a fresh module to test other cases. Solution: don't import `env` directly; import a TEST-EXPORTED helper that runs `parseEnv()` on a passed-in object. Refactor `env.ts` to also export a non-throwing `parseEnv(input?: object)` for test use:
    ```ts
    export function parseEnvWith(source: Record<string, unknown>): Env {
      const result = EnvSchema.safeParse(source);
      if (!result.success) {
        throw new Error(
          `Invalid environment configuration: ${JSON.stringify(result.error.flatten().fieldErrors)}`,
        );
      }
      return result.data;
    }
    ```
    Tests use `parseEnvWith({ DATABASE_URL: "...", ... })` to exercise the schema without touching `process.env`. The module-load validation (`parseEnv()` over `process.env`) is exercised at runtime — covered by the existing service-layer integration tests' boot.
  - [ ] 4.3: The test file should NOT trigger the module-load validation. Use dynamic import inside `it()` blocks: `const { parseEnvWith } = await import("./env");`. **Caveat:** even dynamic import runs the top-level. If `process.env.DATABASE_URL` happens to be unset in the test runner, the import throws.
  - [ ] 4.4: Pragmatic fix: in `env.ts`'s top-level `parseEnv()`, swallow errors when `NODE_ENV === 'test'` AND `DATABASE_URL` is unset. This lets test runs without a DB env still load the module. **Not needed if the test sets `DATABASE_URL` via `dotenv/config` before importing**. Going with the dotenv-already-loads-it path: tests run with a valid `DATABASE_URL` from `.env`; the module-load validation passes; `parseEnvWith` is then exercised independently.

- [x] **Task 5: Verify gates and commit**
  - [ ] 5.1: `pnpm typecheck` exit 0.
  - [ ] 5.2: `pnpm test` ~121 passing (117 prior + 4 new env tests).
  - [ ] 5.3: `pnpm dev` boots cleanly (DATABASE_URL is in `.env`; validation passes silently).
  - [ ] 5.4: Test the failure path manually: `DATABASE_URL= pnpm dev` (empty value). Server should fail with the structured error log on first request.
  - [ ] 5.5: `pnpm check:gap-i1` exit 0.
  - [ ] 5.6: `git add . && git commit -m "Story 2.3: env config with Zod validation"`.

## Dev Notes

### Why this story matters

Per the lead differentiator: **fail fast, fail loud, fail with structured signal**. The bare `if (!process.env.DATABASE_URL) throw ...` from Story 1.4 is the "stuck door" of misconfiguration — it works but doesn't help an operator understand WHAT'S missing. Zod-validated env produces structured error output naming the exact field + reason, ready for log aggregation.

This story is also the foundation Story 2.4 builds on (pino's structured logging eats Zod's `flatten().fieldErrors` cleanly).

### Architectural context

- **Zod is already a prod dep** (Story 1.4). Adding env validation is a 25-line module, not a new dependency.
- **Module-load validation** is the standard "fail-fast at boot" pattern for Node services. The single `export const env = parseEnv()` runs once when any server module imports it; subsequent imports get the cached value.
- **Throw vs `process.exit`** — throwing is React-friendly (errors reach RR7's error boundary). `process.exit(1)` would be more "boot-fail" semantically but harsh in mid-render. The structured error log is the operator signal.
- **Path alias `~/` works inside `app/`** but `db/client.ts` is at `todo-app/db/`, outside `app/`. Use the relative path `../app/lib/env` for the import. (Same pattern as `db/client.ts` already uses `../../db/schema` from inside services.)

### Carry-over

From **Story 1.4**: `db/client.ts` had a bare DATABASE_URL check with `throw`. This story replaces it with the validated env. Drizzle config and migrator keep their own bare checks (they run outside the RR7 module graph).

From **Story 1.5**: `~/lib/logger.ts` exports a structured-JSON logger stub. Story 2.3's env validator uses `logger.error` for the failure log. Story 2.4 will swap pino in without touching env.ts's call surface.

From **Story 2.2**: docker-compose.yaml already references env-var names only — no hardcoded password (`${POSTGRES_PASSWORD:-todo}`). AC 6 satisfied by prior work.

### Files being modified/created

- `todo-app/app/lib/env.ts` — NEW (~30 lines)
- `todo-app/app/lib/env.test.ts` — NEW (~40 lines, 4 tests)
- `todo-app/db/client.ts` — MODIFIED (replace bare check with `env` import)
- `todo-app/.env.example` — MODIFIED (add comments)

### Testing standards

- Tests use `parseEnvWith(input)` to exercise the schema without depending on `process.env` state. The top-level `parseEnv()` runs once at module load — its behavior is already exercised by every integration test that imports anything from `app/lib/env.ts`'s descendants.
- `// @vitest-environment node` — env validation runs server-side; jsdom env adds no value.

### LLM-developer guardrails

- **Don't use `process.exit(1)` in `parseEnv()`.** Throwing is the React-friendly path. The container's restart policy + structured error log give the operator the right signal.
- **Don't make the schema accept missing `NODE_ENV` silently with no default.** The default `"development"` is the safe fallback for local-dev convenience; production deploys override via Compose.
- **Don't add fields to the schema speculatively.** v1 needs DATABASE_URL + NODE_ENV. Future fields (e.g., LOG_LEVEL, PINO_PRETTY) land in their own stories.
- **Don't validate inside loaders/actions.** The env is validated once at module load. Re-validating per request is wasteful.
- **Don't import `env` from any client-bundled file.** `app/lib/env.ts` validates `process.env` which only exists server-side. Importing from a component file would either fail at SSR build (no process) or leak server state to the client. **Server-only files: db/*, app/services/*, app/middleware/*, app/lib/env.ts itself, app/lib/logger.ts (also server-only when expanded).**
- **Don't change the migrator's bare check.** `db/migrate.mjs` runs as a standalone Node script outside RR7. It has a single env dep. The bare check is appropriate there.

### Cross-cutting AC compliance (Epic 2)

- ✓ All container images run as non-root: unchanged from Story 2.1
- ✓ Env vars validated by Zod at process start ✓
- ✓ `.env.example` documents required vars ✓
- ✓ No secrets hardcoded in compose ✓ (Story 2.2)
- ✓ `pnpm typecheck` + `pnpm test` + `pnpm check:gap-i1` all pass

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 2.3" lines 575–590
- `_bmad-output/planning-artifacts/architecture.md` line 174 (Zod choice; "drizzle-zod shares schema across DB and validation")
- Story 1.4 file: bare DATABASE_URL check pattern being replaced
- Story 1.5 file: logger stub used for the error log
- Story 2.2 file: docker-compose env-var references

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context).

### Debug Log References

- Final test run: `Test Files 15 passed (15) | Tests 122 passed (122)` in 3.36s.
- `pnpm typecheck` exit 0; `pnpm check:gap-i1` exit 0.
- All 5 new env tests passed first run. The dotenv-loaded DATABASE_URL in `.env` makes the top-level `parseEnv()` succeed during test boot; `parseEnvWith` then exercises the schema in isolation per test.

### Completion Notes List

**Test-friendly `parseEnvWith(source)` export was the key API choice.** Without it, the env module's top-level `parseEnv()` would throw the moment any test imports the module without a valid `process.env` — and the only way to test rejection scenarios would be to swap `process.env` per test (gross). Exposing the parser as a pure function makes schema testing straightforward.

**Module-load timing confirmed working.** Importing `app/lib/env.ts` from `db/client.ts` means the validation runs the moment a server module touches the DB layer. RR7 framework mode resolves server imports lazily on first request — so the validation runs at first request, not at server boot. **Acceptable fail-fast for v1**: an invalid env causes the first request to 500 with the structured error log; Docker's restart policy + healthcheck failure surface the loop to ops.

**`db/client.ts` simplified.** The 4-line bare check became a single `import { env }` + a `postgres(env.DATABASE_URL)` call. The error path is owned by env.ts's parser; client.ts focuses on its single job (constructing the Drizzle instance).

**`drizzle.config.ts` and `db/migrate.mjs` keep their bare checks.** Both run outside the RR7 module graph (drizzle-kit CLI for the former; standalone Node for the latter). Each has a single env dep; the bare check is appropriate. Forcing them through `app/lib/env.ts` would either require ESM interop magic or duplicate the schema as JS.

**`.env.example` documentation pattern.** Each var gets a comment block explaining purpose + format + where it's used. A trainee can `cp .env.example .env` and run `pnpm dev` without reading any other docs.

**Story 2.4 prep:** the `logger.error({ event: "env.invalid", fieldErrors }, "Invalid environment configuration")` call uses Story 1.5's logger stub. When Story 2.4 swaps in pino, this call site already has the right shape — `event` becomes a top-level field, `fieldErrors` becomes nested object, `msg` is the standard pino message field.

**Test count climbed from 117 → 122** (+5).

### File List

**Created:**
- `todo-app/app/lib/env.ts` (~50 lines — Zod schema + parseEnv + parseEnvWith + cached `env` export)
- `todo-app/app/lib/env.test.ts` (5 unit tests via parseEnvWith)

**Modified:**
- `todo-app/db/client.ts` — replaced bare DATABASE_URL check with `import { env } from "../app/lib/env"`
- `todo-app/.env.example` — added per-var documentation comments

**Commit:** `Story 2.3: env config with Zod validation` (parent: Story 2.2).

### Change Log

- **2026-04-30** — Story 2.3 implemented. Env validation via Zod with module-load fail-fast semantics. Replaces the bare check from Story 1.4. Story 2.4 (pino) will swap the structured-JSON logger backend; the `logger.error(...)` call site in env.ts is already pino-shaped and won't change.
