# Keyboard Walkthrough

A keyboard-only verification path for every v1 verb. Use this to confirm WCAG 2.1 AA conformance manually after any UI-touching change. The automated companion is the axe-core scan in the Playwright suite (Story 2.9).

No mouse. No trackpad. Just keyboard.

## Initial state

| Platform | What you see |
|---|---|
| Desktop (≥ 641 px viewport) | TextInput is auto-focused. Visible accent ring on the input chrome. |
| Mobile (≤ 640 px) | TextInput is rendered + tappable but **not** auto-focused (a deliberate refusal — programmatic focus on mobile would surface the soft keyboard before the user asked for it). The mobile submit button (`↵`) is visible flush against the input's right edge. |

If the page is being loaded for the first time in this browser, you'll see the *Empty state* — a quietly typeset *"Nothing on the list."* below the input. If a previous browser session persisted todos, you'll see the list.

## Add a todo

1. Type a description.
2. Press **Enter**.
3. The new row appears at the top of the list. The input clears + remains focused.

If the network is down or the server rejects the request: the row reverts (vanishes) and a **Toast** appears at bottom-right (desktop) or bottom-center (mobile). See [Recover from a failure](#recover-from-a-failure-retry).

## Toggle complete (mark done)

1. From the TextInput, press **Tab** once. Focus moves to the **first checkbox**.
2. The whole row inverts — accent-blue background, ivory text + checkbox frame + delete glyph all light. This is the *inverted-block* focus indicator; it confirms which row your keyboard input will affect.
3. Press **Space**. The checkbox toggles. A strike-through appears across the description (still visible against the accent background — the strike-through line + the description text both render in `--color-accent-fg`).

## Toggle uncomplete (mark not-done)

Same path: Tab to a completed row's checkbox, press Space. Strike-through disappears.

## Delete

1. From any focused checkbox, press **Tab** once. Focus moves to that row's **delete button** (the `×` glyph). On desktop the glyph becomes visible the moment it's focused (opacity transitions to 1); on mobile it's always visible.
2. Press **Enter** or **Space**. The row disappears immediately.

If the network rejects the deletion: the row reappears at its original position + a Toast appears.

## Recover from a failure (Retry)

1. When a Toast appears, press **Tab** until focus reaches **Retry** (visible accent ring). Tab order continues from wherever you were — the Toast does **not** trap focus.
2. Press **Enter** or **Space**. The original payload is re-sent (the same UUID for a failed add, the same target id for toggle/delete). On success, the Toast dismisses automatically and the optimistic state holds.
3. To dismiss without retrying: from Retry, press **Tab** once → **Dismiss** (the `×` in the Toast's top-right). Press **Enter** or **Space**. The Toast disappears + the data is discarded (no further auto-retry).

## Visual cues — every state has at least one non-color signal

| State | Color cue | Non-color cue |
|---|---|---|
| Active todo | `--color-fg` text | (default; no decoration) |
| Completed todo | `--color-fg-faded` text | `text-decoration: line-through` |
| Focused row | `--color-accent` background | inverted-block (background swap) |
| Focused primitive (TextInput, button) | accent outline | 2-px ring + outline-offset |
| Toast | `--color-bg` (same as page) | hard-offset shadow + slide-in motion |
| Loading | `--color-fg-muted` text | "Loading…" word |
| Error | `--color-fg-muted` text | "Couldn't …" word + Retry button |

**Color is never the only signal.** A user with full deuteranopia or protanopia sees all the same state distinctions through shape + decoration + motion.

## Reduced motion

When the OS preference `prefers-reduced-motion: reduce` is set:

- Toast slide-in collapses to instant render
- All transitions across the app collapse to 0 ms
- The hover-revealed delete glyph appears instantly (no fade)

Verified via DevTools → Rendering → "Emulate CSS media feature `prefers-reduced-motion`".

## Tab loop summary

```
TextInput
  → mobile submit (only on mobile viewport)
  → ListItem 1: checkbox
  → ListItem 1: delete button
  → ListItem 2: checkbox
  → ListItem 2: delete button
  → … (each ListItem in DOM order, which is created_at DESC)
  → Toast Retry  (if a Toast is present)
  → Toast Dismiss
  → loops back to TextInput
```

Press **Shift+Tab** at any point to go in reverse.

---

*This walkthrough is the manual side of the WCAG 2.1 AA verification.* The automated side — `@axe-core/playwright` zero-violation scan across all six canonical UI states — runs in the Playwright suite (Story 2.9).
