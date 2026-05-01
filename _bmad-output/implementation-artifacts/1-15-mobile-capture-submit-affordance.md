# Story 1.15: Mobile Capture-Submit Affordance

Status: review

## Story

As Sam on mobile,
I want a tappable submit affordance on the right edge of the input field,
so that I can submit without relying on the soft keyboard's Enter key (which doesn't reliably submit on iOS/Android).

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 1.15 (lines 483–498).

1. **Given** Story 1.10 is complete, **When** I add the icon-button submit affordance inside `TextInput` for mobile, **Then** at `≤640 px` viewport an icon button appears on the right edge of the input field.
2. **And** it uses chrome consistent with the rest of v1: 1-px `--color-border`, square corners, `--color-bg` background, ≥44×44 CSS-pixel hit area.
3. **And** tapping it triggers the same submit handler as Enter (whitespace-only silently rejected, value cleared after submit, ref refocused).
4. **And** at `≥1025 px` viewport, the affordance is hidden (Enter on physical keyboard suffices — UX spec § TextInput line 936).
5. **And** at `641–1024 px` (tablet), the affordance is also hidden — assumes attached keyboard available; matches the architecture's three-breakpoint cascade.
6. **And** Playwright E2E coverage at three viewport widths is **deferred to Story 2.9** (Story 1.15 lands the unit/integration evidence; the visual-viewport test belongs with the Playwright suite).

## Tasks / Subtasks

- [x] **Task 1: Refactor `TextInput` to render an inline submit button on mobile** (AC 1, 2, 3, 4, 5)
  - [ ] 1.1: Modify `app/components/TextInput.tsx`. Wrap the `<input>` and a new submit `<button>` in a flex container `<div className={styles.row}>`. The button is always present in the DOM but visually hidden via CSS at viewports >640 px (so screen readers + keyboard users on desktop don't tab into it).
  - [ ] 1.2: Extract the existing submit logic into a named handler — both `handleKeyDown` (Enter case) and the new `<button onClick>` call the same `submit()` function:
    ```tsx
    function submit() {
      const trimmed = value.trim();
      if (!trimmed) return;
      onSubmit(trimmed);
      setValue("");
      inputRef.current?.focus();
    }
    ```
  - [ ] 1.3: Render:
    ```tsx
    return (
      <div className={styles.row}>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          maxLength={256}
          placeholder="Add a todo"
          aria-label="Add a todo"
          data-testid="todo-input"
          className={styles.input}
        />
        <button
          type="button"
          onClick={submit}
          className={styles.submitButton}
          aria-label="Submit"
          data-testid="todo-submit"
        >
          <span aria-hidden="true">↵</span>
        </button>
      </div>
    );
    ```
  - [ ] 1.4: Use `↵` (U+21B5, Downwards Arrow with Corner Leftwards) as the glyph — a return-key icon that's universally recognized as "submit." Renders as text via the same body font; no SVG dependency.

- [x] **Task 2: Update `TextInput.module.css`** (AC 1, 2, 4, 5)
  - [ ] 2.1: Add `.row` rule:
    ```css
    .row {
      display: flex;
      align-items: stretch;
      width: 100%;
    }
    ```
  - [ ] 2.2: Modify `.input` to flex-grow and lose its right border (the button takes over):
    ```css
    .input {
      flex: 1;
      width: auto;  /* override the previous 100% — flex handles sizing */
      /* keep the rest: border, font, padding, focus ring */
    }
    ```
    On mobile, the input's right border becomes the seam between input and button. Visually, the two elements share a continuous chrome.
  - [ ] 2.3: Add `.submitButton`:
    ```css
    .submitButton {
      display: none;  /* hidden by default (desktop + tablet) */
      width: 44px;
      min-width: 44px;
      border: var(--border-width) solid var(--color-border);
      border-left: 0;  /* shares the input's right border */
      border-radius: var(--border-radius);
      background: var(--color-bg);
      color: var(--color-fg);
      font-family: var(--font-body);
      font-size: var(--font-size-lg);
      cursor: pointer;
      align-items: center;
      justify-content: center;
    }

    @media (max-width: 640px) {
      .submitButton {
        display: inline-flex;
      }
    }

    .submitButton:hover {
      background: var(--color-fg);
      color: var(--color-bg);
    }

    .submitButton:active {
      box-shadow: var(--shadow-pressed);
    }

    .submitButton:focus-visible {
      outline: 2px solid var(--color-accent);
      outline-offset: 0;
    }
    ```
  - [ ] 2.4: **`max-width: 640px` query exception** — Story 1.16's AC says "all layouts use min-width queries only", but this is a *visibility hide* on mobile; expressing it as `display: none` (default) + `display: inline-flex` (≤640) keeps the desktop default clean. Alternative: default `display: inline-flex` + `@media (min-width: 641px) { display: none; }` — equivalent, also works. **Pick the inverted form** (default none, mobile reveals) so a tablet user temporarily resizing to mobile width sees the button appear without flicker. *Document this as a deliberate exception to Story 1.16's discipline.*

- [x] **Task 3: Update tests** (AC 3)
  - [ ] 3.1: Add 2 tests to `app/routes/home.test.tsx` (TextInput is exercised through the home route):
    - "submitting via the mobile button calls the same flow as Enter" — query `getByTestId("todo-submit")`, click it, assert the same observable behavior (optimistic row appears, fetch fires).
    - "mobile submit button silently rejects whitespace-only" — type "   ", click submit, assert no fetch fires.
  - [ ] 3.2: The existing `home.test.tsx` Enter-submit tests should still pass unchanged (they query `getByTestId("todo-input")` and use `userEvent.type(..., "{Enter}")`).
  - [ ] 3.3: **Don't add a viewport-size test** here — RTL's jsdom doesn't actually render media queries (the button is in the DOM regardless; CSS hides it). The viewport-conditional rendering is verified visually (and by Story 2.9's Playwright projects). For the unit test, querying via `data-testid` works regardless of CSS visibility.

