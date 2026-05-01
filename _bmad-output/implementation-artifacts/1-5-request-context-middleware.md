# Story 1.5: Request-Context Middleware (with Gap I-1 Semantic Naming)

Status: review

## Story

As an architect honoring the four seams,
I want a request-context middleware that builds a `RequestContext` with semantically-named fields (`ownerId`) rather than mechanism-named fields (`browserKey`),
so that future auth modules can replace the principal source without changing service-layer call sites.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 1.5 (lines 305–321).

1. **Given** Stories 1.3 and 1.4 are complete, **When** I implement `app/middleware/request-context.ts` exporting `buildRequestContext(request: Request): RequestContext`, **Then** the function reads the `X-Browser-Key` header from the request and produces a `RequestContext`.
2. **And** `RequestContext` has shape `{ requestId: string, principal: Principal, ownerId: string }`.
3. **And** `Principal` is a tagged union: `{ kind: 'browser-key', browserKey: string } | { kind: 'user', userId: string }` — the `'user'` variant is *declared but not constructed* in v1 (it will be populated by a future auth module).
4. **And** `ownerId` is derived from `principal.browserKey` when `kind === 'browser-key'` (and would derive from `principal.userId` when `kind === 'user'`).
5. **And** the middleware reads `X-Browser-Key` header from the request; if absent or empty, it generates a new UUID server-side as a fallback AND emits a logger warning. (Server-side fallback handles SSR's `getBrowserKey() → ""` case from Story 1.3 and any malformed-client edge case.)
6. **And** unit tests cover: (a) header present uses it; (b) header absent generates fallback + emits warning; (c) `ownerId` derived correctly from `principal.browserKey`; (d) `requestId` is generated and is a UUID.
7. **And** **service code consumes `ctx.ownerId` (never `ctx.principal.browserKey` directly)** — Gap I-1 fix discipline. (No service code exists yet — Story 1.7 builds it. This story documents and asserts the discipline so Story 1.7 inherits it.)
8. **And** **CI grep enforcement (TEA amendment m-1)**: a runnable script (Story 2.7 will hook it to CI) runs `grep -rn 'ctx.principal.browserKey\|ctx\.principal\.browserKey' app/services/` and fails on any match. Static enforcement of the Gap I-1 semantic-naming discipline. *Companion to Story 2.7's lint infrastructure.*

## Tasks / Subtasks

- [x] **Task 1: Stand up a minimal logger stub** (AC 5; carries forward to Story 2.4)
  - [ ] 1.1: Create `todo-app/app/lib/logger.ts`. Contract: exports a `logger` singleton with `info`, `warn`, `error` methods that each accept `(payload: Record<string, unknown>, msg?: string)` — pino's structured shape.
  - [ ] 1.2: For Story 1.5, the implementation is a thin wrapper around `console`. Each method does `console[level](JSON.stringify({ level, time: new Date().toISOString(), ...payload, msg }))`. This produces structured-JSON-shaped output that's drop-in replaceable when Story 2.4 swaps in pino.
  - [ ] 1.3: Tests deferred — Story 2.4 owns the logger's full test surface (pino transport config, level filtering, redaction of browser keys). Story 1.5 just needs the call to *not throw*.

- [x] **Task 2: Implement `app/middleware/request-context.ts`** (AC 1–5, 7)
  - [ ] 2.1: Create directory `todo-app/app/middleware/`.
  - [ ] 2.2: Write `app/middleware/request-context.ts`:
    - Export `type Principal = { kind: 'browser-key'; browserKey: string } | { kind: 'user'; userId: string };`
    - Export `type RequestContext = { requestId: string; principal: Principal; ownerId: string };`
    - Export `function buildRequestContext(request: Request): RequestContext`:
      1. Read `X-Browser-Key` header (case-insensitive — `Headers.get` is case-insensitive by spec).
      2. If header is absent or empty string, generate a fallback UUID via `crypto.randomUUID()` and call `logger.warn({ event: "browser-key.missing", path: new URL(request.url).pathname }, "X-Browser-Key absent; generated server-side fallback")`.
      3. Build `principal: { kind: 'browser-key', browserKey: <header value or fallback> }`.
      4. Generate a fresh `requestId` via `crypto.randomUUID()`.
      5. Derive `ownerId`: if `principal.kind === 'browser-key'` then `principal.browserKey`; else `principal.userId`. Use a `switch` so TypeScript exhaustiveness checks the union.
      6. Return `{ requestId, principal, ownerId }`.
  - [ ] 2.3: **Do NOT export an `extractBrowserKey` helper or any other partial accessor** — service-layer callers should *only* see `RequestContext` and consume `ctx.ownerId`. Exposing the principal accessor invites the very Gap I-1 anti-pattern this story prevents.

- [x] **Task 3: Document the Gap I-1 discipline at the top of the file** (AC 7)
  - [ ] 3.1: Add a header comment in `request-context.ts` (3-5 lines max) explaining: this is the SEAM. Service code consumes `ctx.ownerId`. Touching `ctx.principal.browserKey` directly in service code defeats the seam — when auth lands, all such callsites must be edited.
  - [ ] 3.2: Comment must be brief — code-comment minimum per project conventions. Don't write a multi-paragraph essay; this is a "why" anchor for a future trainee scanning the file.

- [x] **Task 4: Write unit tests** (AC 6)
  - [ ] 4.1: Create `todo-app/app/middleware/request-context.test.ts` (co-located per architecture line 535).
  - [ ] 4.2: Test cases:
    - `it("uses the X-Browser-Key header value when present")` — build a `Request` with `headers: { "X-Browser-Key": "11111111-2222-4333-8444-555555555555" }`; call `buildRequestContext`; assert `principal.kind === 'browser-key'`, `principal.browserKey === '11111111-...'`, and `ownerId === principal.browserKey`.
    - `it("generates a server-side fallback UUID when the header is absent")` — build a `Request` with no headers; assert `principal.browserKey` is a valid UUID v4 (regex test); also assert `console.warn` was called (use `vi.spyOn(console, 'warn').mockImplementation(() => {})` then `expect(console.warn).toHaveBeenCalled()`).
    - `it("generates a fallback when the header is the empty string")` — `headers: { "X-Browser-Key": "" }`; same assertions as above.
    - `it("derives ownerId from principal.browserKey")` — pass header, assert `ctx.ownerId === ctx.principal.browserKey`.
    - `it("generates a unique requestId per call")` — call twice with the same header value; assert the two `requestId`s differ AND each matches UUID v4.
    - `it("emits a structured warning that includes the request path")` — pass a Request with URL `http://localhost/api/todos`; spy on `console.warn`; assert the captured argument string contains `"browser-key.missing"` and `"/api/todos"`.
  - [ ] 4.3: Use `// @vitest-environment node` at the top of the test file — `Request`, `Headers`, and `crypto.randomUUID` are all native in Node 22+, no jsdom needed and using node env keeps the Web Platform classes consistent with what RR7's loaders/actions get.

- [x] **Task 5: Add the Gap I-1 grep enforcement script** (AC 8)
  - [ ] 5.1: Create `todo-app/scripts/check-gap-i1.sh`:
    ```bash
    #!/usr/bin/env bash
    set -euo pipefail
    if grep -rn 'ctx\.principal\.browserKey' app/services/ 2>/dev/null; then
      echo "ERROR: ctx.principal.browserKey found in app/services/ — see Gap I-1 in architecture.md"
      echo "Service code must consume ctx.ownerId, never ctx.principal.browserKey directly."
      exit 1
    fi
    echo "OK: no ctx.principal.browserKey references in app/services/"
    ```
  - [ ] 5.2: `chmod +x scripts/check-gap-i1.sh`
  - [ ] 5.3: Add to `package.json` scripts: `"check:gap-i1": "bash scripts/check-gap-i1.sh"`.
  - [ ] 5.4: Run it once locally — should print `OK:` because `app/services/` doesn't exist yet (Story 1.7 creates it). The grep returns non-zero only when matches exist; absence-of-directory is also "no matches", so we use `2>/dev/null` and rely on the bash `if` consuming grep's exit. Test by manually creating a temporary file with `ctx.principal.browserKey` in `app/services/` (after Story 1.7 lands) — the script should fail. Story 2.7 will wire this script into the CI workflow.

- [x] **Task 6: Verify quality gates and commit**
  - [ ] 6.1: `pnpm typecheck` — exit 0 (TypeScript exhaustiveness check on the `Principal` union should compile cleanly)
  - [ ] 6.2: `pnpm test` — should report 21 total tests passing (8 from Story 1.3 + 1+6 from Story 1.4 + 6 from this story)
  - [ ] 6.3: `pnpm dev` — regression check: home placeholder still serves
  - [ ] 6.4: `pnpm check:gap-i1` — exit 0 with `OK: no ctx.principal.browserKey references in app/services/`
  - [ ] 6.5: `git add . && git commit -m "Story 1.5: request-context middleware with Gap I-1 semantic naming"`

## Dev Notes

### Why this story matters (training-identity context)

This story applies **the single Important gap** from architecture's validation review (I-1, lines 749–770). Per memory `project_seam_naming_fix.md`:

> When wiring request-context middleware, use `ctx.ownerId` + tagged-union principal, not `ctx.browserKey` directly, so auth doesn't bend the seam.

The original architecture draft named the principal field `ctx.browserKey` — mechanism-named. When the auth module lands later, that field becomes wrong (it's no longer a browser key, it's a user ID), and every service-layer caller has to be edited. Gap I-1 fixes this by:

1. Naming the field semantically (`ownerId` — what it *means*, not what it *is*).
2. Adding a tagged-union `Principal` that captures the source.
3. Letting service code consume only `ctx.ownerId` — auth swap touches just the middleware, not the seven service functions.

This story is **the implementation point of the Gap I-1 fix** (architecture line 772: "Should be done as part of the request-context middleware story, *not* as a separate story"). The "service code never touches ctx.principal.browserKey directly" rule is enforced via the bash grep script in Task 5; Story 2.7 hooks it to CI.

### Architectural context

- **File path (locked):** `app/middleware/request-context.ts` (architecture lines 295, 534).
- **Test path (locked):** `app/middleware/request-context.test.ts` (architecture line 535).
- **RequestContext shape (locked, Gap-I-1-applied):** `{ requestId: string, principal: Principal, ownerId: string }` (architecture lines 763–767). The original draft showed `{ requestId, browserKey }` but Gap I-1 supersedes that; this story's shape is the canonical one.
- **Principal tagged union (locked):** `{ kind: 'browser-key', browserKey: string } | { kind: 'user', userId: string }` (architecture lines 759–761). The `user` variant is **declared but never constructed in v1** — it exists as a future-auth landing strip, *not* as live functionality.
- **Server-side fallback (per AC 5):** when `X-Browser-Key` is absent or empty, the middleware generates a fresh UUID via `crypto.randomUUID()` and emits a warning. This handles two real cases:
  - **SSR**: Story 1.3's `getBrowserKey()` returns `""` during SSR (no `window`); Story 1.3's `browserKeyFetch` propagates that empty string as the header value; this middleware then generates a fallback. The user gets an empty list (architecture line 43: "unknown key → empty list") because the fallback UUID has no rows in the DB. **Story 1.7's loader will see `ctx.ownerId` = a fresh UUID with no DB rows → empty.** Correct.
  - **Malformed client**: a buggy or hostile client that fails to send the header. Same outcome (empty list).
  - The warning serves as a **detectability signal** — frequent fallbacks in logs indicate a client-side regression worth investigating.
- **No mutation of incoming `Request`:** `buildRequestContext` reads from `Request` but does not mutate it. Returns a new object the loaders/actions then pass into service functions explicitly. This is RR7's idiom (the framework doesn't have Express-style `req.context` mutation); the seam stays explicit.
- **Logger as a stub for Story 1.5, real for Story 2.4:** Story 2.4 owns pino. To avoid coupling Story 1.5's behavior to a specific logging backend, this story creates `app/lib/logger.ts` with the call surface (`logger.warn`, `logger.info`, `logger.error`) wired to `console`. Story 2.4 swaps internals to pino without touching any caller.

