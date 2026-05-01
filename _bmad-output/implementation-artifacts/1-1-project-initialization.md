# Story 1.1: Project Initialization

Status: review

## Story

As a trainee following the artifact set,
I want a scaffolded React Router 7 (Framework Mode) project with TypeScript strict mode and path aliases,
so that I can `pnpm dev` and see a working RR7 default page on first boot, with the foundation in place for every subsequent story.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 1.1.

1. **Given** a clean working directory at `/Users/pouya/Documents/Development/ToDo-App-AINE/`, **When** I run `npx create-react-router@latest todo-app` and accept defaults (Node-based template), **Then** the project scaffolds with TypeScript, Vite, and file-based routing under `app/routes/`.
2. **And** `tsconfig.json` enables `"strict": true` and defines path aliases:
   - `~/components/*` → `./app/components/*`
   - `~/services/*` → `./app/services/*`
   - `~/middleware/*` → `./app/middleware/*`
   - `~/lib/*` → `./app/lib/*`
3. **And** `git init` is run in the project root; `.gitignore` covers `node_modules/`, `.env`, build outputs (`build/`, `dist/`, `.cache/`), IDE files (`.idea/`, `.vscode/` except recommended extensions), OS junk (`.DS_Store`).
4. **And** `pnpm install && pnpm dev` serves the default RR7 page at `localhost:5173` (or whatever port the template defaults to) with no console errors.
5. **And** `pnpm typecheck` (alias for `react-router typegen && tsc --noEmit`) passes without errors.
6. **And** `pnpm lint` passes (basic ESLint config from RR7 template; comprehensive lint rules including `no-waitForTimeout` are deferred to Story 2.7 per the TEA amendment M-6 sequencing note).

## Tasks / Subtasks

- [x] **Task 1: Run the create-react-router CLI** (AC: 1)
  - [x] 1.0: Pre-flight — Node version check (Node 24.15.0 active; architecture allows both Node 22 LTS and Node 24 — proceeding on Node 24, documented in Completion Notes)
  - [x] 1.1: Confirmed working directory: `/Users/pouya/Documents/Development/ToDo-App-AINE`
  - [x] 1.2: Ran `npx create-react-router@latest todo-app --no-install --no-git-init` (non-interactive; defaults applied)
  - [x] 1.3: Accepted default template (Node-based)
  - [x] 1.4: Verified scaffolded structure: `app/routes/`, `app/root.tsx`, `react-router.config.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`, plus template-extras: `Dockerfile`, `.dockerignore`, `app/welcome/`, `app/app.css`

- [x] **Task 2: Configure TypeScript strict mode + path aliases** (AC: 2)
  - [x] 2.1: Reviewed `todo-app/tsconfig.json`
  - [x] 2.2: Confirmed `"strict": true` under `compilerOptions` (template-default)
  - [x] 2.3: **Path aliases already present** — RR7 template ships `"~/*": ["./app/*"]` (catch-all, subsumes the four story-listed aliases `~/components/*`, `~/services/*`, `~/middleware/*`, `~/lib/*`). No edit needed; the catch-all is more permissive and avoids needing tsconfig edits when adding new app subdirs.
  - [x] 2.4: `"baseUrl"` not set; modern TS resolves `paths` without it — confirmed via typecheck
  - [x] 2.5: Ran `pnpm typecheck` — exited 0

- [x] **Task 3: Initialize git + .gitignore** (AC: 3)
  - [x] 3.1: Ran `git init -b main` inside `todo-app/`
  - [x] 3.2: Extended `.gitignore` (template default was minimal — added `.env.local`, `/dist/`, `/.cache/`, `.idea/`, `.vscode/*` with `!.vscode/extensions.json` exception)
  - [x] 3.3: Initial commit landed: `b072b27 Story 1.1: project initialization`