- [x] **Task 4: Verify gates + browser smoke + commit**
  - [ ] 4.1: `pnpm typecheck` exit 0.
  - [ ] 4.2: `pnpm test` ~113 tests passing (111 prior + 2 new).
  - [ ] 4.3: `pnpm dev` browser smoke:
    - At normal viewport, the submit button is invisible
    - DevTools → device toolbar → set viewport to ≤640 px → button appears flush against the input's right edge
    - Tap the button with text → row appears optimistically
    - Tap with empty/whitespace text → no submit
  - [ ] 4.4: `pnpm check:gap-i1` exit 0.
  - [ ] 4.5: `git add . && git commit -m "Story 1.15: mobile capture-submit affordance"`.

## Dev Notes

### Why this story matters

Mobile soft keyboards on iOS/Android handle Enter inconsistently — some insert newlines, some submit, some do neither. Without a visible submit affordance, mobile capture is fragile. Per architecture's compatibility cross-cutting AC: *"last-2-majors of evergreen browsers; localStorage + fetch required"* — we don't gate on touch-keyboard behavior, but we route around it via a tappable button.

The button uses the **same submit function** as Enter — single source of truth for the submit logic. UX spec § TextInput line 936: "On mobile, the field is *not* programmatically focused on mount."

### Architectural context

