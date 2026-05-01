# Story 1.2: Design Tokens & AppShell Foundation

Status: review

## Story

As a developer building UI,
I want the canonical AA-verified design-token set + `AppShell` layout in place,
so that every subsequent component consumes tokens via `var(--token-name)` and renders inside the centered, max-width-640px column with the vintage System 7 visual language already established.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 1.2.

1. **Given** the project initialized in Story 1.1, **When** I implement `app/styles/tokens.css`, `app/styles/reset.css`, `app/styles/global.css`, **Then** `tokens.css` contains the canonical token set per UX spec Visual Foundation: 8 color, 5 spacing, 6 typography, 3 motion, ~3 border tokens (the UX spec defines 4 border-related tokens including both `--shadow-toast` and `--shadow-pressed`; include all 4).
2. **And** the body font stack is `"Charter", "Iowan Old Style", "Palatino", Georgia, serif` and is applied to `body` via `global.css`.
3. **And** every color token combination meant for state-bearing pairings has been AA-verified — text contrast ≥ 4.5:1, UI/non-text contrast ≥ 3:1. The hex values listed in the UX spec § "Color Palette" (lines 513–520) are the audited final values; *use those exact values* (not the illustrative values from the spec's earlier example block at lines 328–335 which are superseded).
4. **And** `app/root.tsx` mounts the `AppShell` with `max-width: 640px` centered column, `--space-xl` outer padding on desktop (≥ 1025 px), `--space-lg` on tablet (641–1024 px), `--space-md` on mobile (≤ 640 px).
5. **And** the rendered page (default route) shows the ivory `--color-bg` (`#FAFAF7`) background and serif body font in the browser at `localhost:5174` (or whatever port RR7 picks).

## Tasks / Subtasks

- [x] **Task 1: Remove Tailwind from the project** (carry-over from Story 1.1 Completion Notes deviation #1)
  - [ ] 1.1: Uninstall both Tailwind packages: `pnpm remove tailwindcss @tailwindcss/vite`
  - [ ] 1.2: Edit `todo-app/vite.config.ts` — drop the `tailwindcss` import and remove `tailwindcss()` from the `plugins` array. Result should be just `plugins: [reactRouter()]` (plus tsconfigPaths resolve config). Also drop the `import tailwindcss from "@tailwindcss/vite";` line.
  - [ ] 1.3: Delete `todo-app/app/welcome/` entirely (`logo-dark.svg`, `logo-light.svg`, `welcome.tsx`) — this is template scaffold from RR7 that uses Tailwind classes
  - [ ] 1.4: After all removal, run `pnpm typecheck` and confirm exit 0 (any orphaned imports of `@tailwindcss/vite` or `~/welcome/welcome` will surface here)

- [x] **Task 2: Create `app/styles/tokens.css`** (AC 1, 3)
  - [ ] 2.1: Create directory `todo-app/app/styles/`
  - [ ] 2.2: Write `app/styles/tokens.css` with all tokens declared on `:root`, grouped with section comments (Colors / Spacing / Typography / Motion / Border). Use the values in the **Token Reference** table below — these are the AA-verified final values.
  - [ ] 2.3: Add a single trailing comment block in tokens.css listing the audited contrast pairs and their measured ratios, so a trainee opening this file can verify AA without rerunning a contrast checker (see "AA contrast verification block" content below).
  - [ ] 2.4: Tokens.css must contain ZERO selectors other than `:root` — it is the source-of-truth declarations file, no rules.

- [x] **Task 3: Create `app/styles/reset.css`** (AC 1)
  - [ ] 3.1: Write a minimal modern reset (NOT Eric Meyer's heavy 2008 reset — too aggressive for modern apps). Cover: `*, *::before, *::after { box-sizing: border-box; }`, zero out default `margin`/`padding` on `html, body, h1-h6, p, ul, ol, figure`, `body { min-height: 100vh; line-height: 1.5; }`, `img, picture { max-width: 100%; display: block; }`, `input, button, textarea, select { font: inherit; color: inherit; }`, `:focus-visible { outline: none; }` (we replace native focus with token-driven focus rings later — this just disables the inconsistent UA default).
  - [ ] 3.2: Reset.css must NOT consume any tokens (it loads before global.css and tokens.css are merged; tokens *are* on `:root` but reset is pre-state so it stays token-free). This is intentional — tokens.css owns the visual identity, reset.css owns browser-normalization.

- [x] **Task 4: Create `app/styles/global.css`** (AC 2, 5)
  - [ ] 4.1: Write `body` rules consuming tokens: `background: var(--color-bg)`, `color: var(--color-fg)`, `font-family: var(--font-body)`, `font-size: var(--font-size-base)`, `line-height: 1.5`, `font-weight: 400`, `-webkit-font-smoothing: antialiased`, `text-rendering: optimizeLegibility`.
  - [ ] 4.2: Add `@media (prefers-reduced-motion: reduce)` block that sets `* { animation-duration: 0ms !important; transition-duration: 0ms !important; }` — establishes the reduced-motion floor for the whole app per UX spec § Motion Foundation.
  - [ ] 4.3: Do NOT add component-specific styles here. Global.css is for body/html-level identity only.

- [x] **Task 5: Create the `AppShell` component** (AC 4)
  - [ ] 5.1: Create `todo-app/app/components/AppShell.tsx`. Signature: `export function AppShell({ children }: { children: React.ReactNode }): React.JSX.Element`. Renders a single `<div className={styles.shell}>{children}</div>` (or `<main>` semantically — see 5.4).
  - [ ] 5.2: Create `todo-app/app/components/AppShell.module.css` co-located with the component. The `.shell` rule uses tokens: `max-width: 640px`, `margin: 0 auto`, `padding: var(--space-md)` (mobile-first base, applies ≤ 640 px), then `@media (min-width: 641px) { .shell { padding: var(--space-lg); } }`, then `@media (min-width: 1025px) { .shell { padding: var(--space-xl); } }`.
  - [ ] 5.3: Verify the CSS Module generates a scoped class — `pnpm typecheck` should resolve `styles.shell` against the auto-generated `.d.ts` shim that Vite produces for `*.module.css` (ships out of the box; no extra plugin).
  - [ ] 5.4: Use `<main>` as the container element rather than `<div>` — this is the page's primary landmark and a `<main>` element gives screen-reader users a "skip to main content" target without ARIA. Add `id="main"` for future skip-link wiring (Story 1.17 will own the skip link itself, but the anchor should exist now so we don't need to revisit AppShell).

- [x] **Task 6: Wire AppShell into `app/root.tsx` and replace template content** (AC 4, 5)
  - [ ] 6.1: Replace the `import "./app.css";` line with three explicit imports in this order: `import "./styles/reset.css"; import "./styles/tokens.css"; import "./styles/global.css";`. Order matters — reset zeroes browser defaults, tokens defines the design vocabulary, global applies the body identity using tokens.
  - [ ] 6.2: Delete `todo-app/app/app.css` (replaced by the three new files).
  - [ ] 6.3: Remove the `links` function's Google Fonts entries (we ship system serif fonts; no webfont download needed per UX spec § Typography). Keep an empty `export const links: Route.LinksFunction = () => [];` so RR7's typegen doesn't break, OR delete the export entirely (the latter is cleaner).
  - [ ] 6.4: In the `Layout` function, wrap `{children}` with `<AppShell>{children}</AppShell>`. Import `AppShell` from `~/components/AppShell`.
  - [ ] 6.5: In the `ErrorBoundary` function, replace the Tailwind classes (`pt-16 p-4 container mx-auto`, `w-full p-4 overflow-x-auto`) with no-class JSX (`<main><h1>...</h1>...</main>`) — error boundaries are out of scope for full styling in this story; just keep them functional and free of Tailwind. Story 1.8 will give error UI proper styling via the `ErrorState` component.

- [x] **Task 7: Replace the home route's content with a placeholder** (AC 5)
  - [ ] 7.1: Edit `todo-app/app/routes/home.tsx`. Drop the `import { Welcome } from "../welcome/welcome";` line and the `<Welcome />` JSX.
  - [ ] 7.2: Update `meta` to return a single title relevant to v1: `[{ title: "Todo" }, { name: "description", content: "A quiet list." }]`. (Reasoning: vintage-mac calm-by-default — the meta tag is itself part of the visual identity and shouldn't say "New React Router App".)
  - [ ] 7.3: Render a simple placeholder inside the AppShell-rendered context: `<div>Hello, list.</div>` or similar. This will be replaced wholesale in Story 1.8 (Read List End-to-End) when the loader, list components, and three states arrive. The placeholder's only purpose in Story 1.2 is to *prove* AppShell renders correctly (centered column + ivory bg + serif font visible).
  - [ ] 7.4: Sanity-check by running `pnpm dev` and viewing in browser: page should show ivory `#FAFAF7` background, dark-near-black `#1A1A1A` text in a serif (Charter on macOS, Iowan/Palatino fallback elsewhere), centered column constrained to 640 px max with breathing room on the sides.

- [x] **Task 8: Verify ACs and quality gates**
  - [ ] 8.1: Run `pnpm typecheck` — must exit 0. (No `lint` script yet — Story 2.7 owns ESLint setup per Story 1.1's deviation #2.)
  - [ ] 8.2: Run `pnpm dev` — visit `localhost:5174` (or whatever port RR7 picks). Verify visually: ivory background, serif font, centered max-640 column, content has visible breathing room on sides.
  - [ ] 8.3: Open DevTools → Elements → confirm computed `body` styles include `background-color: rgb(250, 250, 247)` (`#FAFAF7`) and `font-family` resolves to a Charter/Iowan/Palatino chain.
  - [ ] 8.4: Open DevTools → resize the browser through three widths (e.g., 375 px, 800 px, 1400 px) and confirm padding shifts (`--space-md` → `--space-lg` → `--space-xl`).
  - [ ] 8.5: Stop dev server.
  - [ ] 8.6: Make a single commit: `git add . && git commit -m "Story 1.2: design tokens + AppShell foundation"`

## Dev Notes

### Why this story matters (training-identity context)

Story 1.2 is the visual identity's foundation moment. **Per the lead differentiator — *minimalism through documented refusals* — the choice of vanilla CSS Modules + a hand-rolled token system over Tailwind/MUI/Chakra is itself a documented refusal**, and tokens.css is the artifact that operationalizes the refusal. A trainee reading this story should understand: every magic number we'd normally write becomes a named token; every component CSS file consumes tokens; the visual identity is mechanically enforceable.

The vintage-Mac System 7 visual language is not pixel art — it's **vintage-flavored modern type**: monochrome plus one accent (Mac highlight blue at AA-tuned `#0050D0`), square corners, hard-offset shadows, no decorative motion. The serif body stack (Charter / Iowan / Palatino) is the *quiet* refusal of contemporary sans-serif productivity-app sameness.

### Carry-over from Story 1.1: Tailwind removal (deviation #1)

Story 1.1's RR7 default template shipped Tailwind v4. Story 1.1 explicitly flagged this in Completion Notes as work for Story 1.2:

> **Story 1.2 must remove Tailwind** before introducing the token system. Removal scope: uninstall both packages, strip `@tailwindcss/vite` plugin from `vite.config.ts`, replace `app/app.css` content, delete or rewrite `app/welcome/`.

Task 1 in this story owns that removal in full. **Do not skip Task 1** — Tailwind classes leaking into Story 1.3+ would violate Epic 1's cross-cutting AC ("Token discipline: every CSS rule consumes `var(--token-name)`; no raw hex values, no magic numbers in component CSS").

### Architectural context

- **Styling stack (locked):** vanilla CSS with CSS Modules (`*.module.css`) + a global tokens file. Architecture line 203: *"Rejected: Tailwind (large vocabulary trainee must learn, defers concerns), styled-components/emotion (runtime cost, lock-in)."*
- **Architecture says AppShell *is* root.tsx** (line 885: `AppShell | app/root.tsx | Root frame; mounts ToastProvider + OptimisticStoreProvider; provides live-region portal`). **Decision for this story:** physically separate AppShell into `app/components/AppShell.tsx`, but have `root.tsx`'s `Layout` mount it. This preserves the architectural intent (AppShell is the visual frame at the root) while making AppShell a discrete, testable, providers-composable unit. When Stories 1.9 and 1.13 add `OptimisticStoreProvider` and `ToastProvider`, they compose *inside* AppShell, not directly inside `Layout`.
- **Path alias is `~/*` → `./app/*`** (catch-all from RR7 template; subsumes the four story-listed aliases per Story 1.1 deviation #3). Use `~/components/AppShell` for the import.
- **`app/styles/` is a NEW directory** — `app/components/`, `app/services/`, `app/middleware/`, `app/lib/` are all expected to appear later (per Story 1.1's file expectations). `app/components/` becomes a directory in this story for `AppShell.tsx` + `AppShell.module.css`.

### Token Reference (canonical, AA-verified)

These are the values to write into `tokens.css`. Source: UX spec § "Color Palette" lines 513–520 (the audited table; supersedes the illustrative example earlier in the spec).

```css
:root {
  /* === Colors (8) === */
  --color-bg: #FAFAF7;            /* ivory off-white, warmer than pure white */
  --color-fg: #1A1A1A;            /* near-black; primary text + hard borders */
  --color-fg-muted: #555555;      /* secondary text + placeholder */
  --color-fg-faded: #6E6E6E;      /* completed-todo text (with strike-through) */
  --color-border: #1A1A1A;        /* hard 1-px borders, System 7 chrome */
  --color-border-soft: #C8C8C8;   /* decorative dividers between list items */
  --color-accent: #0050D0;        /* Mac highlight blue, AA-tuned */
  --color-accent-fg: #FAFAF7;     /* text on accent backgrounds (inverted block) */

  /* === Spacing (5) — 8-px base grid === */
  --space-xs: 4px;
  --space-sm: 8px;
  --space-md: 16px;
  --space-lg: 24px;
  --space-xl: 40px;

  /* === Typography (6) — Mac-heritage serif body stack === */
  --font-body: "Charter", "Iowan Old Style", "Palatino", Georgia, serif;
  --font-mono: "Berkeley Mono", "IBM Plex Mono", ui-monospace, monospace;
  --font-size-sm: 13px;
  --font-size-base: 15px;
  --font-size-lg: 18px;
  --font-size-xl: 24px;

  /* === Motion (3) === */
  --motion-duration-quick: 120ms;
  --motion-duration-default: 200ms;
  --motion-easing: cubic-bezier(0.4, 0.0, 0.2, 1);

  /* === Border / Surface (4 — UX spec defines 4; AC says ~3, count is approximate) === */
  --border-width: 1px;
  --border-radius: 0;             /* square corners, System 7 */
  --shadow-toast: 2px 2px 0 var(--color-border);
  --shadow-pressed: inset 1px 1px 0 var(--color-border);
}
```

### AA contrast verification block (paste at end of tokens.css)

```css
/*
 * AA Contrast Audit (WCAG 2.1) — verified 2026-04-29
 * All ratios computed against --color-bg (#FAFAF7) unless otherwise noted.
 *
 *   --color-fg          (#1A1A1A) on bg            → 17.0 : 1   AAA  ✓ (text)
 *   --color-fg-muted    (#555555) on bg            →  7.5 : 1   AAA  ✓ (text)
 *   --color-fg-faded    (#6E6E6E) on bg            →  4.6 : 1   AA   ✓ (text, paired with strike-through)
 *   --color-border      (#1A1A1A) on bg            → 17.0 : 1   —    ✓ (UI/non-text floor 3:1)
 *   --color-border-soft (#C8C8C8) on bg            →  1.6 : 1   —    DECORATIVE ONLY (never state-bearing)
 *   --color-accent      (#0050D0) on bg            →  6.9 : 1   AAA  ✓ (UI/non-text floor 3:1; also clears 4.5:1 for text on bg)
 *   --color-accent-fg   (#FAFAF7) on accent        →  6.9 : 1   AAA  ✓ (inverted-block text)
 *
 * --color-border-soft is intentionally low-contrast: it conveys
 * decorative separation only, never a state. Per UX spec § "Color is
 * never the only signal", state changes always use a non-color cue
 * (strike-through, inverted block, etc.).
 */
```

### File-by-file expectations (post-AC)

After Story 1.2 completes, the project tree at `todo-app/app/` should look like:

```
todo-app/
├── app/
│   ├── components/
│   │   ├── AppShell.tsx           # NEW
│   │   └── AppShell.module.css    # NEW
│   ├── styles/
│   │   ├── tokens.css             # NEW — :root token declarations only, no rules
│   │   ├── reset.css              # NEW — minimal modern reset, no tokens consumed
│   │   └── global.css             # NEW — body identity, prefers-reduced-motion floor
│   ├── routes/
│   │   └── home.tsx               # MODIFIED — Welcome import removed; placeholder content
│   ├── root.tsx                   # MODIFIED — three style imports + AppShell wrap; Tailwind classes purged from ErrorBoundary
│   ├── routes.ts                  # unchanged (template default)
│   └── (app.css DELETED; welcome/ DIR DELETED)
├── package.json                   # MODIFIED — tailwindcss + @tailwindcss/vite removed
├── pnpm-lock.yaml                 # auto-updated by pnpm remove
├── vite.config.ts                 # MODIFIED — tailwindcss plugin removed
└── (other files unchanged)
```

### Files being modified — current state and what must be preserved

**`todo-app/app/root.tsx`** (currently 76 lines):
- Currently imports `./app.css` (Tailwind base) and Google Fonts via `links` for the Inter family.
- Currently `Layout` wraps `{children}` with the standard `<html>` chrome.
- Currently `ErrorBoundary` uses Tailwind classes `pt-16 p-4 container mx-auto` and `w-full p-4 overflow-x-auto`.
- **Preserve:** the `Layout` / `Outlet` / `Scripts` / `ScrollRestoration` structure and the `ErrorBoundary` export (RR7 framework expects these). The `isRouteErrorResponse` import and dev-mode error stack rendering should also stay — they're framework conventions, not Tailwind-specific.
- **Replace:** the single `./app.css` import with three style imports; wrap `{children}` with `<AppShell>`; strip Tailwind classes; delete the Google Fonts `links` entries.

**`todo-app/app/routes/home.tsx`** (currently 13 lines):
- Currently imports `Welcome` from `../welcome/welcome` and renders it.
- **Preserve:** the `meta` export shape and the default-export function structure (RR7 expects these for a route module).
- **Replace:** the `Welcome` import + JSX with a token-styled placeholder; update `meta` text.

**`todo-app/vite.config.ts`** (currently 11 lines):
- Currently imports `tailwindcss` from `@tailwindcss/vite` and uses it as a plugin.
- **Preserve:** `reactRouter()` plugin, `resolve.tsconfigPaths: true`, the overall `defineConfig` structure.
- **Replace:** drop the `tailwindcss` import line and remove `tailwindcss()` from the plugins array.

**`todo-app/app/app.css`** (currently 16 lines, all Tailwind):
- `@import "tailwindcss"`, `@theme { --font-sans: ... Inter ... }`, `@apply bg-white dark:bg-gray-950`, dark-mode media query.
- **Action:** delete the file. Do NOT migrate any of its content; the new `tokens.css` + `reset.css` + `global.css` are a wholesale replacement that doesn't preserve the Inter font, dark-mode default, or `@apply` pattern.

**`todo-app/package.json`** dependencies block (currently includes):
- `"tailwindcss": "^4.2.2"` and `"@tailwindcss/vite": "^4.2.2"` in `devDependencies`.
- **Action:** `pnpm remove tailwindcss @tailwindcss/vite` will both edit `package.json` and update `pnpm-lock.yaml`. Verify both files reflect the removal.

### Testing standards (for this story)

Story 1.2 has **no automated tests yet** — Vitest setup is Story 2.7's foundation work. Verification is operational:
- `pnpm typecheck` exits 0
- `pnpm dev` renders the placeholder page with ivory background + serif font in the browser (manual visual check)
- DevTools → Elements confirms computed body styles match token values
- Resizing the viewport across the three breakpoints visibly shifts AppShell padding

When Story 2.7 lands, AppShell will get a unit test (renders children inside a `<main>` with the expected class) and the `tokens.css` file will be lint-checked for syntactic validity. Both are deferred — don't write them now.

### Cross-cutting AC compliance check

- ✓ Token discipline: tokens.css defines tokens; reset.css consumes none (intentional); global.css consumes only token vars; AppShell.module.css consumes only token vars. **Zero raw hex values or magic numbers in any non-tokens file.**
- ✓ Import discipline: AppShell.tsx imports `./AppShell.module.css` (sibling, fine) and React types only. `app/components/*` doesn't import from `app/services/*` / `app/middleware/*` / `db/*` (none of those exist yet anyway).
- ✓ Color is never the only signal: Story 1.2 has no state-bearing UI; the AA contrast block at the bottom of tokens.css documents the strategy for downstream stories.
- ✓ Visible focus indicator: not yet (no interactive elements in this story); reset.css's `:focus-visible { outline: none; }` *only* disables the inconsistent UA default — Stories 1.10+ install per-component focus rings using `--color-accent`.
- N/A data-testid discipline: only applies to UI mutation stories 1.10–1.17.

### Previous story intelligence (Story 1.1)

Story 1.1 ended with status `review` and these deviations to carry forward:

1. **Tailwind removal** (this story owns it — Task 1).
2. **No `lint` script** in template — Story 2.7 owns ESLint config; Story 1.2 ACs require only `pnpm typecheck` to pass.
3. **`~/*` catch-all alias** — use `~/components/AppShell` import path.
4. **Template extras** (`Dockerfile`, `Welcome` component, `app.css`) — this story removes the welcome dir and `app.css`; Story 2.5 will replace the Dockerfile.
5. **Node 24.15.0** — no friction expected in this story.
6. **pnpm at `~/Library/pnpm` user-local** (corepack EACCES workaround). The `pnpm remove` and `pnpm install` commands should work the same as `pnpm` was used in Story 1.1.

Initial commit hash from Story 1.1: `b072b27 Story 1.1: project initialization`.

### Project Structure Notes

- This story creates `app/styles/` (new) and `app/components/` (new). Both are top-level under `app/` and align with architecture's directory plan (architecture.md line 547-549, 302-304).
- AppShell.module.css is co-located with AppShell.tsx (per architecture's CSS Modules pattern: "*.module.css per component"). This is the convention for every component going forward — co-locate the component, its CSS Module, and (when Vitest lands) its test file in the same directory.
- The decision to make `<AppShell>` a `<main>` element rather than a `<div>` is intentional accessibility groundwork — Story 1.17 (Accessibility Pass) will rely on the `<main>` landmark already existing.

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 1.2: Design Tokens & AppShell Foundation" (AC source)
- `_bmad-output/planning-artifacts/epics.md` § "Epic 1: Use Your List" cross-cutting AC (token discipline, import discipline, color-not-only-signal)
- `_bmad-output/planning-artifacts/architecture.md` § "Styling: vanilla CSS with CSS Modules" line 203 (rejected Tailwind/styled-components rationale)
- `_bmad-output/planning-artifacts/architecture.md` § "Project Structure" lines 297–308 (directory plan: `app/styles/`, `app/components/`)
- `_bmad-output/planning-artifacts/architecture.md` § "Component & Service Inventory" line 885 (AppShell mounts in root.tsx; will host providers in later stories)
- `_bmad-output/planning-artifacts/ux-design-specification.md` § "Visual Foundation → Color Palette" lines 513–520 (canonical AA-verified hex values)
- `_bmad-output/planning-artifacts/ux-design-specification.md` § "Visual Foundation → Typography" lines 540–570 (Charter/Iowan/Palatino stack rationale)
- `_bmad-output/planning-artifacts/ux-design-specification.md` § "Visual Foundation → Spacing & Layout" lines 572–599 (8-px grid, max-width 640, breakpoint padding)
- `_bmad-output/planning-artifacts/ux-design-specification.md` § "Visual Foundation → Motion" lines 601–619 (`prefers-reduced-motion` floor)
- `_bmad-output/planning-artifacts/ux-design-specification.md` § "Visual Foundation → Border / Surface" lines 621–629 (square corners, hard shadows)
- `_bmad-output/implementation-artifacts/1-1-project-initialization.md` § "Completion Notes List" deviations 1–5 (Tailwind, lint, alias, extras, Node 24)
- Story 1.1 initial commit: `b072b27`

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context), acting as Amelia (Senior Software Engineer) under the bmad-dev-story workflow.

### Debug Log References

- `pnpm remove tailwindcss @tailwindcss/vite` initially failed with `ERR_PNPM_NO_IMPORTER_MANIFEST_FOUND` because the shell cwd had reset to the repo root between background-task transitions. Re-running with explicit `cd todo-app && pnpm remove …` succeeded. **Trainee guidance:** when running pnpm commands, always confirm `pwd` is `todo-app/` before invoking — the package.json lives there, not at the BMAD-artifact repo root.
- Running `pnpm dev` after the swap auto-fell-back to port 5174 (5173 occupied, same as Story 1.1) — RR7 handles this gracefully.
- `curl http://localhost:5174/` confirmed the rendered HTML contains: `--color-bg`, `#FAFAF7`, `font-body`, `Charter` (in the inlined stylesheet) and `Hello, list.` (placeholder content), with **zero Tailwind references**.

### Completion Notes List

**Token-count pedantry note (AC 1).** The story AC says "8 color, 5 spacing, 6 typography, 3 motion, ~3 border" totaling ~25. Final implementation has **8 + 5 + 6 + 3 + 4 = 26 tokens**. The fourth border-related token (`--shadow-pressed`) was defined in the UX spec § Border / Surface (line 629) and is needed for vintage-bevel pressed-button states in Stories 1.10–1.12 — including it now avoids a token-add later. The AC's "~3" was approximate from the epics doc; UX spec is canonical for the actual count.

**Token-value note (AC 3).** UX spec contains two `--color-fg-faded` values: `#888888` in the illustrative example block (line 331) and `#6E6E6E` in the audited Color Palette table (line 516). Used `#6E6E6E` per the spec's own footer ("Final hex values pending verification … `tokens.css` will hold the audited final set"). The audited 4.6 : 1 ratio is preserved.

**AppShell semantic decision.** AppShell.tsx uses `<main id="main">` rather than `<div>` — provides the page's primary landmark for screen readers without ARIA, and the `id="main"` anchor is in place for Story 1.17's skip-link wiring without needing to revisit AppShell. Per the lead differentiator: native HTML semantics over ARIA wherever possible.

**Reduced-motion floor placement.** `@media (prefers-reduced-motion: reduce)` lives in `global.css`, not `tokens.css` (which has no rules) or `reset.css` (which is intentionally token-free). Setting `animation-duration` and `transition-duration` to `0ms !important` on `*, *::before, *::after` establishes the floor for the whole app — individual components don't need to repeat the media query.

**ErrorBoundary cleanup.** Replaced Tailwind classes (`pt-16 p-4 container mx-auto`, `w-full p-4 overflow-x-auto`) with bare-element JSX wrapped in a fragment. Story 1.8 will replace this entirely with the `ErrorState` component; for now it stays functional and Tailwind-free.

**Google Fonts removal.** Dropped the entire `links` export from `root.tsx` — UX spec is explicit that the Charter/Iowan/Palatino stack ships with the OS (no webfont download needed). One fewer network request, plus no privacy concern about pinging Google Fonts.

**Browser font resolution caveat.** Charter is bundled with macOS/iOS and renders directly. On Windows or Linux without these fonts installed, the stack falls through to Iowan Old Style (Mac-only), then Palatino (macOS + many Windows installs), then Georgia (everywhere), then `serif` (UA fallback). The visual identity remains "vintage serif" across all platforms but the exact rendered face will vary — this is intentional per UX spec's cross-platform-safety rationale.

**No automated tests added.** Story 2.7 owns Vitest setup; Story 1.2 verification was operational (typecheck + browser visual inspection).

### File List

**Created:**
- `todo-app/app/styles/tokens.css` (NEW — 26 tokens + AA contrast audit comment block)
- `todo-app/app/styles/reset.css` (NEW — minimal modern reset, no tokens consumed)
- `todo-app/app/styles/global.css` (NEW — body identity + reduced-motion floor)
- `todo-app/app/components/AppShell.tsx` (NEW — `<main id="main">` wrapper)
- `todo-app/app/components/AppShell.module.css` (NEW — max-width 640 + breakpoint padding)

**Modified:**
- `todo-app/app/root.tsx` — replaced `app.css` import with three style imports; wrapped `{children}` with `<AppShell>`; removed Google Fonts `links` export; purged Tailwind classes from `ErrorBoundary`
- `todo-app/app/routes/home.tsx` — removed `Welcome` import + JSX; updated `meta` to `Todo` / "A quiet list."; replaced with placeholder `<div>Hello, list.</div>`
- `todo-app/vite.config.ts` — removed `tailwindcss` import + plugin call
- `todo-app/package.json` — `tailwindcss` and `@tailwindcss/vite` removed from `devDependencies` (via `pnpm remove`)
- `todo-app/pnpm-lock.yaml` — auto-regenerated by `pnpm remove`

**Deleted:**
- `todo-app/app/app.css` (Tailwind base — replaced by reset/tokens/global)
- `todo-app/app/welcome/welcome.tsx` (template scaffold using Tailwind)
- `todo-app/app/welcome/logo-dark.svg`
- `todo-app/app/welcome/logo-light.svg`
- `todo-app/app/welcome/` (directory now empty, removed)

**Commit:** `ad4873d Story 1.2: design tokens + AppShell foundation` (parent: `b072b27` from Story 1.1)

### Change Log

- **2026-04-29** — Story 1.2 implemented. Tailwind removal completed (Story 1.1 deviation #1 closed). Token system and AppShell layout in place; downstream Stories 1.3+ can consume `var(--token-name)` and render inside AppShell. 26 tokens vs spec's "~25" — captured in Completion Notes.