### Carry-over from prior stories

From **Story 1.3**:
- `getBrowserKey()` returns `""` during SSR; fetch wrapper propagates that. **This story's middleware MUST handle the empty-string case** — that's why AC 5 says "absent OR empty".
- `crypto.randomUUID()` is available in Node 22+; same call works server-side as client-side. No platform shim needed.
- Vitest globals + jsdom default; this story uses `// @vitest-environment node` for the same reason Story 1.4 did (Web Platform classes consistent with Node).

From **Story 1.4**:
- The DB schema has `owner_id uuid NULLABLE`. **Story 1.5's middleware produces an `ownerId` that may be a server-generated UUID** (the fallback case) — that's a value with no matching `owner_id` rows in the DB, so service queries return empty lists. The architecture explicitly contemplates this ("unknown key → empty list (not error)" — line 43).
- `db/client.ts` is server-only. The middleware is also server-only — both run in RR7 loaders/actions. No client-bundle leak risk in this story.

### Files being modified — current state

- **`todo-app/package.json`** — adding 1 script (`check:gap-i1`). Preserve all existing deps and scripts.
- **`todo-app/app/lib/`** — already exists (Story 1.3's `browser-key.ts`). Adding `logger.ts` here.
- **`todo-app/app/middleware/`** — NEW directory.
- **`todo-app/scripts/`** — NEW directory.

### Testing standards (for this story)

- All tests run under `// @vitest-environment node`.
- Use the Web Platform `Request` + `Headers` constructors directly — they're native in modern Node and identical to what RR7 passes into loaders.
- Spy on `console.warn` (the logger stub's backing call) using `vi.spyOn(console, 'warn').mockImplementation(() => {})`. Restore in `afterEach` with `vi.restoreAllMocks()`.
- The fallback-UUID test must NOT use a deterministic mock for `crypto.randomUUID` — testing the real call exercises the real Web Platform behavior. Just regex-assert UUID v4 shape on the output.

### LLM-developer guardrails

- **Don't expose `ctx.principal.browserKey` indirectly.** Don't write helpers like `getBrowserKeyFromContext(ctx)` — they invite the same Gap-I-1 anti-pattern just routed through a function. Service code should reach for `ctx.ownerId` and nothing else from the principal substructure.
- **Don't wire the middleware into a route action yet.** Stories 1.7+ will call `buildRequestContext(request)` from inside loaders/actions. This story is *building the function*, not invoking it. No `app/routes/*.tsx` changes in this story.
- **Don't add a "session" abstraction.** The request-context is per-request, not per-session. There's no in-memory cache, no cookie middleware, no token rotation. RR7 builds the `Request` once per loader/action invocation; the middleware builds the context once.
- **Don't skip the warning emission.** AC 5 specifies it. The warning is observable behavior — Story 2.4's pino tests will eventually depend on this call existing. The warning text format is structured-JSON-shaped via the logger stub; don't switch to `console.warn("text only")`.
- **Don't constrain the `Principal` union with utility types** (e.g., `Extract<Principal, { kind: 'browser-key' }>`) at the type definition. The union is the *contract* — utility-type narrowing belongs at the consumer, if at all.

### Cross-cutting AC compliance check

- ✓ Token discipline: N/A (no CSS).
- ✓ Import discipline: `app/middleware/*` doesn't import from `app/services/*`, `app/routes/*`, or `app/components/*`. It does import from `app/lib/logger` — that's allowed (lib provides shared utilities to middleware).
- ✓ `pnpm typecheck` + `pnpm test` pass.
- N/A color/focus: no UI.
- N/A data-testid: no UI.

### Project Structure Notes

- `app/middleware/` is created in this story. Story 1.6 will add `ownership-check.ts` to it.
- `app/lib/logger.ts` is a stub — Story 2.4 owns the real implementation. This is a deliberate deferral, not scope creep — the file's call surface is what matters for Story 1.5.
- `scripts/check-gap-i1.sh` lives at the project root (`todo-app/scripts/`), not under `app/`. It's tooling, not code. Story 2.7 will populate `scripts/` further (CI helpers) and wire to GitHub Actions.

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 1.5: Request-Context Middleware (with Gap I-1 Semantic Naming)" lines 305–321 (AC source, including TEA amendment m-1)
- `_bmad-output/planning-artifacts/architecture.md` line 46 (four seams; request-context carries the principal)
- `_bmad-output/planning-artifacts/architecture.md` line 179 (no auth in v1; identity proxy stance)
- `_bmad-output/planning-artifacts/architecture.md` line 222 (story 1.5 is "wire request-context middleware + ownership-check stub")
- `_bmad-output/planning-artifacts/architecture.md` line 234 (the four-piece seam — Story 1.5 is piece #2)
- `_bmad-output/planning-artifacts/architecture.md` line 295, 534–535 (file paths)
- `_bmad-output/planning-artifacts/architecture.md` line 399 (logger standard fields: requestId, browserKey truncated to 8 chars; informs Story 2.4 not this one)
- `_bmad-output/planning-artifacts/architecture.md` lines 749–770 (Gap I-1: full diagnosis + recommended fix)
- `_bmad-output/planning-artifacts/architecture.md` line 772 ("Should be done as part of the request-context middleware story" — that's this one)
- `_bmad-output/test-artifacts/test-design/ToDo-App-handoff.md` (TEA amendment m-1: CI grep enforcement)
- Memory: `project_seam_naming_fix.md` (Gap I-1 summary — `ctx.ownerId` + tagged-union principal, not `ctx.browserKey`)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context), acting as Amelia (Senior Software Engineer) under the bmad-dev-story workflow.

### Debug Log References

- Final test run: `Test Files 4 passed (4) | Tests 21 passed (21)` in 1.39s.
- `pnpm typecheck` — exit 0; the exhaustive `switch` on `Principal['kind']` compiled cleanly with no narrowing complaints from TS strict mode.
- `pnpm check:gap-i1` — exit 0 with `OK: app/services/ does not exist yet (no callers to check)`. The script's "directory absent → OK" branch is the right behavior pre-Story 1.7.
- **Cwd-reset reminder repeated:** ran into `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND` when shell cwd reset between Bash calls. Resolved by always prefixing with `cd /Users/pouya/Documents/Development/ToDo-App-AINE/todo-app &&`. Same advisory as Stories 1.2 and 1.4.

### Completion Notes List

**Logger stub layout.** `app/lib/logger.ts` is ~17 lines, exports a `logger` singleton with `info` / `warn` / `error` methods that emit JSON-shaped lines to `console`. The signature is `(payload: Record<string, unknown>, msg?: string)` — matches pino's structured-call shape exactly. Story 2.4 swaps internals (probably `pino()` directly + transport config) without any caller change.

**Why the warning's payload includes `path`.** A trainee debugging "why is my list empty?" benefits from seeing which route was hit when the fallback fired. The `new URL(request.url).pathname` extraction works because RR7 always passes absolute URLs into loaders/actions (even in tests where we constructed `new Request("http://localhost/api/todos")`).

**Tagged union exhaustiveness.** The `deriveOwnerId` helper uses a `switch` on `principal.kind` with both arms returning a `string`. TypeScript narrows the union inside each arm, so `principal.browserKey` (browser-key arm) and `principal.userId` (user arm) both type-check. **Discovery for trainees:** if a future change introduces a new `Principal` variant (e.g., `'service-account'`), TS will flag this `switch` as non-exhaustive at compile time — the seam can't silently regress.

**No `extractBrowserKey` helper exposed.** Per the story's LLM guardrail, the only public exports are `Principal`, `RequestContext`, and `buildRequestContext`. `deriveOwnerId` is a file-private helper. This keeps the seam tight: service code reaches for `ctx.ownerId` because there's literally no other accessor in the public surface.

**Empty-string handling unified with absence.** AC 5 said "absent or empty"; the implementation uses `?? ""` and then `if (!browserKey)` so both cases route through the same fallback path. This matches Story 1.3's SSR behavior (where `getBrowserKey()` returns `""` and `browserKeyFetch` propagates the empty header value).

**Gap I-1 script self-test.** The script exits 0 in the absent-`app/services/` case (current state) and would exit 1 on any matching grep result. Until Story 1.7 creates `app/services/`, the script effectively says "nothing to check." Once Story 1.7 lands, every commit touching that directory will be checked. Tested by mentally tracing a malicious commit; can be exercised in Story 1.7.

**No service code yet.** AC 7 ("service code consumes `ctx.ownerId`") is a *discipline* in this story — Story 1.7 will be the first place the rule applies. The grep script enforces it; this story's job was to make the rule expressible and the enforcement mechanism real.

### File List

**Created:**
- `todo-app/app/lib/logger.ts` (pino-shaped stub; ~17 lines)
- `todo-app/app/middleware/request-context.ts` (buildRequestContext + types; Gap I-1 fix; ~50 lines)
- `todo-app/app/middleware/request-context.test.ts` (6 unit tests; ~80 lines)
- `todo-app/scripts/check-gap-i1.sh` (Gap I-1 grep enforcement; bash; +x; ~20 lines)

**Modified:**
- `todo-app/package.json` — added `check:gap-i1` script (preserved all existing scripts and deps)

**Commit:** `25579d9 Story 1.5: request-context middleware with Gap I-1 semantic naming` (parent: `339bad7` from Story 1.4).

### Change Log

- **2026-04-30** — Story 1.5 implemented. The second piece of the four-component seam is in place. Gap I-1 fix applied at the implementation level (per architecture line 772's directive: "Should be done as part of the request-context middleware story"). Service code consuming `ctx.ownerId` discipline is enforced via the bash grep script — Story 2.7 will wire it to CI. Total test count now 21 across 4 files. Test infrastructure (Vitest) shown to be sufficient for both unit (jsdom + crypto + localStorage) and Node-env (postgres + Web-Platform Request) tests via the per-file `// @vitest-environment node` magic comment.