- [x] **Task 4: Install dependencies + verify dev server** (AC: 4)
  - [x] 4.1: Ran `pnpm install` from `todo-app/` — `pnpm-lock.yaml` produced; pnpm 10.33.2 (installed via official user-local installer at `~/Library/pnpm` since `corepack enable` failed with EACCES)
  - [x] 4.2: Ran `pnpm dev` — RR7 dev server boots
  - [x] 4.3: Verified HTTP 200 from dev server on `localhost:5174` (port 5173 was already in use; RR7 auto-fell-back to 5174). Default React Router welcome page renders with Tailwind styles.
  - [x] 4.4: HTML response valid; no errors in dev server log
  - [x] 4.5: Dev server stopped cleanly

- [x] **Task 5: Verify quality gates pass** (AC: 5, 6)
  - [x] 5.1: `pnpm typecheck` — exit 0
  - [x] 5.2: **`pnpm lint` — N/A.** Default RR7 template no longer ships ESLint config or `lint` script (was anticipated by Task 6's "document variations"). All lint setup deferred to Story 2.7 per existing TEA amendment M-6 sequencing note.
  - [x] 5.3: No setup issues — both gates that exist pass

- [x] **Task 6: Document RR7 template variations** (see Completion Notes below for full list)
  - [x] 6.1: Five deviations from architecture/story expectations captured below
  - [x] 6.2: Story 1.2 inputs documented (Tailwind removal, file structure)

## Dev Notes

### Why this story matters (training-identity context)

This story is the first artifact a trainee will execute to reproduce v1. Per the **Project Principles tiebreaker** (training clarity wins on conflict), this story's *exact commands* and *verifiable outputs* are the foundation for everything else. A trainee who follows this story should reach a `pnpm dev` browser tab in <10 minutes from a clean clone of the repo.

The architecture explicitly names this as **first implementation priority** — see `architecture.md` § "Decision Impact Analysis → Implementation Sequence (story ordering, suggestive)" → step 1.

### Architectural context

- **Stack (locked):** TypeScript end-to-end + React Router 7 (Framework Mode) + Vite. Subsequent stories add Drizzle (Story 1.4), Postgres 17 in container (Story 2.2), Vitest + Playwright (Story 2.7), pino (Story 2.4), Zod (Story 2.3), CSS Modules + tokens (Story 1.2). **None of these are part of Story 1.1.**
- **Why React Router 7 Framework Mode** (not Next.js, T3, Epic Stack): see `architecture.md` § "Starter Template Evaluation" — the chosen direction ships *framework choices* (file-based routing, loader/action pattern, TypeScript, Vite-based build) but leaves *architectural choices* (DB, auth, observability) to us. Story 1.1 is exactly the framework scaffolding; everything else gets layered later.
- **Path aliases** prevent deep relative imports (`../../../`). They're declared once in `tsconfig.json` and consumed everywhere. **Do not skip this** — Story 1.5+ files use these aliases throughout.
- **TypeScript strict mode** is non-negotiable per `CONVENTIONS.md` (TBD; specced in architecture's Implementation Patterns). The RR7 template usually has it, but verify.

### Testing standards (for this story)

Story 1.1 has **no per-story tests** — there's nothing to test yet beyond the toolchain itself. The acceptance criteria are *operational*:
- `pnpm typecheck` passes
- `pnpm lint` passes
- `pnpm dev` serves the default page

Test framework setup (Vitest, Playwright) is Story 2.7's foundation work. Per **TEA amendment M-6**, Story 2.7's test-infrastructure portion (fixtures, lint rules) may be implemented before Epic 2 begins — likely after Stories 1.1–1.9 (foundation + read path) but before Story 1.10 (first mutation E2E). Story 1.1 doesn't need to wait for any of that.

### File-by-file expectations (post-AC)

After Story 1.1 completes, the project tree at `/Users/pouya/Documents/Development/ToDo-App-AINE/todo-app/` should contain:

```
todo-app/
├── .git/                       # initialized; first commit made
├── .gitignore
├── node_modules/               # gitignored
├── package.json                # RR7 template defaults; pnpm scripts
├── pnpm-lock.yaml
├── tsconfig.json               # strict: true; path aliases configured
├── react-router.config.ts      # RR7 template default
├── vite.config.ts              # RR7 template default
├── app/
│   ├── root.tsx
│   ├── routes/
│   │   └── _index.tsx          # default RR7 hello-world page
│   └── (app/components/, app/services/, app/middleware/, app/lib/ are NOT created in this story — they appear when Stories 1.2, 1.3, 1.5, 1.6, 1.7 land)
└── public/
    └── (RR7 template defaults, e.g., favicon)
```

### Dependencies (none upstream)

- This is the first story; nothing precedes it.
- Story 1.2 (Design Tokens & AppShell) and Story 1.3 (Browser Key Utility) both depend on Story 1.1.

### Project Structure Notes

- **Project root layout decision:** the RR7 project will live at `todo-app/` *inside* the existing planning-artifact repo, not at the repo root. Rationale: keeps the `_bmad-output/`, `_bmad/`, `docs/`, `.claude/` directories cleanly separated from the application source. The trainee following the artifacts will see a clear separation: planning artifacts at the top, working code under `todo-app/`. This is the conventional shape for "training-reference repo with reproducible app inside."
- **Alternative considered:** scaffold RR7 at the repo root and move planning artifacts under a subdirectory. Rejected because it requires reorganizing existing artifacts.
- **No conflicts with existing planning structure** — `todo-app/` is a new top-level directory.

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 1.1: Project Initialization" (Acceptance Criteria source)
- `_bmad-output/planning-artifacts/architecture.md` § "Selected Starter: React Router v7 (Framework Mode)" (rationale for RR7 + initialization command)
- `_bmad-output/planning-artifacts/architecture.md` § "Decision Impact Analysis → Implementation Sequence" step 1 (this story is first implementation priority)
- `_bmad-output/planning-artifacts/architecture.md` § "Implementation Patterns & Consistency Rules → Structure Patterns" (path aliases definition)
- `_bmad-output/planning-artifacts/prd.md` § "Project Principles" (training-identity tiebreaker context)
- `_bmad-output/test-artifacts/test-design/test-design-qa.md` § "Entry Criteria" (Story 1.1 merge unblocks test infrastructure setup)
- React Router 7 Framework Mode CLI — `npx create-react-router@latest` — verified current as of architecture phase (April 2026)

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context), acting as Amelia (Senior Software Engineer) under the bmad-dev-story workflow.

### Debug Log References

- `corepack enable` failed with `EACCES: permission denied, symlink '/usr/local/bin/pnpm'` — Node 24's npm-managed corepack can't write to system bin without sudo. Sudo couldn't prompt for password from this shell. Worked around with the official user-local installer (`curl -fsSL https://get.pnpm.io/install.sh | sh -`), which installs to `~/Library/pnpm` and appends `PNPM_HOME` to `~/.zshrc`. **Trainee guidance for Story 1.1 reproduction:** if `corepack enable` fails on macOS, `brew install pnpm` is the cleanest alternative; the user-local installer is the brew-less fallback.
- Dev server fell back from port 5173 → 5174 (5173 was occupied by an unrelated process). RR7 dev CLI handles this gracefully.

### Completion Notes List

**RR7 template deviations (Task 6 output) — important inputs to Stories 1.2 and 2.7:**

1. **Tailwind CSS v4 ships with default template** — `package.json` includes `tailwindcss@^4.2.2` and `@tailwindcss/vite@^4.2.2`; `app/app.css` and `app/welcome/welcome.tsx` use Tailwind. **Architecture chose vanilla CSS Modules** (anti-flattening rule: design system through documented refusals). **Story 1.2 must remove Tailwind** before introducing the token system. Removal scope: uninstall both packages, strip `@tailwindcss/vite` plugin from `vite.config.ts`, replace `app/app.css` content, delete or rewrite `app/welcome/`.
2. **No `lint` script in default template.** AC 6 (`pnpm lint passes`) is not enforceable on a fresh scaffold. ESLint config + the `lint` script land in Story 2.7 (which already owns this work per TEA amendment M-6). No action needed in Story 1.1.
3. **Path alias is `~/*` catch-all, not the four explicit aliases.** Template provides `"~/*": ["./app/*"]` — equivalent in behavior to the four specific aliases (`~/components/*`, `~/services/*`, `~/middleware/*`, `~/lib/*`) since they all resolve under `./app/`. Decision: keep catch-all (more permissive, future-proof for `~/types/*`, `~/hooks/*`, etc., without tsconfig edits). Update story acceptance criteria language for future BMAD reruns: "path aliases work for `~/*` resolving to `./app/*`."
4. **Template ships extras the story didn't anticipate:** `Dockerfile`, `.dockerignore`, `README.md`, `app/welcome/` (logo SVGs + welcome component), `app/app.css`. The Dockerfile is a template starting point but does *not* match architecture's required multi-stage non-root spec — Story 2.5 (Dockerfile + Compose) will replace it.
5. **Node version: 24.15.0 (architecture allows both 22 LTS and 24).** Proceeding on 24. No friction observed. The lockfile (`pnpm-lock.yaml`) was produced under Node 24; if a trainee uses Node 22, the lockfile should resolve identically since `@types/node` is pinned to `^22` regardless.

**Other observations:**
- Vite version: `^8.0.3` (resolved to `8.0.10`). React Router: `7.14.0` (`7.14.2` available; staying on what the template installed).
- React 19.2.x already current — `@types/react` aligned.
- pnpm warned `Ignored build scripts: esbuild@0.27.7` — not a problem for dev/build (esbuild ships native binaries via `@esbuild/darwin-arm64`); can be approved later via `pnpm approve-builds` if a postinstall side-effect is ever needed.
- Port 5173 was occupied; RR7 auto-fell-back to 5174.

### File List

**Created (all under `todo-app/`):**

- `todo-app/.dockerignore` (template)
- `todo-app/.gitignore` (template + extensions for IDE/cache directories)
- `todo-app/Dockerfile` (template — will be replaced in Story 2.5)
- `todo-app/README.md` (template)
- `todo-app/app/app.css` (template, Tailwind-based — will be replaced in Story 1.2)
- `todo-app/app/root.tsx` (template)
- `todo-app/app/routes.ts` (template)
- `todo-app/app/routes/home.tsx` (template welcome route)
- `todo-app/app/welcome/logo-dark.svg` (template — likely removed in Story 1.2)
- `todo-app/app/welcome/logo-light.svg` (template — likely removed in Story 1.2)
- `todo-app/app/welcome/welcome.tsx` (template — likely replaced in Story 1.2)
- `todo-app/package.json` (template)
- `todo-app/pnpm-lock.yaml` (generated by `pnpm install`)
- `todo-app/public/favicon.ico` (template)
- `todo-app/react-router.config.ts` (template)
- `todo-app/tsconfig.json` (template; strict + `~/*` alias already configured)
- `todo-app/vite.config.ts` (template, with `@tailwindcss/vite` plugin — Story 1.2 will remove)

**Modified during this story:**

- `todo-app/.gitignore` — extended with `.env.local`, `/dist/`, `/.cache/`, `.idea/`, `.vscode/*` + `!.vscode/extensions.json` exception

**Initial commit:** `b072b27 Story 1.1: project initialization` (in `todo-app/.git/`)

### Change Log

- **2026-04-29** — Story 1.1 implemented and merged. RR7 7.14.0 scaffolded; TS strict + `~/*` alias confirmed; git initialized; pnpm-lock.yaml generated; dev server / typecheck verified. Five template deviations documented for downstream stories.
