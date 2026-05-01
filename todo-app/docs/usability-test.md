# Usability Test — v1

**Status: Pending real-user sessions.**

This artifact is the deliberate placeholder for Story 2.12's outcome — the 5-person first-time-user observation. It cannot be automated; the AC requires real humans interacting with the app cold.

## Method (planned)

Per Story 2.12 AC:

1. Deploy v1 to a private URL the participant can reach (laptop + ngrok / Tailscale tailnet / homelab).
2. Send each participant **only the URL** — no instructions, no demo, no walkthrough video.
3. Observer (over Zoom screenshare or in person) logs whether the participant unaided-completes each of the four verbs:
   - **Add** a todo
   - **See** the row appear in the list
   - **Mark complete** via the checkbox
   - **Delete** the todo
4. Observer also logs unprompted answers to: *"Would you use this as a calmer alternative to your current todo app?"* — yes / no / maybe (with a one-line reason).

## Targets

- **≥ 4 of 5** participants complete all four verbs without prompting (NFR Usability target).
- **≥ 3 of 5** answer yes to the calmer-alternative question (NFR Usability adoption signal).

## Observation log template

For each participant, record:

```
Participant: [first name or pseudonym]
Date: YYYY-MM-DD
Browser/device: [Safari iOS / Chrome desktop / etc.]
Time-to-first-todo: [seconds from URL load to first row visible]
Verbs unaided-completed: [add / see / complete / delete] — y/n each
Friction observed: [free text — anything they hesitated on]
Calmer-alternative answer: [yes / no / maybe — with reason]
```

## Results (to be populated)

| Participant | Browser | Add | See | Complete | Delete | Calmer alt? |
|---|---|---|---|---|---|---|
| TBD | — | — | — | — | — | — |

(Five rows expected.)

### Aggregate findings

(To be written after all five sessions.)

### Flagged improvements

(To be written. Each entry: observation + proposed change + whether to roll into v1.1 or accept-and-document.)

## v1 ship gate

Per Story 2.12, the usability data feeds into the v1 ship decision. Without ≥ 4/5 unaided completion, v1 shouldn't be declared shipped — the calm-by-default hypothesis hasn't survived contact with first-time users. With ≥ 4/5, v1 ships and the calmer-alternative answer becomes input for the post-v1 roadmap (do users actually want to switch? if not, calm-by-default is a stylistic preference, not an adoption-driving differentiator).

This document is referenced from `README.md` § Project structure.
