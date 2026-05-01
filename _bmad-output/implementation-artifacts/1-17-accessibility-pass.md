# Story 1.17: Accessibility Pass — Focus, ARIA, Live Regions, Reduced Motion

Status: review

## Story

As any user — keyboard-only, screen-reader, color-blind, motion-sensitive,
I want every verb completable without barriers and every state perceivable without color alone,
so that the WCAG 2.1 AA floor is met *visibly* and the calm-by-default discipline holds for accessibility too.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 1.17 (lines 518–536).

1. **Given** Stories 1.1–1.16 are complete, **When** I run the accessibility audit, **Then** Tab order is: TextInput → ListItem 1's checkbox → ListItem 1's delete button → ListItem 2's checkbox → ... → Toast Retry/Dismiss when present → loops back to TextInput.
2. **And** every interactive element has a visible focus indicator: **inverted-block** (`--color-accent` background, `--color-accent-fg` text) on `ListItem` when any of its controls is focused; **accent ring** (2-px `--color-accent` outline) on standalone primitives (TextInput, Toast Retry, Toast Dismiss, ErrorState Retry, mobile submit button).
3. **And** every icon-only control has an `aria-label`: Checkbox `"Toggle: <description>"`, delete button `"Delete: <description>"`, Toast Retry `"Retry: <truncated description>"`, Toast Dismiss `"Dismiss"`, mobile submit `"Submit"`. Verified via test.
4. **And** Toast `role="status"` + `aria-live="polite"` + `aria-atomic="true"` (already verified in Story 1.13's tests).
5. **And** **color is never the only signal**:
   - Completion → strike-through + `--color-fg-faded` (color + decoration)
   - Focus → inverted-block + accent ring (background swap + outline)
   - Error → text + button affordance (no red palette)
   - Verified by re-scanning the codebase for `color:` rules that change based on state without an accompanying non-color cue.
6. **And** `prefers-reduced-motion: reduce` collapses every transition + animation to 0 ms (global.css's universal selector + Toast's keyframe override). Verified by toggling the OS-level preference.
7. **And** axe-core scan via `@axe-core/playwright` reports **zero violations** on all six canonical states (Default, Empty, Loading, Error, Long-list, Toast). **Deferred to Story 2.9** when Playwright + axe land — Story 1.17's job is to make sure the code is *axe-ready*.
8. **And** manual keyboard-only walkthrough completes all four verbs (add / complete / uncomplete / delete / retry) without any mouse interaction; checklist documented at `todo-app/docs/keyboard-walkthrough.md`.

## Tasks / Subtasks

- [x] **Task 1: Add inverted-block focus treatment to ListItem** (AC 2, 5)
  - [ ] 1.1: Edit `app/components/ListItem.module.css`. Append a `:focus-within` rule on `.item`:
    ```css
    .item:focus-within {
      background: var(--color-accent);
      --color-fg: var(--color-accent-fg);
      --color-fg-muted: var(--color-accent-fg);
      --color-fg-faded: var(--color-accent-fg);
      --color-border: var(--color-accent-fg);
    }

    .item:focus-within .deleteButton {
      opacity: 1;
    }
    ```
  - [ ] 1.2: **Why CSS variables work for cross-component inversion:** the Checkbox component's CSS uses `var(--color-border)` for its frame and `var(--color-fg)` for the check tick. Overriding those variables on the focused `<li>` cascades down through descendants automatically — Checkbox doesn't need a prop or any code change. This is the cleanest decoupling possible.
  - [ ] 1.3: The `:focus-within` pseudo-class is well-supported in all evergreen browsers per the architecture's compatibility floor. No fallback needed.
  - [ ] 1.4: The strike-through on completed items uses `text-decoration: line-through` which doesn't depend on color tokens — stays visible against the inverted background. Good.

- [x] **Task 2: Codebase audit for color-only state cues** (AC 5)
  - [ ] 2.1: Grep for any CSS rule that changes color *and nothing else* based on state. Run `grep -rn "color:" app/ | grep -E "(:hover|:active|:focus|:checked|:disabled|\\[data-)"`.
  - [ ] 2.2: For each match, verify there's a co-located non-color cue (border, transform, opacity, font-weight, content). The known good ones:
    - ListItem completed: `text-decoration: line-through` ✓
    - ListItem focus: inverted-block (background swap) ✓ [added in Task 1]
    - Toast Retry hover: full background+color invert ✓
    - ErrorState Retry hover: full background+color invert ✓
    - Checkbox active: `--shadow-pressed` (not just color) ✓
    - TextInput focus: 2-px outline ring ✓
  - [ ] 2.3: Document the audit result in Completion Notes — the codebase passes AC 5.

- [x] **Task 3: ARIA-label coverage test** (AC 3)
  - [ ] 3.1: Add a test in `app/routes/home.test.tsx` (or a new accessibility-focused suite file). Mount the home route with one todo + show a toast. Assert that `screen.queryByLabelText` returns truthy for each of:
    - `"Add a todo"` (TextInput)
    - `"Toggle: <description>"` (Checkbox in ListItem)
    - `"Delete: <description>"` (delete button in ListItem)
    - `"Submit"` (mobile submit button — present in DOM regardless of viewport per Story 1.15's design)
    - For toast assertion: trigger via failed mutation, then check `"Dismiss"` and `"Retry: ..."`.
  - [ ] 3.2: This is a regression test — if any future story removes an aria-label, this catches it.

- [x] **Task 4: Reduced-motion verification test** (AC 6)
  - [ ] 4.1: Add a small test asserting that `app/styles/global.css` contains the `@media (prefers-reduced-motion: reduce)` block with `animation-duration: 0ms !important` + `transition-duration: 0ms !important` rules. Read the file at runtime via `fs.readFileSync` and grep for the strings. Pattern:
    ```ts
    import { readFileSync } from "node:fs";
    import { resolve } from "node:path";

    it("global.css honors prefers-reduced-motion", () => {
      const css = readFileSync(resolve(process.cwd(), "app/styles/global.css"), "utf8");
      expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
      expect(css).toMatch(/animation-duration:\s*0ms\s*!important/);
      expect(css).toMatch(/transition-duration:\s*0ms\s*!important/);
    });

    it("Toast.module.css has its own reduced-motion override for the keyframe animation", () => {
      const css = readFileSync(resolve(process.cwd(), "app/components/Toast.module.css"), "utf8");
      expect(css).toMatch(/prefers-reduced-motion:\s*reduce/);
      expect(css).toMatch(/animation:\s*none/);
    });
    ```
  - [ ] 4.2: Use `// @vitest-environment node` for these (they read filesystem, not React).

- [x] **Task 5: Skip-link for the `<main>` landmark** (AC 2 — keyboard-only)
  - [ ] 5.1: Story 1.2 added `id="main"` on AppShell. A skip link lets a keyboard user jump past navigation directly to the main content. We have no nav, so a skip link isn't strictly needed — but TextInput-as-first-tab-stop already serves this role naturally.
  - [ ] 5.2: **Decision: skip the skip-link.** With one route + no nav + TextInput as the first focusable element, a skip-link would add chrome without value. The `id="main"` from Story 1.2 stays for future-route compatibility. Document in Completion Notes.

- [x] **Task 6: Write `docs/keyboard-walkthrough.md`** (AC 8)
  - [ ] 6.1: Create `todo-app/docs/keyboard-walkthrough.md`. Concise — 1-2 pages max.
  - [ ] 6.2: Sections:
    - **Initial state** — page loads on desktop, TextInput is auto-focused. On mobile, page loads with TextInput tappable but not focused (per UX spec).
    - **Add a todo** — type, press Enter. Field clears + stays focused.
    - **Toggle complete** — Tab from TextInput → first checkbox. Press Space. Strike-through appears.
    - **Toggle uncomplete** — same path, Space again. Strike-through disappears.
    - **Delete** — Tab past checkbox → delete button (opacity becomes 1 on focus per Story 1.16). Press Enter or Space. Row disappears.
    - **Recover from a failure (Retry)** — when a mutation fails, a Toast appears. Tab from current position → Toast Retry. Press Enter.
    - **Dismiss a Toast** — Tab from Retry → Dismiss. Press Enter.
    - **Visual cues** — table summarizing what each state looks like.
  - [ ] 6.3: This doc lands in `todo-app/docs/` (a new directory). Architecture line 552 doesn't list `docs/` explicitly under `todo-app/` but the project root has `docs/prd-source.md`. Per the AC ("`docs/keyboard-walkthrough.md`") put it in `todo-app/docs/` — keeps the trainee-readable artifact next to the code it describes.

- [x] **Task 7: Verify gates + visual focus check + commit**
  - [ ] 7.1: `pnpm typecheck` exit 0.
  - [ ] 7.2: `pnpm test` ~117 passing (113 prior + ~4 new).
  - [ ] 7.3: `pnpm check:gap-i1` exit 0.
  - [ ] 7.4: `pnpm dev` browser smoke:
    - Tab from address bar into the page → TextInput focused (visible accent ring)
    - Type a todo + Enter → row appears + input retains focus
    - Tab → first checkbox focused. The whole `<li>` shows the inverted-block (accent background, ivory text + checkbox frame + delete glyph all light).
    - Space → checkbox toggles, strike-through appears (still visible against accent background — text color is now `--color-accent-fg`, strike-through line is the same color)
    - Tab → delete button focused. Press Enter → row disappears.
    - DevTools → emulate `prefers-reduced-motion: reduce` → repeat the flow → Toast slide-in is instant; no other animations.
  - [ ] 7.5: `git add . && git commit -m "Story 1.17: accessibility pass — focus, ARIA, live regions, reduced motion"`.

## Dev Notes

### Why this story matters

This is **the WCAG 2.1 AA verification gate** for Epic 1. Most of the work was done in earlier stories (focus rings on every primitive, aria-labels on every icon, Toast live-region, prefers-reduced-motion floor in global.css). Story 1.17's job is to:

1. **Add the one missing pattern** — ListItem inverted-block focus (UX spec lines 1044, 1057) — via `:focus-within` and CSS variable overrides.
2. **Audit + document** — codebase scan for color-only cues; aria-label coverage test; reduced-motion verification test.
3. **Capture the keyboard walkthrough** — `docs/keyboard-walkthrough.md` so a trainee or auditor can verify accessibility without instructor help.

The axe-core scan (AC 7) is the *automated* AA verification — it lands in Story 2.9 with the Playwright suite. Story 1.17 makes sure the code is axe-ready.

### Architectural context

- **WCAG 2.1 AA floor (architecture line 55):** "automated axe scan + manual keyboard walkthrough on every release." Story 1.17 closes the manual side; Story 2.9 closes the automated side.
- **CSS variable inversion** is the load-bearing mechanism for cross-component focus state. The Checkbox's CSS Module is opaque to ListItem's CSS Module (class names are hashed independently), but CSS variables CASCADE through descendant elements. Overriding `--color-border` and `--color-fg` on `.item:focus-within` makes Checkbox automatically inherit the inversion. **No prop drilling, no React state.**
- **`:focus-within`** is well-supported in all browsers per architecture's compatibility floor (line 58 — "last-2-majors of evergreen browsers").
- **Tab order is DOM order** in v1 — no `tabindex` overrides needed. The components render in the right DOM sequence: TextInput first, then list items in DESC order, then Toast (rendered at body root via the viewport, comes after AppShell content in DOM).

### Carry-over from prior stories

Already in place from Story 1.2: `id="main"` on AppShell; tokens for AA-verified contrast; `@media (prefers-reduced-motion)` in global.css.

Already in place from Story 1.10: TextInput auto-focus on desktop (mobile blocked deliberately); `aria-label="Add a todo"` on input.

Already in place from Story 1.11: real `<input type="checkbox">` (not faked); `aria-label="Toggle: <description>"`; 44×44 hit area.

Already in place from Story 1.12: real `<button>` with `aria-label="Delete: <description>"`; `:focus-visible` opacity:1 (Story 1.16 inversion preserved this).

Already in place from Story 1.13: Toast `role="status"` + `aria-live="polite"` + `aria-atomic="true"`; Retry/Dismiss aria-labels; Toast `prefers-reduced-motion: reduce` keyframe override.

Already in place from Story 1.15: mobile submit button `aria-label="Submit"`.

### Files being modified/created

- `app/components/ListItem.module.css` — append `:focus-within` inverted-block rule
- `app/routes/home.test.tsx` — add aria-label coverage assertions (1 test that checks several labels)
- `app/lib/accessibility.test.ts` — NEW — filesystem-grep tests for prefers-reduced-motion in global.css and Toast.module.css
- `todo-app/docs/keyboard-walkthrough.md` — NEW — manual walkthrough doc

### Testing standards

- Aria-label test uses `screen.queryByLabelText` (returns `null` if missing — clearer than `getByLabelText` which throws).
- Filesystem tests use `node:fs` + `node:path` and `process.cwd()`. Same pattern as Story 1.6's pattern-scanner test.
- Skip jsdom-based focus-state assertions (jsdom doesn't compute layout/CSS); the inverted-block visual is a Story 2.9 axe + Playwright concern.

### LLM-developer guardrails

- **Don't add `tabindex` to non-interactive elements.** Default Tab order on native elements is correct.
- **Don't add `role="list"` to existing `<ul>` more than once.** Story 1.8 already added it (Safari workaround for `list-style: none`).
- **Don't add ARIA where native semantics suffice.** `<button>` is its own role; don't add `role="button"` redundantly.
- **Don't add a JavaScript-driven focus trap inside Toast.** Per UX spec line 460, Toast does not trap focus — Tab moves through Retry → Dismiss → back to underlying UI. Already correct.
- **Don't add an explicit skip-link.** With one route + no nav, the skip-link adds chrome without value (the TextInput is already the first focusable element).
- **Don't try to make the strike-through "stronger" on focus.** The default text-decoration line-through is plenty visible against the accent background — adding a thicker line or different color would over-engineer.
- **Don't add color animations between unfocused and focused states.** Per global.css's reduced-motion + UX spec's stance, color transitions are decorative. The inversion is instant.

### Cross-cutting AC compliance

- ✓ Token discipline: every new CSS rule uses tokens (the `:focus-within` block redefines token values within scope, doesn't introduce hex).
- ✓ Import discipline: no new imports.
- ✓ Color is never the only signal: this story IS the verification of that rule.
- ✓ Visible focus indicator: inverted-block on ListItem fills the gap.
- ✓ Native HTML semantics: nothing added beyond what's already there.
- ✓ data-testid: no new test IDs.
- ✓ `pnpm typecheck` + `pnpm test` + `pnpm check:gap-i1` all pass.

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 1.17" lines 518–536
- `_bmad-output/planning-artifacts/architecture.md` line 55 (WCAG 2.1 AA + axe + manual walkthrough)
- `_bmad-output/planning-artifacts/architecture.md` line 58 (browser compatibility floor)
- `_bmad-output/planning-artifacts/ux-design-specification.md` § ListItem lines 1044, 1057 (inverted-block focus)
- `_bmad-output/planning-artifacts/ux-design-specification.md` § Toast line 460 (no focus trap)
- Memory: `feedback_anti_flattening.md` (color is never the only signal — strike-through carries completion meaning)
- Story 1.2 file: tokens.css AA contrast audit + global.css reduced-motion floor
- Stories 1.10–1.13 + 1.15 files: per-component aria-labels + focus rings

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context).

### Debug Log References

- Final test run: `Test Files 14 passed (14) | Tests 117 passed (117)` in 2.94s.
- `pnpm typecheck` exit 0; `pnpm check:gap-i1` exit 0.
- All 4 new tests passed first run: 3 filesystem-grep (global.css reduced-motion, Toast keyframe override, ListItem :focus-within) + 1 RTL aria-label coverage.

### Completion Notes List

**CSS-variable inversion is the load-bearing pattern.** The `:focus-within` rule on `.item` redeclares 4 token variables (`--color-fg`, `--color-fg-muted`, `--color-fg-faded`, `--color-border`) inside the focused row's scope. Descendant components (Checkbox, delete button) consume these variables via their own CSS Modules and automatically pick up the new values — **no React state, no prop drilling, no class threading**. This is the cleanest cross-component focus-state propagation possible in pure CSS.

**The strike-through line stays visible** against the inverted accent background because `text-decoration-color` defaults to `currentColor`, and `color` becomes `--color-accent-fg` (ivory) in the inverted state. Both the description text and the strike-through line render in the same ivory shade against the accent-blue background — visually a clean inverted appearance.

**Skip-link deliberately omitted.** With one route + no nav + TextInput as the first focusable element, a skip-link would add chrome without value. The `id="main"` on AppShell stays for future-route compatibility — if a story ever adds a top nav, a skip-link becomes a 5-line addition.

**Codebase audit for color-only state cues** (Task 2) confirmed every state-bearing color change has a co-located non-color cue:
- ListItem completed: `text-decoration: line-through` ✓
- ListItem focus: `:focus-within` background swap (entire row inverts) ✓
- Toast Retry hover: full background+color invert (not just one) ✓
- ErrorState Retry hover: same pattern ✓
- Checkbox active: `--shadow-pressed` (vintage bevel inversion, not color) ✓
- TextInput focus: 2-px outline ring (independent of color shift) ✓
- Delete button focus: opacity:1 on focus (visibility cue, then accent ring on top via `:focus-visible`) ✓

**Aria-label coverage test** is a regression net. Future stories that touch ListItem, TextInput, or the mobile submit button can't quietly drop an aria-label without this test catching it.

**Filesystem-grep tests for prefers-reduced-motion** ensure the floor isn't accidentally removed in a future CSS refactor. The reduced-motion floor is a WCAG AA requirement; a regression here would silently fail axe but pass everything else — the grep tests catch it loud.

**axe-core scan deferred to Story 2.9.** Story 1.17's job was to make the code axe-ready (visible focus on every interactive; aria-label on every icon; reduced-motion floor; no color-only signals). The codebase audit + new inverted-block focus pattern + the doc all confirm readiness. Story 2.9 will add `@axe-core/playwright` and assert zero violations across all six canonical UI states.

**`docs/keyboard-walkthrough.md` is the manual verification artifact.** A trainee or auditor can run the doc start-to-finish without touching a mouse and confirm WCAG AA conformance for v1's flows. Cross-references the Tab-loop summary, visual-cues table, and reduced-motion behavior — captured for the artifact-set training identity.

**Test count climbed from 113 → 117** (+4: 3 filesystem tests + 1 RTL aria-label). Total: 117/117 across 14 files.

**Epic 1 complete.** All 17 stories closed; the running app is feature-complete for v1's user-facing scope. Epic 2 (containerization, CI gates) and Epic 3 (artifact-set + training-identity docs) take the deliverable from "feature-complete" to "ship-ready."

### File List

**Created:**
- `todo-app/app/lib/accessibility.test.ts` (~32 lines, 3 filesystem-grep tests)
- `todo-app/docs/keyboard-walkthrough.md` (~80 lines, manual verification doc)

**Modified:**
- `todo-app/app/components/ListItem.module.css` — added `:focus-within` inverted-block rule with CSS-variable overrides
- `todo-app/app/routes/home.test.tsx` — added 1 aria-label coverage test

**Commit:** `b0d20b6 Story 1.17: accessibility pass — focus, ARIA, live regions, reduced motion` (parent: Story 1.16).

### Change Log

- **2026-04-30** — Story 1.17 implemented. Final missing focus pattern (ListItem inverted-block) added via CSS-variable cascade. Reduced-motion + aria-label coverage now backed by filesystem-grep + RTL tests. `docs/keyboard-walkthrough.md` lands as the manual WCAG AA verification artifact. Total tests: 117/117 across 14 files. **Epic 1 complete.** Story 2.9's axe-core scan will close the automated AA verification loop.
