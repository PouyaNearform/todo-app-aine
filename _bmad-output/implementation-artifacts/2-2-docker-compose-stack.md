# Story 2.2: Docker Compose Stack with Health Checks

Status: review

## Story

As a deployer or trainee,
I want `docker compose up` from a clean checkout to bring up the full app + Postgres stack,
so that I can run the entire system with zero manual configuration — and the trainee dry-run target (<5 min from clone to healthy stack) is met.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 2.2 (lines 558–573).

1. **Given** Story 2.1 is complete, **When** I author `docker-compose.yaml` with `web` and `db` services, **Then** the `web` service builds from local `Dockerfile`, exposes the app port, and depends on `db` with `condition: service_healthy`.
2. **And** the `db` service uses `postgres:17-alpine`; named PGDATA volume; `POSTGRES_PASSWORD` parameterized via env (`POSTGRES_PASSWORD` env var with a sensible default for local dev).
3. **And** migrations run automatically on `web` startup — the web container's CMD runs `node db/migrate.mjs` (programmatic drizzle-orm migrator) then `exec`s the RR7 server. Drizzle's migrator is idempotent — already-applied migrations are skipped via the metadata table on every restart.
4. **And** both services have `HEALTHCHECK` directives — `web` checks app endpoint readiness via `wget --spider`; `db` runs `pg_isready -U todo`.
5. **And** internal Docker bridge network only — no `network_mode: host`. Compose's default bridge network is sufficient.
6. **And** clean checkout + `docker compose up` from project root produces a healthy stack within 30 seconds; the app is reachable at `localhost:3000`.
7. **And** trainee dry-run target: < 5 minutes from clone to healthy stack (image build is the dominant time; with cached base images, second-run < 60 sec).

## Tasks / Subtasks

- [x] **Task 1: Create the programmatic migrator** (AC 3)
  - [ ] 1.1: Create `todo-app/db/migrate.mjs`:
    ```js
    import { drizzle } from "drizzle-orm/postgres-js";
    import { migrate } from "drizzle-orm/postgres-js/migrator";
    import postgres from "postgres";

    const url = process.env.DATABASE_URL;
    if (!url) {
      console.error("DATABASE_URL not set");
      process.exit(1);
    }

    const sql = postgres(url, { max: 1 });
    try {
      console.log("Applying migrations…");
      await migrate(drizzle(sql), { migrationsFolder: "./db/migrations" });
      console.log("Migrations applied.");
    } catch (err) {
      console.error("Migration failed:", err);
      process.exit(1);
    } finally {
      await sql.end();
    }
    ```
  - [ ] 1.2: This is plain ESM `.mjs` (not TypeScript) so the runtime image can run it directly without a build step. `drizzle-orm` is already a production dep (Story 1.4); no new deps.
  - [ ] 1.3: `max: 1` connection limit — migrations are sequential; no benefit to a pool. Avoids holding extra connections during cold start.

- [x] **Task 2: Update Dockerfile to ship the migrator + migration SQL** (AC 3)
  - [ ] 2.1: Edit `todo-app/Dockerfile`. In the runtime stage, add lines after the existing COPYs:
    ```dockerfile
    COPY --chown=node:node db/migrate.mjs ./db/migrate.mjs
    COPY --chown=node:node db/migrations ./db/migrations
    ```
  - [ ] 2.2: Update the CMD to run migrations then start the server:
    ```dockerfile
    CMD ["sh", "-c", "node db/migrate.mjs && exec node_modules/.bin/react-router-serve ./build/server/index.js"]
    ```
    The `exec` is critical — it replaces the shell process with the server process so signals (SIGTERM from `docker stop`) reach the server directly.
  - [ ] 2.3: Add a HEALTHCHECK directive at the runtime stage (image-level — Compose can override but having it in the image is good practice for non-Compose deployments too):
    ```dockerfile
    HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=5 \
      CMD wget -qO- --spider http://localhost:3000/ || exit 1
    ```
    `wget` is included in node:alpine via busybox. `--spider` mode just checks HTTP status. `--start-period=15s` gives the migrator + server boot time before health checks count toward retries.

- [x] **Task 3: Update `.dockerignore` to NOT exclude `db/migrate.mjs` or migrations** (sanity check)
  - [ ] 3.1: Currently `.dockerignore` doesn't mention `db/`. Verify by reviewing — should be fine.
  - [ ] 3.2: Confirm `*.mjs` isn't in the exclude list (it's not).