- **TextInput stays a single primitive.** The mobile button is a CSS-conditional add to the existing component, not a separate `MobileTextInput`. Reasons: same submit semantics; same state; same optimistic-store wiring; conditional CSS is simpler than conditional component swap.
- **Three breakpoints (architecture-locked):** `≤640` mobile, `641–1024` tablet, `≥1025` desktop. Story 1.16 owns the responsive cascade for the rest of the app; this story uses just the mobile-only carve-out for the submit button.
- **`max-width: 640px` query exception.** Story 1.16 establishes the discipline of `min-width` queries only. The submit button uses a `max-width` query because *mobile is the additive case* — desktop + tablet share the "no button" default. Inverting to a `min-width` query would require both `display: inline-flex` (default, mobile) and `@media (min-width: 641px) { display: none }` — equivalent, but the inverted form keeps the SSR-default cleaner (most users are on desktop; serving HTML with the button hidden by default avoids a frame of "button visible then hidden"). Documented exception.
- **The `↵` glyph** (U+21B5) is unicode and renders via the existing serif font stack. No SVG, no icon font, no PNG — keeps the dependency surface flat.
- **Hit-target audit:** the button is exactly 44×44 px (architecture's WCAG-AA floor). Visible glyph is a single character at `--font-size-lg` (18 px) inside the 44-px button.

### Carry-over

From **Story 1.10**: `TextInput`'s submit logic (Enter handler, value clearing, refocus). This story factors that into a named `submit()` function used by both Enter and the new button.
From **Story 1.14**: `useAddTodo` hook still drives the dispatcher. TextInput just calls `onSubmit(trimmed)` — same as before. No change to the wiring.
From **Story 1.11**: Checkbox-style chrome (1-px border, square corners, hover-invert) is the v1 button vocabulary. This story applies the same pattern.

### Files being modified

- `app/components/TextInput.tsx` — extract `submit()`, add row wrapper, add submit button
- `app/components/TextInput.module.css` — add `.row`, modify `.input` (flex-1 + lose width:100%), add `.submitButton` with mobile-only `display`
- `app/routes/home.test.tsx` — add 2 tests for the mobile button

### Testing standards

- The mobile-button tests query via `data-testid="todo-submit"` rather than `getByLabelText("Submit")` (more stable; matches TEA M-2 pattern).
- jsdom doesn't render the media query, but the button IS in the DOM. Tests can interact with it regardless of CSS visibility — this is fine because the *function* is what we're testing, not the visual hide. Visual hide is a Story 2.9 (Playwright projects at three viewports) concern.

### LLM-developer guardrails

- **Don't extract a separate `MobileTextInput` component.** Single component with a CSS-conditional addition. Two components would duplicate state + submit logic.
- **Don't add a "submit on blur" behavior.** The button is the explicit affordance for mobile; blur-submit would surprise the user.
- **Don't change the Enter handler** in `handleKeyDown`. Both paths call the same `submit()` function — extract once, call twice.
- **Don't make the button always visible on desktop.** UX spec is explicit (line 936): the button is a mobile concession; desktop has Enter.
- **Don't make the button submit on hover or focus.** Click-only. Keyboard navigation reaches it via Tab; activation via Space/Enter.
- **Don't replace the `↵` glyph with a "Submit" word button.** Width-bounded; word would force a wider button or a font-size compromise. Glyph is universally recognized + matches the calm-aesthetic.

### Cross-cutting AC compliance

- ✓ Token discipline: all CSS uses tokens (no raw hex; the only magic numbers are 44 px and 640 px which are architecture-locked breakpoints/touch-targets).
- ✓ Import discipline: TextInput imports nothing new.
- ✓ Color is never the only signal: the button has shape + position + glyph. Hover-invert is the secondary affordance, not the primary.
- ✓ Visible focus indicator: 2-px accent ring on `:focus-visible`.
- ✓ data-testid: `todo-submit` per TEA M-2 (canonical).
- ✓ Native HTML semantics: `<button type="button">` (not `submit` — there's no enclosing `<form>`).
- ✓ `pnpm typecheck` + `pnpm test` + `pnpm check:gap-i1` all pass.

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 1.15" lines 483–498
- `_bmad-output/planning-artifacts/ux-design-specification.md` § TextInput line 936 (mobile keyboard caveat)
- `_bmad-output/planning-artifacts/architecture.md` line 599 (touch-target floor: ≥44×44 CSS pixels)
- `_bmad-output/planning-artifacts/architecture.md` line 595 (three breakpoints: ≤640, 641–1024, ≥1025)
- Story 1.10 file: TextInput primitive structure being extended

## Dev Agent Record

### Agent Model Used

Claude Opus 4.7 (1M context).

### Debug Log References

- Final test run: `Test Files 13 passed (13) | Tests 113 passed (113)` in 3.51s.
- `pnpm typecheck` exit 0; `pnpm check:gap-i1` still OK.
- Both new tests (button drives same flow as Enter; whitespace silently rejected via button) work without any mock changes — the existing `vi.mock("~/services/todos")` + `vi.stubGlobal("fetch")` pattern carries over.

### Completion Notes List

**Single source of truth for submit.** The `submit()` named function is called by both Enter (`handleKeyDown`) and the button (`onClick`). Future story changes to submit semantics (e.g., post-submit toast on success) only need to touch one place.

**`max-width: 640px` is a documented exception** to Story 1.16's planned "min-width-queries-only" discipline. Reasons captured in Dev Notes; the alternative `min-width` formulation would force `display: inline-flex` (default) + a desktop hide rule, creating an SSR-default-then-hide flash for the desktop majority.

**The `↵` glyph** renders cleanly via the body serif font — no SVG, no icon font. At `--font-size-lg` (18 px) inside the 44-px button it has plenty of breathing room. Universally recognized as "return/submit."

**Border-left: 0 on the submit button** creates the seamless input+button chrome on mobile — they look like one element, not two. The input's right border IS the button's left border. Subtle but matters.

**Test count climbed from 111 → 113** (+2 from Story 1.15).

### File List

**Modified:**
- `todo-app/app/components/TextInput.tsx` (~62 lines — extracted submit(), wrapped in flex row, added submit button)
- `todo-app/app/components/TextInput.module.css` (~70 lines — added .row, .submitButton, modified .input)
- `todo-app/app/routes/home.test.tsx` (added 2 mobile-button tests)

**Commit:** `798c171 Story 1.15: mobile capture-submit affordance` (parent: Story 1.14).

### Change Log

- **2026-04-30** — Story 1.15 implemented. TextInput now ships with the mobile-only submit affordance. Visible at ≤640 px viewport via the lone `max-width` query in v1's CSS (documented exception). Total tests: 113/113 across 13 files. Playwright multi-viewport coverage deferred to Story 2.9.
