Read this before writing code. Source of truth for all conventions in this repo.

This file is a thin pointer — the canonical specification for each rule lives in `_bmad-output/planning-artifacts/architecture.md` (Implementation Patterns section) or `_bmad-output/planning-artifacts/ux-design-specification.md` (visual + interaction). Each rule below links to its anchor.

## Naming

| Rule | Example | Source |
|---|---|---|
| **DB tables, columns, indexes:** lowercase snake_case | `todos`, `completion_status`, `idx_todos_owner_id_created_at` | [architecture.md § Naming Patterns](_bmad-output/planning-artifacts/architecture.md) |
| **TS variables, functions:** camelCase | `getBrowserKey`, `currentTodos` | architecture.md |
| **JSON keys (API):** camelCase (TS-natural) | `completionStatus`, `createdAt`, `ownerId` | architecture.md |
| **Custom HTTP headers:** PascalCase + `X-` prefix | `X-Browser-Key` | architecture.md |
| **File names — modules/utilities:** kebab-case | `browser-key.ts`, `optimistic-store.tsx` | architecture.md |
| **File names — RR7 routes:** per RR7 conventions | `home.tsx`, `api.todos.$id.ts` | architecture.md |
| **Type aliases for unions:** PascalCase | `MutationStatus = 'pending' \| 'confirmed'` | architecture.md |
| **Test files:** `*.test.{ts,tsx}` co-located next to source | `optimistic-store.test.tsx` | architecture.md |
| **Migration files:** `<NNNN>_<short_slug>.sql` | `0000_init.sql` | architecture.md |

## Wire Contracts

| Rule | Source |
|---|---|
| **Discriminated-union envelope** for every loader/action: `{ ok: true, data } \| { ok: false, error: { code, message, fieldErrors? } }`. Never raw `data` or raw `error`. | architecture.md § API & Communication |
| **Client-generated UUIDs** for new todos (preserves idempotency under retry). Server uses `INSERT ... ON CONFLICT (id) DO NOTHING`. | architecture.md § Idempotency Contract |
| **`X-Browser-Key` custom header** sent by `app/lib/browser-key.ts`'s `browserKeyFetch` wrapper on every client→server fetch. Same-origin cookie (`todo-app-browser-key`, `SameSite=Strict`) is the SSR-handoff fallback. | architecture.md + Story 2.9 refinement |
| **Service code consumes `ctx.ownerId`, NEVER `ctx.principal.browserKey`.** Gap I-1 semantic-naming fix. Statically enforced via `pnpm check:gap-i1`. | [architecture.md § Gap I-1](_bmad-output/planning-artifacts/architecture.md) |
| **Every action handler calls `checkOwnership(ctx, resourceOwnerId)` before any service-layer call.** Pattern-verification test 1.6-UNIT-001 enforces this. | architecture.md + Story 1.6 |

## Logging

| Rule | Source |
|---|---|
| Server-side logging via **pino** structured JSON to stdout. Never `console.log` in `app/` (ESLint `no-console` enforces; `console.warn`/`console.error` allowed for client-side observability). | [architecture.md § Logging](_bmad-output/planning-artifacts/architecture.md) |
| **Standard fields per request log:** `level`, `time`, `msg`, `requestId`, `browserKey` (truncated to first 8 chars), `route`, `method`, `durationMs`. | architecture.md |
| **No third-party log aggregation SDK** (Sentry, Datadog, Mixpanel, GA, etc.). Pipe stdout to whatever aggregator the deployment chooses. | architecture.md |
| **Browser-key truncation in logs** is privacy hygiene — establishes the discipline for when real user IDs replace browser keys later. | architecture.md |

## Styling

| Rule | Source |
|---|---|
| **Vanilla CSS Modules** + 26-token `app/styles/tokens.css`. No Tailwind, no styled-components, no CSS-in-JS. | architecture.md + ux-design-specification.md |
| **Token discipline:** every CSS rule consumes `var(--token-name)`. No raw hex, no magic numbers (architecture-locked breakpoints `640`, `1025`, and touch-target `44` are the only exceptions). | architecture.md (Epic 1 cross-cutting AC) |
| **Min-width media queries only.** No `max-width:` viewport queries. Mobile-first base + progressive enhancement at `641px` and `1025px`. Exception: `prefers-reduced-motion` and other feature queries (not viewport). | epics.md Story 1.16 AC + Story 2.7 |
| **No `outline: none` without a replacement focus indicator.** Keyboard-only users must see focus on every interactive element. | ux-design-specification.md § Accessibility |

## Test Discipline

| Rule | Source |
|---|---|
| Unit + integration tests **co-located** next to source. E2E specs in `e2e/`. | architecture.md |
| **`pnpm check:gap-i1`** statically enforces service-layer Gap I-1 discipline. CI fails the build on any match. | Story 1.5 + Story 2.7 |
| **Test 1.6-UNIT-001** scans `app/routes/**/*.{ts,tsx}` for `action` exports and asserts every one calls `checkOwnership(`. Trivially green pre-Story-1.10; enforces from there on. | Story 1.6 + TEA M-2 |
| **No `page.waitForTimeout`** in E2E specs. ESLint `no-restricted-syntax` rule fails the build on any match. Use `page.route()` for deterministic timing or `expect().to*` with auto-retry. | Story 2.7 + TEA M-3/M-4 |
| **Statistical perf assertions only** (N=20 samples, p95). Single-shot timing assertions are forbidden — they're flaky on CI runners with variable load. | Story 2.10 + TEA M-5 |
| **Coverage threshold ≥ 70%** on lines/branches/functions/statements. Current state: 90%+ across all metrics. CI gate fails on any drop. | Story 2.7 + Story 2.8 |
| **Integration tests against real Postgres** (not mocked). Tests skip cleanly if `DATABASE_URL` is unset; CI provides it via the `postgres` service container. | architecture.md + Story 1.4 |

## Other

- **`data-testid` discipline (UI mutation stories 1.10–1.17):** every interactive element has a stable `data-testid` per the TEA handoff document's table. Prevents fragile E2E selector drift on CSS changes.
- **Native HTML semantics over ARIA wherever possible.** `<button>`, `<input type="checkbox">`, `<main>`, `<aside>` — use native elements; reserve ARIA for the gaps (e.g., `aria-label` on icon-only controls, `role="status"` on live regions).
- **Color is never the only signal.** Completion = strike-through + `--color-fg-faded`; focus = inverted-block + accent ring; error = text + button affordance. A user with full deuteranopia/protanopia sees the same state distinctions.
- **`prefers-reduced-motion: reduce`** collapses all transitions + animations to 0ms via global.css's universal selector + Toast.module.css's keyframe override.
- **Never introduce a new convention without updating this file in the same PR.**

## Pattern Violations

When a violation happens:

1. Document in the PR description: what convention was violated, why, and whether the convention should change.
2. If the convention should change → update this file AND `architecture.md` in the same PR.
3. If the violation is a one-off → the PR is rejected. (Boring tech with discipline.)

CI gates (typecheck, lint, gap-i1 grep, vitest coverage, Playwright suite) catch most mechanical violations. Code review catches the rest.