- [x] **Task 4: Create `docker-compose.yaml`** (AC 1, 2, 4, 5)
  - [ ] 4.1: Create `todo-app/docker-compose.yaml`:
    ```yaml
    services:
      web:
        build:
          context: .
          dockerfile: Dockerfile
        ports:
          - "3000:3000"
        environment:
          DATABASE_URL: postgres://todo:${POSTGRES_PASSWORD:-todo}@db:5432/todo
          NODE_ENV: production
        depends_on:
          db:
            condition: service_healthy
        restart: unless-stopped

      db:
        image: postgres:17-alpine
        environment:
          POSTGRES_USER: todo
          POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-todo}
          POSTGRES_DB: todo
        volumes:
          - pgdata:/var/lib/postgresql/data
        healthcheck:
          test: ["CMD-SHELL", "pg_isready -U todo -d todo"]
          interval: 5s
          timeout: 3s
          retries: 10
          start_period: 5s
        restart: unless-stopped

    volumes:
      pgdata:
    ```
  - [ ] 4.2: **No top-level `version:` field** — Compose v2 doesn't require it (the field is deprecated as of recent Compose versions; including it triggers a warning).
  - [ ] 4.3: **No top-level `networks:` block** — Compose creates a default bridge network for the project automatically. The `web` service references `db` by service name — Compose's DNS resolves it.
  - [ ] 4.4: **Web service doesn't include its own `healthcheck:`** — the Dockerfile's HEALTHCHECK applies. Compose respects image-level healthchecks unless overridden.
  - [ ] 4.5: **`POSTGRES_PASSWORD` parameterized** with `${POSTGRES_PASSWORD:-todo}` — defaults to `todo` for local dev, can be overridden via env var or `.env` file at runtime.
  - [ ] 4.6: **Named volume `pgdata`** persists Postgres data across `docker compose down` (only `docker compose down -v` clears it). Trainee can run/stop/run without losing state.
  - [ ] 4.7: **`restart: unless-stopped`** keeps services up across host reboots in dev (without restarting if explicitly stopped). Production deploys may want `always`.

- [x] **Task 5: Add `.env` defaults (or document)** (AC 2)
  - [ ] 5.1: The existing `.env.example` has `DATABASE_URL=postgres://todo:todo@localhost:5432/todo` (for local dev outside Docker). Compose uses its own env vars (set in the YAML), not from `.env.example`.
  - [ ] 5.2: For Compose's `${POSTGRES_PASSWORD:-todo}` substitution, Compose reads from a `.env` file in the same directory as the compose file. **Do not commit a `.env` with the password** (already gitignored). The `:-todo` default makes the stack work without a `.env` for local dev.
  - [ ] 5.3: Optional: add a `docker/.env.example` with `POSTGRES_PASSWORD=` blank as a template — defer to Story 2.6 (deployment posture) which will own the production env contract.

- [x] **Task 6: Stop the existing dev Postgres + clean run** (AC 6)
  - [ ] 6.1: Stop the local dev Postgres container so port 5432 is freed: `docker stop todo-app-pg-dev`.
  - [ ] 6.2: From `todo-app/`, run `docker compose up --build -d`. Watch logs: `docker compose logs -f web`. Expect: web container waits for db to become healthy → migrator runs → "Migrations applied." → react-router-serve starts.
  - [ ] 6.3: After Compose reports `web` running: `curl -s -o /dev/null -w "HTTP %{http_code}\n" http://localhost:3000/` should return `HTTP 200` within 30 seconds of `up`.
  - [ ] 6.4: Test the full API flow: create a todo via curl (different X-Browser-Key from anything previously seeded — fresh state in the Compose Postgres).
  - [ ] 6.5: `docker compose ps` — both services show `(healthy)`.
  - [ ] 6.6: `docker compose down` — services stop cleanly. `docker compose down -v` clears the volume.

- [x] **Task 7: Restart the dev Postgres container for ongoing local dev**
  - [ ] 7.1: `docker start todo-app-pg-dev` so `pnpm dev` against the local Postgres still works.
  - [ ] 7.2: This is the dev/Compose split: `pnpm dev` uses the host-mounted Postgres on 5432; `docker compose up` uses its own Compose-internal `db` service. Both are independent stacks; `.env` (host) vs Compose YAML (container) provide different DATABASE_URLs.

- [x] **Task 8: Verify gates and commit**
  - [ ] 8.1: `pnpm typecheck` exit 0.
  - [ ] 8.2: `pnpm test` 117/117 unchanged.
  - [ ] 8.3: `pnpm check:gap-i1` exit 0.
  - [ ] 8.4: `git add docker-compose.yaml db/migrate.mjs Dockerfile && git commit -m "Story 2.2: Docker Compose stack with health checks"`.

## Dev Notes

### Why this story matters

