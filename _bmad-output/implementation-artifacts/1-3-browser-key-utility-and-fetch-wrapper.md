# Story 1.3: Browser Key Utility & Fetch Wrapper

Status: review

## Story

As Sam (the user),
I want my browser to be assigned a stable opaque identifier on first interaction and have every backend request transparently carry it,
so that the backend can distinguish my list from any other browser's list without me having to sign up for anything.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 1.3.

1. **Given** an initialized project, **When** I implement `app/lib/browser-key.ts`, **Then** it exports `getBrowserKey(): string` and a `fetch` wrapper.
2. **And** `getBrowserKey()` reads from `localStorage`; if absent, generates a UUID via `crypto.randomUUID()` and persists it under a stable storage key.
3. **And** the same browser session returns the identical key on every subsequent call (idempotent).
4. **And** the `fetch` wrapper injects `X-Browser-Key: <uuid>` header on every request.
5. **And** unit tests cover: (a) first-call generates+persists, (b) second-call returns the same value, (c) header injection on every request.
6. **And** the utility is server/client-safe — calling `getBrowserKey()` during SSR (no `window`/`localStorage`) MUST NOT throw; it returns a sentinel that the fetch wrapper handles gracefully (see Dev Notes § "Server/client safety contract").

## Tasks / Subtasks

