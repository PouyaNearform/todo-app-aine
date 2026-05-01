# Story 2.7: GitHub Actions CI Pipeline

Status: review

## Story

As any contributor,
I want every push and PR to run the full gate sequence,
so that broken builds, failing tests, accessibility regressions, or undisciplined test patterns never merge.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 2.7 (lines 638–657).

1. **Given** the test infrastructure exists (Vitest already; Playwright + axe land in Story 2.9), **When** I author `.github/workflows/ci.yml`, **Then** the workflow runs on `push` to `main` + every `pull_request`.
2. **And** jobs run sequentially per architecture line 211: `typecheck` → `lint` → `gap-i1` → `vitest --coverage` (≥ 70% threshold) → `docker build` → (Story 2.9's `playwright` + `axe` jobs added later).
3. **And** any job failure breaks the build; merge to `main` requires all green.
4. **And** workflow uses pinned action versions (no `@latest`).
5. **And** coverage report is uploaded as a CI artifact.
6. **And** **ESLint flat-config rule `no-restricted-syntax` flags any `waitForTimeout` call in `e2e/**`** — lint failure breaks the build (TEA M-4). Rule defined now even though `e2e/` doesn't exist yet — kicks in the moment Story 2.9 introduces specs.
7. **And** **ESLint flat-config rule `no-console`** for files under `app/` (excluding tests + allowing `warn`/`error` for deliberate client-side observability) — TEA M-6 sequencing reflects this is foundation work for Story 2.4's deferred AC.
8. **And** **CI step runs `pnpm check:gap-i1`** — fails the build on any match (TEA M-4 / m-1; the script already exists from Story 1.5).
9. **And** Playwright + axe jobs are scaffolded but disabled (commented `# TODO Story 2.9`) — Story 2.9 owns wiring them.
10. **And** **`e2e/fixtures.ts` helpers (`forceBackendRejection`, `injectLatency`, `freshBrowserKey`, `statisticalAssert`)** are scaffolded as Story 2.9 implementation prep — deferred along with the rest of the Playwright work.

## Tasks / Subtasks

- [ ] **Task 1: Install `@vitest/coverage-v8` and configure coverage threshold** (AC 2, 5)
  - [ ] 1.1: `pnpm add -D @vitest/coverage-v8`
  - [ ] 1.2: Update `todo-app/vitest.config.ts`:
    ```ts
    test: {
      // ... existing options
      coverage: {
        provider: "v8",
        reporter: ["text", "html", "json-summary"],
        include: ["app/**/*.{ts,tsx}"],
        exclude: [
          "**/*.test.{ts,tsx}",
          "**/*.config.{ts,tsx}",
          "app/+types/**",  // RR7-generated route types
        ],
        thresholds: {
          lines: 70,
          branches: 70,
          functions: 70,
          statements: 70,
        },
      },
    },
    ```
  - [ ] 1.3: Add `"test:coverage": "vitest run --coverage"` to package.json.
  - [ ] 1.4: Run `pnpm test:coverage` locally; verify the report. If coverage falls short of 70% on any metric, document in Completion Notes — the threshold may need adjustment OR a few targeted tests added. Don't lower the threshold; add tests.

- [ ] **Task 2: Install ESLint + typescript-eslint with flat config** (AC 6, 7)
  - [ ] 2.1: `pnpm add -D eslint typescript-eslint`. (ESLint 9 ships flat config as default; no separate plugin install needed.)
  - [ ] 2.2: Create `todo-app/eslint.config.js`:
    ```js
    import tseslint from "typescript-eslint";

    export default tseslint.config(
      {
        ignores: [
          "build/",
          ".react-router/",
          "node_modules/",
          "db/migrations/",
          "**/*.config.{ts,js}",
        ],
      },
      ...tseslint.configs.recommended,
      {
        // App code: no console.log/info/debug. console.warn/error allowed for
        // deliberate client-side observability (the optimistic store dispatcher
        // failure paths use console.warn pre-Toast wiring; Story 1.13 onward
        // routes to Toast but the warn fallback stays as belt-and-suspenders).
        files: ["app/**/*.{ts,tsx}"],
        ignores: ["app/**/*.test.{ts,tsx}"],
        rules: {
          "no-console": ["error", { allow: ["warn", "error"] }],
        },
      },
      {
        // E2E: forbid page.waitForTimeout — flaky-test footgun. Use page.route
        // for deterministic timing, or expect().to* with auto-retry.
        files: ["e2e/**/*.{ts,tsx}"],
        rules: {
          "no-restricted-syntax": [
            "error",
            {
              selector: "CallExpression[callee.property.name='waitForTimeout']",
              message:
                "page.waitForTimeout makes E2E tests flaky. Use page.route() for deterministic timing or expect().to* with auto-retry. (TEA amendment M-3.)",
            },
          ],
        },
      },
      {
        // Tests: relaxed (allow console; Vitest globals).
        files: ["**/*.test.{ts,tsx}"],
        rules: {
          "no-console": "off",
          "@typescript-eslint/no-explicit-any": "off",
        },
      },
    );
    ```
  - [ ] 2.3: Add `"lint": "eslint ."` to `package.json`.
  - [ ] 2.4: Run `pnpm lint` locally. **Expect violations on first run** — typescript-eslint's recommended ruleset is opinionated (e.g., `no-unused-vars` flags underscore-prefixed params even though we use them deliberately). Fix per the convention OR add overrides. Common adjustments: configure `@typescript-eslint/no-unused-vars` to allow underscore-prefixed (`{ argsIgnorePattern: '^_', varsIgnorePattern: '^_' }`).

- [ ] **Task 3: Author `.github/workflows/ci.yml`** (AC 1, 2, 3, 4, 5, 8, 9)
  - [ ] 3.1: Create `.github/workflows/ci.yml` at the **repo root** (not under `todo-app/` — GitHub Actions reads `.github/` from the repo root).
  - [ ] 3.2: Workflow:
    ```yaml
    name: CI

    on:
      push:
        branches: [main]
      pull_request:

    jobs:
      ci:
        runs-on: ubuntu-latest
        defaults:
          run:
            working-directory: todo-app
        services:
          postgres:
            image: postgres:17-alpine
            env:
              POSTGRES_USER: todo
              POSTGRES_PASSWORD: todo
              POSTGRES_DB: todo
            ports:
              - 5432:5432
            options: >-
              --health-cmd "pg_isready -U todo"
              --health-interval 5s
              --health-timeout 3s
              --health-retries 10
        env:
          DATABASE_URL: postgres://todo:todo@localhost:5432/todo
        steps:
          - name: Checkout
            uses: actions/checkout@v4

          - name: Install pnpm
            uses: pnpm/action-setup@v4
            with:
              version: 10.33.2

          - name: Setup Node
            uses: actions/setup-node@v4
            with:
              node-version: 22
              cache: pnpm
              cache-dependency-path: todo-app/pnpm-lock.yaml

          - name: Install dependencies
            run: pnpm install --frozen-lockfile

          - name: Apply migrations
            run: pnpm db:migrate

          - name: Typecheck
            run: pnpm typecheck

          - name: Lint
            run: pnpm lint

          - name: Gap I-1 grep enforcement
            run: pnpm check:gap-i1

          - name: Vitest with coverage
            run: pnpm test:coverage

          - name: Upload coverage report
            if: always()
            uses: actions/upload-artifact@v4
            with:
              name: coverage-report
              path: todo-app/coverage/
              retention-days: 7

          - name: Docker build
            run: docker build -t todo-app:ci .

          # TODO Story 2.9: enable Playwright + axe jobs once specs exist.
          # - name: Playwright E2E
          #   run: pnpm test:e2e
          # - name: axe accessibility scan
          #   run: pnpm test:a11y
    ```
  - [ ] 3.3: **Pinned action versions** per AC 4: `actions/checkout@v4`, `pnpm/action-setup@v4`, `actions/setup-node@v4`, `actions/upload-artifact@v4`. No `@latest`. (These are major-version pins — the actions ecosystem treats v-major as stable; pinning to a specific SHA would be even tighter but adds churn for low marginal security gain in a v1 training-reference.)
  - [ ] 3.4: **Postgres service container** runs alongside the job; the migration step + integration tests connect via `localhost:5432` (GitHub Actions exposes service ports on the runner host).
  - [ ] 3.5: **Coverage upload runs on `if: always()`** so even a failed test still uploads partial coverage — useful for diagnosing why a build broke.

- [ ] **Task 4: Verify locally** (AC 2)
  - [ ] 4.1: `pnpm typecheck` exit 0.
  - [ ] 4.2: `pnpm lint` — fix any new violations.
  - [ ] 4.3: `pnpm check:gap-i1` exit 0.
  - [ ] 4.4: `pnpm test:coverage` — verify coverage report appears under `coverage/` AND all thresholds pass (≥70% on lines/branches/functions/statements). If short, add targeted tests.
  - [ ] 4.5: `docker build -t todo-app:ci .` from `todo-app/` — should succeed.

- [ ] **Task 5: `.gitignore` updates** (AC 5)
  - [ ] 5.1: Add to `todo-app/.gitignore`: `coverage/` (the coverage report directory should not be committed).

- [ ] **Task 6: Commit**
  - [ ] 6.1: `git add . && git commit -m "Story 2.7: GitHub Actions CI pipeline + ESLint + coverage"`.

## Dev Notes

### Why this story matters

**The gate that makes the rest of the testing discipline mechanical.** Stories 1.5 (Gap I-1 grep), 1.6 (pattern scanner test), 1.10–1.17 (per-story RTL + integration tests), and Story 2.9 (Playwright + axe) all depend on a CI that *runs* them on every push. Without Story 2.7, the disciplines are voluntary — a contributor can skip them locally. With it, every PR is mechanically gated.

**ESLint flat config + no-console + no-restricted-syntax** are the local-time enforcement of patterns. The waitForTimeout rule in particular mitigates OPS-3 (test flakiness) per TEA M-4 — even before Story 2.9 introduces Playwright, the rule is in the config so the moment a spec lands with `page.waitForTimeout(...)`, the lint step fails.

### Architectural context

- **Gate sequence (architecture line 211):** typecheck → lint → vitest (≥70% coverage) → playwright (≥5 incl. concurrent-rollback) → axe (zero violations) → docker build. Story 2.7 implements all but playwright + axe (Story 2.9's domain).
- **Pinned action versions** — the architecture's CI section emphasizes `*the gate shape* is what's load-bearing for training`. Pinned versions make the workflow reproducible across re-runs.
- **Coverage threshold of 70%** — architecture's "≥70% meaningful coverage" target. The keyword is *meaningful* — branch coverage matters, not just line coverage. Vitest's v8 provider gives both.

### Carry-over

From **Story 1.5**: `scripts/check-gap-i1.sh` exists. The CI workflow runs it via `pnpm check:gap-i1`.
From **Story 1.6**: `Test 1.6-UNIT-001` (the pattern-verification test scanner) runs as part of `pnpm test`. The CI's vitest step exercises it automatically.
From **Story 2.4**: ESLint `no-console` rule was deferred. Story 2.7 implements it.
From **Story 2.1**: `docker build` in CI just verifies the image builds — no push, no tag for production.

### Files being created/modified

- `.github/workflows/ci.yml` — NEW (at repo root, not `todo-app/`)
- `todo-app/eslint.config.js` — NEW
- `todo-app/vitest.config.ts` — MODIFIED (add coverage block)
- `todo-app/package.json` — MODIFIED (add `lint` and `test:coverage` scripts; `eslint` + `typescript-eslint` + `@vitest/coverage-v8` deps)
- `todo-app/.gitignore` — MODIFIED (add `coverage/`)

### LLM-developer guardrails

- **Don't use `@latest` on action versions.** Major-version pins (`@v4`) are the v1 floor. SHA pins are tighter but defer to security-conscious orgs.
- **Don't lower the coverage threshold to make the build pass.** Add tests instead.
- **Don't disable `no-console` globally.** The `{ allow: ['warn', 'error'] }` setting is the right v1 stance — error/warn calls are deliberate; log/info/debug are accidental dev detritus.
- **Don't enable Playwright/axe jobs in this story.** They're commented `# TODO Story 2.9`. Implementing here would spread the test-design work across two stories.
- **Don't run docker build INSIDE the same job** as the heavy test jobs unless needed — actually for v1 simplicity it's fine; build is fast (~30 sec on cached layers). Splitting into a separate job would add complexity without value at v1 scale.

### Cross-cutting AC compliance (Epic 2)

- ✓ All container images run as non-root (Story 2.1) ✓
- ✓ pino structured JSON to stdout (Story 2.4) ✓
- ✓ env validation (Story 2.3) ✓
- ✓ Helmet-style security headers (Story 2.5) ✓
- ✓ private-URL deployment posture (Story 2.6) ✓
- ✓ CI gates: typecheck + lint + Gap I-1 + coverage + docker build all wired (Story 2.7) ✓
- ✓ Playwright + axe: deferred to Story 2.9
- ✓ `pnpm typecheck` + `pnpm test` + `pnpm check:gap-i1` + `pnpm lint` all pass

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 2.7" lines 638–657
- `_bmad-output/planning-artifacts/architecture.md` line 211 (CI/CD: GitHub Actions, gate sequence)
- `_bmad-output/test-artifacts/test-design/ToDo-App-handoff.md` § TEA M-4 (waitForTimeout lint rule + e2e fixtures)
- Story 1.5 file: gap-i1 grep script
- Story 1.6 file: pattern-verification test (already runs in vitest)

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7.

### Debug Log References
(Populated.)

### Completion Notes List
(Populated.)

### File List
(Populated.)

### Change Log
(Populated.)