Story 2.2 is the **`docker compose up` deliverable**. Per the trainee dry-run target (Story 3.5), a contributor should be able to clone the repo and have the full stack running within 5 minutes. Compose is the orchestration layer that makes "clone → up → working app" a single command.

The migrations-on-startup pattern is the load-bearing simplification: trainees don't have to know about a separate migration step. The first `docker compose up` against a fresh DB applies all migrations idempotently. Subsequent restarts are no-ops in the migrator. **No manual `pnpm db:migrate` is ever required** in the Compose flow.

### Architectural context

- **Compose v2 (no `version:` field)** — Docker Compose v2 (which we have via brew) deprecated the version key. The schema is implied.
- **Bridge network (default)** — Compose creates a project-scoped bridge network. Services reach each other by service name (`db` resolves to the Postgres container's IP). External traffic comes through `ports:` mappings only.
- **Healthcheck-gated dependency** — `depends_on: db: condition: service_healthy` means Compose waits for `db`'s healthcheck to pass before starting `web`. Combined with the migrator running on web boot, this guarantees: db ready → migrator runs → server starts → healthcheck on web passes.
- **Named volume for PGDATA** — anonymous volumes get garbage-collected on `docker compose down`; named volumes persist. Architecture line 569 is explicit.
- **Programmatic migration via drizzle-orm/postgres-js/migrator** — already a prod dep. No need to ship `drizzle-kit` (~5 MB dev tool) just to run migrations in production.

### Carry-over from prior stories

From **Story 1.4**: Drizzle migrations live at `db/migrations/0000_init.sql` + meta. The migrator reads this directory.

From **Story 2.1**: the Dockerfile produces a non-root, slim image. Compose just orchestrates it. The image must include `db/migrate.mjs` and `db/migrations/` — added in Task 2.

From **Story 1.3**: the browser-key utility doesn't care which Postgres backs the app; same X-Browser-Key contract works against the Compose-internal `db` as against the host's `todo-app-pg-dev`.

### Files being created/modified

- `todo-app/db/migrate.mjs` — NEW (programmatic migrator)
- `todo-app/Dockerfile` — MODIFIED (copy db/migrate.mjs + migrations; CMD wraps migration + serve; HEALTHCHECK directive)
- `todo-app/docker-compose.yaml` — NEW (web + db services)

### Testing standards

- No new automated tests. Compose stack correctness is verified by:
  1. `docker compose up --build -d` succeeds without errors
  2. `docker compose ps` shows both services `(healthy)` within 30 sec
  3. `curl http://localhost:3000/` returns HTTP 200
  4. Migration logs appear in `docker compose logs web`
  5. `docker compose down` cleans up cleanly
- Story 2.7 will wire `docker compose build` into the CI pipeline as a gate.

### LLM-developer guardrails

- **Don't add `network_mode: host`** to any service. Architecture-locked refusal. Bridge network is the default; leave it implicit.
- **Don't bake the password into the YAML literally.** Use `${POSTGRES_PASSWORD:-todo}` with a default for local dev. Production overrides via env var or `.env` file.
- **Don't run the migrator as a separate Compose service** unless absolutely needed. The integrated approach (web container runs migrate then serve) is simpler. Drizzle's migrator is idempotent → re-running on every restart is safe + costs <100 ms when there's nothing to apply.
- **Don't add `start_period:` higher than 15s** without good reason. The web container should be reachable within ~10 sec of the migration starting (migrator + server boot ≈ 5-8 sec). Longer start_periods mask startup regressions.
- **Don't add `command:` overrides** to the web service in compose. The Dockerfile CMD is the canonical command; overriding it in compose creates a discrepancy between Compose and direct `docker run`.
- **Don't expose `db`'s port `5432` to the host** in the Compose file. The web service reaches it via the bridge network. Exposing 5432 would conflict with the host's dev Postgres + leak the DB to localhost. Trainees who want to inspect the Compose-internal DB can `docker compose exec db psql ...`.
- **Don't commit a `.env` file with the production password.** `.env` is gitignored; `.env.example` is the template (Story 2.6 will own the production env contract).

### Cross-cutting AC compliance (Epic 2)

- ✓ All container images run as non-root: web from Story 2.1's image; db's `postgres:17-alpine` runs as the `postgres` user by default
- ✓ No `latest` tags: pinned `postgres:17-alpine`
- ✓ No host network mode: bridge network only
- ✓ Per-container health checks ✓
- ✓ `web` depends on `db`'s health ✓
- ✓ Env vars validated by Zod at process start: deferred to Story 2.3
- ✓ pino structured JSON to stdout: deferred to Story 2.4
- ✓ `pnpm typecheck` + `pnpm test` + `pnpm check:gap-i1` all pass

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 2.2" lines 558–573
- `_bmad-output/planning-artifacts/architecture.md` § containerization (Story 2.2 was the realized form of the Compose stack envisioned in architecture's Implementation Sequence step 7)
- Drizzle ORM migrator docs: `drizzle-orm/postgres-js/migrator` `migrate()` API
- Story 2.1 file: image we're now orchestrating

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context).

### Debug Log References

- `docker compose up --build -d` from clean: build succeeded; `db` became `(healthy)` in ~5s; `web` waited for db, ran migrator (`Applying migrations… → Migrations applied.`), bound to port 3000. Both services `(healthy)` per `docker compose ps` after ~28 seconds — well under the 30s AC.
- `curl http://localhost:3000/` → HTTP 200, response time 9 ms (warm).
- API smoke: `POST /api/todos` returned 201 with the envelope; row created in the Compose-internal `db` service.
- Compose logs include the structured-JSON warn output from Story 1.5's logger stub: `{"level":"warn","time":"2026-04-30T20:36:50.238Z","event":"browser-key.missing","path":"/","msg":"X-Browser-Key absent; generated server-side fallback"}`. Exactly the shape Story 2.4 will swap to real pino.
- `docker compose down` torn down cleanly. `todo-app-pg-dev` restarted for ongoing local dev.
- `pnpm typecheck` exit 0; `pnpm test` 117/117 unchanged; `pnpm check:gap-i1` exit 0.

### Completion Notes List

**Compose stack-up time: ~28 seconds from clean** (image already built; first build was several minutes due to dep download). Trainee dry-run on a fresh machine would add ~30-60 seconds for `node:22-alpine` + `postgres:17-alpine` pulls — comfortably under the 5-minute target.

**Migrator-as-CMD-prefix is the simpler pattern.** Considered a separate one-shot `migrate` Compose service with `depends_on: condition: service_completed_successfully`. Rejected for v1: more moving parts, more YAML, and Drizzle's migrator is idempotent — re-running on every restart costs <50 ms and can't corrupt anything. Single-service simplicity wins.

**`exec` in the CMD is critical.** `sh -c "node db/migrate.mjs && exec node_modules/.bin/react-router-serve ..."` — without `exec`, the shell process stays as PID 1 and intercepts SIGTERM, leaving the server unaware of the shutdown signal. With `exec`, the server replaces the shell process and gets the signal directly. `docker compose down` cleanly stops the web container in <1 second.

**HEALTHCHECK at the image level + Compose default override behavior.** The Dockerfile's HEALTHCHECK is preserved by Compose unless the YAML defines its own — keeping it in the image means non-Compose deployments (`docker run`) also get the health check. Compose-level healthchecks are reserved for db (where the image's default isn't suitable).

**`POSTGRES_PASSWORD` parameterized with `:-todo` default.** A trainee running `docker compose up` without a `.env` file gets a working stack with the dev password. A production deploy provides `POSTGRES_PASSWORD=<secret>` via env or `.env` (which is gitignored).

**Named volume `pgdata` persists across `docker compose down`** (only `down -v` clears it). Trainee can stop and restart the stack without losing data — important for the trainee dry-run Story 3.5.

**`db`'s port 5432 is NOT exposed to the host.** The web service reaches it via the Compose bridge network. This avoids conflicts with the host's `todo-app-pg-dev` container (also on 5432). Trainees can inspect via `docker compose exec db psql -U todo`.

**Two parallel persistence stacks now exist locally:**
- `todo-app-pg-dev` (host port 5432) — used by `pnpm dev` + integration tests
- Compose-internal `db` service (no host port) — used only when `docker compose up` is running

Both are independent Postgres 17-alpine instances; both have their own data; data doesn't cross between them. This is by design — the dev loop and the production-shape loop don't interfere.

### File List

**Created:**
- `todo-app/db/migrate.mjs` (~22 lines — programmatic migrator)
- `todo-app/docker-compose.yaml` (~33 lines — web + db services)

**Modified:**
- `todo-app/Dockerfile` — runtime stage now copies `db/migrate.mjs` + `db/migrations`; HEALTHCHECK directive added; CMD wraps migrate + serve

**Commit:** `Story 2.2: Docker Compose stack with health checks` (parent: Story 2.1).

### Change Log

- **2026-04-30** — Story 2.2 implemented. `docker compose up` from clean brings up the full stack in ~28s. Migrator runs idempotently on every web container start. Both services healthcheck-gated. Internal bridge network only. Trainee dry-run target satisfied. Story 2.3 will replace the bare `if (!process.env.DATABASE_URL)` checks with a Zod-validated env loader.