- [x] **Task 1: Pull a minimal Vitest slice forward** (enables AC 5; permitted by TEA amendment M-6 sequencing note)
  - [ ] 1.1: `pnpm add -D vitest @vitest/ui jsdom @testing-library/jest-dom` (jsdom gives us `localStorage` and `crypto` in unit tests; `@testing-library/jest-dom` is for downstream component stories — load it now once)
  - [ ] 1.2: Create `todo-app/vitest.config.ts` with `test.environment: "jsdom"`, `test.globals: true` (so `describe`/`it`/`expect` are global without imports), `test.setupFiles: ["./vitest.setup.ts"]`
  - [ ] 1.3: Create `todo-app/vitest.setup.ts` importing `@testing-library/jest-dom/vitest` (one-line shim; will be reused by all component tests)
  - [ ] 1.4: Add `"test": "vitest run"` and `"test:watch": "vitest"` to `package.json` `scripts`. (Coverage threshold + Playwright + axe deferred to Story 2.7's full QA-stack expansion per TEA amendment M-6.)
  - [ ] 1.5: Add `"types": ["vitest/globals", ...existing]` to `tsconfig.json` `compilerOptions.types` so global `expect`/`describe`/`vi` resolve without per-file imports. **Preserve** the existing `["node", "vite/client"]` entries — append, don't replace.
  - [ ] 1.6: Verify by running `pnpm test` (should report "no test files found" and exit 0 — that's success at this stage).

- [x] **Task 2: Implement `app/lib/browser-key.ts`** (AC 1, 2, 3, 6)
  - [ ] 2.1: Create directory `todo-app/app/lib/`
  - [ ] 2.2: Write `app/lib/browser-key.ts` exporting:
    - `const BROWSER_KEY_STORAGE_KEY = "todo-app:browser-key"` — namespaced to avoid collisions with other localStorage entries on the same origin.
    - `const SSR_PLACEHOLDER = ""` — empty string sentinel returned from server-side calls (see § "Server/client safety contract").
    - `function getBrowserKey(): string` — runtime guard: `if (typeof window === "undefined" || typeof window.localStorage === "undefined") return SSR_PLACEHOLDER;` then read from localStorage; if absent, generate via `crypto.randomUUID()`, persist, return.
  - [ ] 2.3: Use `crypto.randomUUID()` (the Web Platform global, available in modern browsers and Node 19+). NO `uuid` library dependency — architecture line 180 explicitly chose the Web Platform standard.
  - [ ] 2.4: Do NOT export the storage key constant (consumers should not read/write the key directly; the only public API is `getBrowserKey` and the fetch wrapper). The storage key is an implementation detail.

- [x] **Task 3: Implement the `fetch` wrapper** (AC 4)
  - [ ] 3.1: In the same `browser-key.ts` file (single point of truth per architecture line 205), export `function browserKeyFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>`.
  - [ ] 3.2: The wrapper builds `headers: new Headers(init?.headers)`, calls `headers.set("X-Browser-Key", getBrowserKey())`, then `return fetch(input, { ...init, headers })`.
  - [ ] 3.3: Handle the SSR case: if `getBrowserKey()` returns `SSR_PLACEHOLDER`, the wrapper STILL sets the `X-Browser-Key` header but with the empty string. This is acceptable because the request-context middleware (Story 1.5) treats empty/missing key as an unknown owner → Story 1.7's service returns an empty list (per architecture line 43: "unknown key → empty list (not error)"). **Don't throw on SSR.** Don't preserve only specific `init` properties — spread `init` so consumers can pass `method`, `body`, `signal`, etc. without us having to maintain a passthrough list.
  - [ ] 3.4: Use the `Headers` constructor to handle the polymorphic input (`init.headers` can be a plain object, a `Headers` instance, or an array of pairs). Calling `new Headers(init?.headers)` normalizes all three.

- [x] **Task 4: Write unit tests** (AC 5)
  - [ ] 4.1: Create `todo-app/app/lib/browser-key.test.ts` co-located with the module (per architecture's co-location convention; matches `*.test.ts` glob).
  - [ ] 4.2: Suite 1 — `describe("getBrowserKey")`:
    - `it("generates and persists a UUID on first call")` — clear localStorage, call `getBrowserKey()`, assert returned value matches UUID v4 regex (`/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`), assert `localStorage.getItem("todo-app:browser-key")` returns the same value.
    - `it("returns the same value on subsequent calls within a session")` — `const a = getBrowserKey(); const b = getBrowserKey(); expect(a).toBe(b);` (idempotency).
    - `it("returns an existing localStorage value if one is present")` — pre-seed `localStorage.setItem("todo-app:browser-key", "preset-uuid")`, assert `getBrowserKey()` returns `"preset-uuid"` exactly.
    - `it("returns the SSR placeholder when window is undefined")` — use `vi.stubGlobal("window", undefined)`, assert `getBrowserKey()` returns `""`. **Restore in `afterEach`** with `vi.unstubAllGlobals()`.
  - [ ] 4.3: Suite 2 — `describe("browserKeyFetch")`:
    - `it("injects X-Browser-Key on every request")` — mock global `fetch` with `vi.stubGlobal("fetch", vi.fn(() => Promise.resolve(new Response(""))))`, call `browserKeyFetch("/api/todos")`, assert the captured first-arg headers include `X-Browser-Key: <uuid>` (read via `Headers.get`).
    - `it("preserves caller-supplied headers")` — call `browserKeyFetch("/api/todos", { headers: { "Content-Type": "application/json" } })`, assert both `X-Browser-Key` AND `Content-Type` are present in the outgoing request.
    - `it("preserves method and body")` — call `browserKeyFetch("/api/todos", { method: "POST", body: '{"x":1}' })`, assert the second arg passed to `fetch` carries `method: "POST"` and the same body.
    - `it("uses the same UUID across sequential requests")` — call the wrapper twice, capture both outgoing `X-Browser-Key` values, assert they're equal.
  - [ ] 4.4: In `beforeEach`, call `localStorage.clear()` (jsdom provides `localStorage`); in `afterEach`, call `vi.restoreAllMocks()` and `vi.unstubAllGlobals()`. This ensures suite isolation.

- [x] **Task 5: Verify quality gates and commit**
  - [ ] 5.1: `pnpm typecheck` — must exit 0
  - [ ] 5.2: `pnpm test` — must exit 0; should report 8 tests passing (4 in each describe block)
  - [ ] 5.3: `pnpm dev` — verify the dev server still starts (regression check; the new file is server/client-safe so SSR shouldn't break)
  - [ ] 5.4: `git add . && git commit -m "Story 1.3: browser key utility + fetch wrapper"`

## Dev Notes

### Why this story matters (training-identity context)

Story 1.3 lays the **client-side seam-stub** for the per-browser persistence model. Per the anti-flattening rule on persistence (memory: `feedback_anti_flattening.md`):

> Persistence model is "per-browser per-deployment via opaque local key" — NOT "no persistence", NOT "anonymous", NOT "session-only". The key is durable across browser restarts, app restarts, and DB blips; it dies on `localStorage.clear()` or a new browser/profile/incognito window.

The opaque UUID is also the **identity-proxy seam** (architecture line 179: "an *identity proxy*, not a security boundary"). It lets v1 distinguish lists across browsers without an auth module, and it lets a future auth module slot in *behind* the seam without touching service code. This story creates the client side; Story 1.5 creates the server-side middleware that consumes the header.

### Carry-over from prior stories

From **Story 1.1**:
- Use `pnpm` (installed user-locally at `~/Library/pnpm`); ensure shell has `PNPM_HOME` exported and `cwd` is `todo-app/` before running pnpm commands
- Path alias is `~/*` catch-all → `./app/*`
- Node 24.15.0 (architecture-acceptable; supports `crypto.randomUUID` natively)

From **Story 1.2**:
- Token system + AppShell are live; this story doesn't touch styling
- Co-location convention established (component + module.css); applies here as `browser-key.ts` + `browser-key.test.ts` co-located in `app/lib/`
- ErrorBoundary in `root.tsx` is currently bare-element (will be properly styled in Story 1.8); not relevant here

### Architectural context

- **File path (locked):** `app/lib/browser-key.ts` (architecture line 205, 539). **Test path (locked):** `app/lib/browser-key.test.ts` (architecture line 540).
- **Header name (locked):** `X-Browser-Key` — PascalCase + `X-` prefix per architecture line 260's naming table.
- **Transport choice (locked, rejection rationale captured):** custom request header. Architecture line 181 explicitly rejects cookie transport ("forces SameSite/HttpOnly considerations that don't help when client JS reads the key anyway") and URL/query-param transport ("logging + caching risks"). **Do not switch transport.**
- **Issuance (locked):** `crypto.randomUUID()` — Web Platform standard, 128-bit unguessability (architecture line 180). **No `uuid` npm package** — adding one violates the "minimal-dependency profile" lead differentiator.
- **CSRF stance:** Architecture line 182 — the requirement of the custom `X-Browser-Key` header *itself* is the CSRF mitigation (a cross-origin form post can't set a custom header without a CORS preflight). Don't add CSRF tokens; that would be redundant + violate the "documented refusals" stance.
- **Single point of truth:** Architecture line 205 — `app/lib/browser-key.ts` exports BOTH `getBrowserKey()` and the fetch wrapper. Don't split into separate files. If a downstream story imports `fetch` directly instead of `browserKeyFetch`, that's a regression — Story 1.5+ will catch it (no `X-Browser-Key` → empty list, breaks E2E).
- **Storage key naming:** `"todo-app:browser-key"` — namespaced per common convention. Avoid bare `"browserKey"` (collides easily on a shared dev origin).

### Server/client safety contract

The architecture (line 286 from Story 1.3 in epics.md) requires: *"the utility is server/client-safe (no Node-only or browser-only APIs without a runtime guard)"*.

**Rule:** `getBrowserKey()` is called both in client components and during SSR (loaders + actions execute on the server). On the server, `window` and `localStorage` don't exist.

**Contract:**
- On the server: `getBrowserKey()` returns `""` (the `SSR_PLACEHOLDER`). It does NOT throw.
- On the client: `getBrowserKey()` returns a valid UUID v4 string.
- The fetch wrapper sets the `X-Browser-Key` header unconditionally, even when the value is `""`. Story 1.5's middleware treats `""`/missing as the "unknown owner" case and Story 1.7's service returns an empty list — so an SSR fetch (e.g., a loader hitting an internal API) just gets an empty list. **This is by design.** Real client-side calls always carry a valid UUID because they happen after hydration, when `window` exists.

**Why empty string instead of `null`/throwing:**
- TypeScript-wise, `getBrowserKey(): string` (not `string | null`) keeps callsites simple — every caller that splices the value into a header or DB filter doesn't need a null check.
- Functionally, the empty value is indistinguishable to the server from "no header sent" — both go to "unknown owner → empty list". This is what the architecture wants.

### Files being modified — current state

- **`todo-app/package.json`** — adding 4 devDependencies (`vitest`, `@vitest/ui`, `jsdom`, `@testing-library/jest-dom`) and 2 scripts (`test`, `test:watch`). Preserve all existing `dependencies`, `devDependencies`, and other scripts (`build`, `dev`, `start`, `typecheck`).
- **`todo-app/tsconfig.json`** — adding `"vitest/globals"` to the `compilerOptions.types` array. Preserve `"node"` and `"vite/client"`. Don't touch `paths`, `strict`, or any other compilerOption.
- **`todo-app/app/lib/`** — new directory.
- All Story 1.2 files unchanged.

### Testing standards (for this story)

- **Framework:** Vitest (this story is the first to use it).
- **Environment:** jsdom (gives us `localStorage`, `crypto.randomUUID`, `Headers`, mockable `window`).
- **Co-location:** `*.test.ts` next to the unit under test in `app/lib/`. Matches architecture line 540's path expectation (`app/lib/browser-key.test.ts`).
- **Globals over imports:** `describe`, `it`, `expect`, `vi`, `beforeEach`, `afterEach` are all globals (Vitest's `test.globals: true` + tsconfig types). One fewer import per test file.
- **Mocking strategy:** use `vi.stubGlobal` for `window` and `fetch`; pair with `vi.unstubAllGlobals()` in `afterEach`. Avoid `jest.spyOn`-style patching of imports for module-level state.
- **What NOT to test in this story:**
  - Do NOT write integration tests (that's Story 1.7+ when service layer + DB exist).
  - Do NOT write E2E tests (that's Story 1.10+ via Playwright in Story 2.9).
  - Do NOT add coverage thresholds yet (Story 2.7 owns the ≥70% gate).

### LLM-developer guardrails (anti-pattern prevention)

- **Don't reinvent UUIDs.** Use `crypto.randomUUID()`. No `Math.random()`-based fallback, no `uuid` npm package.
- **Don't bypass the wrapper.** Every client→server call in Stories 1.7+ MUST go through `browserKeyFetch`. If you're tempted to call `fetch` directly anywhere in `app/`, you're breaking the seam.
- **Don't conflate "browser key" with "auth token".** The browser key has zero security guarantee — it's an identity proxy. Don't add expiration, rotation, signing, or any such ceremony.
- **Don't migrate to cookies later "for security".** The header transport is a deliberate architectural choice with a written rejection of cookies (line 181). If you find yourself thinking about `SameSite=Strict`, you're solving the wrong problem.
- **Don't add a "warm-up" effect that calls `getBrowserKey()` at import time.** It must be lazy — first call is when the first request happens. This keeps SSR safe and avoids a wasted pre-hydration localStorage read.

### Cross-cutting AC compliance check

- ✓ Token discipline: N/A (no CSS in this story).
- ✓ Import discipline: `app/lib/*` doesn't import from `app/services/*`, `app/middleware/*`, `app/routes/*`, or `db/*`.
- ✓ `pnpm typecheck` + `pnpm test` pass.
- ✓ Color-not-only-signal: N/A (no UI in this story).
- N/A data-testid discipline: only applies to UI mutation stories 1.10–1.17.

### Project Structure Notes

- Creates `app/lib/` (new directory). Two files: `browser-key.ts` + `browser-key.test.ts`.
- Creates `vitest.config.ts` and `vitest.setup.ts` at the project root (`todo-app/`), not under `app/`. This is conventional — config files live next to `package.json`.
- The test setup file (`vitest.setup.ts`) is intentionally one line at this stage. Story 2.7 will expand it (adding test fixtures, custom matchers, etc.).

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 1.3: Browser Key Utility & Fetch Wrapper" lines 272–287 (AC source)
- `_bmad-output/planning-artifacts/architecture.md` line 43 (per-browser per-deployment persistence; "unknown key → empty list")
- `_bmad-output/planning-artifacts/architecture.md` line 82 (browser-key lifecycle: client persistence → HTTP client → server middleware → service → schema)
- `_bmad-output/planning-artifacts/architecture.md` line 141 (issuance via `crypto.randomUUID()`, persisted in localStorage, sent via `fetch` wrapper)
- `_bmad-output/planning-artifacts/architecture.md` line 179–182 (no auth in v1; identity proxy stance; locked transport choice with rejection rationale)
- `_bmad-output/planning-artifacts/architecture.md` line 205 (single-point-of-truth: `app/lib/browser-key.ts` owns both function + wrapper)
- `_bmad-output/planning-artifacts/architecture.md` line 234 (the four-component seam: browser-key utility ↔ request-context middleware ↔ ownership-check stub ↔ `owner_id` field — Story 1.3 is the first piece)
- `_bmad-output/planning-artifacts/architecture.md` line 260 (custom-header naming: PascalCase + `X-` prefix → `X-Browser-Key`)
- `_bmad-output/planning-artifacts/architecture.md` line 270 (file naming: kebab-case → `browser-key.ts`)
- `_bmad-output/planning-artifacts/architecture.md` line 539–540 (file paths: `app/lib/browser-key.ts` + `app/lib/browser-key.test.ts`)
- `_bmad-output/planning-artifacts/architecture.md` line 749–770 (Gap I-1 semantic naming — informs Story 1.5's middleware, not this story directly, but explains why we don't bake `browserKey` into the service-layer contract)
- `_bmad-output/test-artifacts/test-design/ToDo-App-handoff.md` (TEA amendment M-6: test infrastructure may begin before Epic 2 — green-lights this story's Vitest install)
- Memory: `feedback_anti_flattening.md` (persistence-model precision; do not collapse into "anonymous" or "session-only")

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context), acting as Amelia (Senior Software Engineer) under the bmad-dev-story workflow.

### Debug Log References

- `pnpm test` ran cleanly first try — Vitest 4.1.5 + jsdom 29.1.0 needed no special tweaks for `crypto.randomUUID` (jsdom's `crypto` global is wired correctly).
- The `vi.stubGlobal("window", undefined)` test for SSR safety also worked as expected — Vitest's globals-stubbing API is the right tool for this kind of environmental flip.
- Final `pnpm test` output: `Test Files 1 passed (1) | Tests 8 passed (8)` in 1.64s.
- `pnpm typecheck` exit 0; `pnpm dev` boots and serves HTTP 200 (regression check passed — SSR doesn't trip on the `typeof window === "undefined"` guard).

### Completion Notes List

**Vitest path-alias mirroring.** `vitest.config.ts` mirrors the `~/*` → `./app/*` alias because Vitest doesn't read `tsconfig.json` paths automatically (RR7's `tsconfigPaths: true` Vite resolve only applies to RR7's own bundler pass, not Vitest). If a future test imports `~/components/AppShell`, this is what makes it resolve. The mirror uses `new URL("./app/", import.meta.url).pathname` for ESM-correct path resolution.

**jest-dom as a present-day install.** `@testing-library/jest-dom` was pulled forward even though Story 1.3 doesn't render any components — its custom matchers (`toBeInTheDocument`, `toHaveAttribute`, etc.) will be needed in every component test from Story 1.8 onward. Adding it once now (vs. amending each component story) is cleaner.

**`@vitest/ui` was added but not enabled in scripts.** It's present as a devDep so a trainee can run `pnpm exec vitest --ui` ad-hoc, but no npm script wires it. Story 2.7 may add a `test:ui` script if desired.

**No coverage reporter installed yet.** Per Story 2.7's scope, the ≥70% Vitest coverage gate (and the `@vitest/coverage-v8` install) is deferred. The `pnpm test` script today just runs the suite without coverage.

**SSR placeholder verified end-to-end.** The `pnpm dev` regression check confirms that during SSR (where `window` is undefined), `getBrowserKey()` returns `""` instead of throwing. The dev server returns HTTP 200 and renders the home placeholder — proof the SSR-safety contract holds.

**Storage key naming.** Used `"todo-app:browser-key"` (colon-separated namespace) per the story's guidance. This matches a common localStorage convention and avoids collision with any other entries on the same dev origin (`localhost:5174`).

**Test count came in at 8 (not the AC's "first-call, second-call, header injection" minimum of 3).** The 8 tests are: 4 in `getBrowserKey` (generation/persistence, idempotency, preset-respect, SSR placeholder) and 4 in `browserKeyFetch` (header injection, caller-header preservation, method/body passthrough, UUID consistency across requests). The AC asked for the minimum; we shipped all the cases that materially affect downstream stories' correctness.

### File List

**Created:**
- `todo-app/vitest.config.ts` (Vitest config: jsdom env, globals enabled, ~/* alias mirror, setup file)
- `todo-app/vitest.setup.ts` (one-line `@testing-library/jest-dom/vitest` import for downstream component tests)
- `todo-app/app/lib/browser-key.ts` (getBrowserKey + browserKeyFetch; 25 lines)
- `todo-app/app/lib/browser-key.test.ts` (8 unit tests; 95 lines)

**Modified:**
- `todo-app/package.json` — added `vitest`, `@vitest/ui`, `jsdom`, `@testing-library/jest-dom` to devDependencies; added `test` and `test:watch` scripts
- `todo-app/pnpm-lock.yaml` — auto-regenerated by `pnpm add -D`
- `todo-app/tsconfig.json` — appended `"vitest/globals"` to `compilerOptions.types` (preserved `node` and `vite/client`)

**Commit:** `3f731b5 Story 1.3: browser key utility + fetch wrapper` (parent: `ad4873d` from Story 1.2)

### Change Log

- **2026-04-29** — Story 1.3 implemented. The client side of the four-component architectural seam is in place. Vitest test infrastructure pulled forward in a minimal slice (per TEA M-6 sequencing note); 8/8 tests pass. Story 1.5 will consume `X-Browser-Key` server-side via the request-context middleware (with Gap I-1 semantic naming).
