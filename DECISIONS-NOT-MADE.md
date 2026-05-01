# Decisions Not Made — Refused Features Catalog

This is the catalog of features and tools v1 *deliberately did not include*. Each entry has a one-line rationale. Re-derive scope under different constraints by inverting the rationale: which entries flip from "refused" to "in-scope" if the constraint shifts?

Organized by source: PRD refusals → Architecture refusals → UX refusals → Known limitations.

---

## PRD Refusals (Product Scope)

<a id="user-accounts"></a>**User accounts** — v1 has no auth. Browser key is an identity proxy, not a security boundary. *Constraint: trainee comprehension favors a no-auth path; auth would multiply Story complexity and obscure the seam architecture.*

<a id="multi-user-data-separation"></a>**Multi-user data separation** — v1 separates by browser key, not user identity. Cross-user data isolation is the same mechanism (the `owner_id` seam) but the semantic of "user" is a future-auth concern. *Constraint: same as auth.*

<a id="collaboration-sharing"></a>**Collaboration / sharing** — no shared lists, no invitations, no comments. *Constraint: collaboration requires identity + permission model; out of scope without auth.*

<a id="priorities-due-dates-recurring"></a>**Priorities, due dates, recurring tasks** — todos are unstructured strings. *Constraint: each adds a Story dimension (UI for priority, time for due dates, recurrence rules); v1 prioritizes the four-verb fundamentals.*

<a id="notifications"></a>**Notifications** — no email, no push, no in-app reminders. *Constraint: requires backend-initiated outbound delivery + identity (where to send). Both out of scope.*

<a id="tags-projects-subtasks"></a>**Tags, projects, sub-tasks** — flat list only. *Constraint: hierarchy + categorization is its own design problem (e.g., picker UI, drag-and-drop, tag-creation rules) — would dwarf v1's UX story scope.*

<a id="cross-device-sync"></a>**Cross-device sync** — todos are per-browser, not per-user. Different browsers see different lists even on the same device. *Constraint: requires user accounts (see above).*

<a id="native-mobile-apps"></a>**Native mobile apps (iOS / Android)** — responsive web only. *Constraint: native = +2 build pipelines + app-store ceremony + duplicated UX. Disproportionate for v1 scale.*

<a id="ai-features"></a>**AI features (auto-categorize, suggest tasks, summarize)** — none. *Constraint: undermines the calm-by-default lead differentiator; injects third-party API dependency the architecture refuses.*

<a id="public-internet-deployment"></a>**Public-internet deployment without security pass** — v1 is private-URL only. README's Deployment section enforces this. *Constraint: A07 risk — browser-key collision is improbable but not impossible; without auth, public exposure is irresponsible.*

<a id="onboarding-tour"></a>**Onboarding / tour / welcome modal** — none. The empty state is the canvas. *Constraint: calm-by-default — the input field is its own affordance; a tour is its own UI burden.*

<a id="search-filter"></a>**Search, filter, sort customization** — list is `created_at DESC` always. *Constraint: at v1's ~100-item scale the user can scroll faster than they can specify a filter.*

<a id="export-import"></a>**Export / import (CSV, JSON, etc.)** — none. *Constraint: no canonical user — what would you export? Adds Story complexity for a niche use case.*

---

## Architecture Refusals (Stack & Tooling)

<a id="nextauth"></a>**NextAuth / Auth.js v5** — auth deferred entirely. Request-context + ownership-check seams cover the future auth integration point. *Constraint: would force scope creep into Epic 1; the seams pay for the deferral.*

<a id="trpc"></a>**tRPC** — RR7 loader/action pattern is the contract. *Constraint: tRPC adds a TS schema-coupling layer that competes with Zod and obscures the loader-action mental model trainees need to grok.*

<a id="tailwind"></a>**Tailwind CSS** — vanilla CSS Modules + token system instead. *Constraint: Tailwind's vocabulary is large; the trainee would spend brain cycles on `bg-zinc-100/95 dark:bg-zinc-900/90` instead of on the architecture. The token system is the deliberate refusal.*

<a id="storybook"></a>**Storybook** — component documentation lives in code + UX-spec only. *Constraint: 8 v1 components don't need a separate documentation tool; Storybook's setup overhead exceeds its value here.*

<a id="sentry-datadog-grafana"></a>**Sentry, Datadog, Grafana, GA, Mixpanel** — pino structured JSON to stdout instead. *Constraint: third-party SDKs are supply-chain risk + privacy-leak risk + recurring cost. Operators pipe stdout to whatever they want.*

<a id="resend-sendgrid"></a>**Resend / SendGrid / any transactional email** — no email integration. *Constraint: no notifications scope; no auth flow. Both refused above.*

<a id="graphql-apollo"></a>**GraphQL / Apollo** — REST-ish JSON over RR7's loader/action pattern. *Constraint: GraphQL's value (selection / federation) doesn't apply at v1's scale + adds a query-language vocabulary the trainee must learn.*

<a id="redux-zustand"></a>**Redux Toolkit / Zustand / TanStack Query** — hand-rolled optimistic store on `useReducer` + `Context` (~190 LOC). *Constraint: the optimistic-rollback contract is the load-bearing client behavior; hand-rolling makes it trainee-readable.*

<a id="prisma-kysely"></a>**Prisma / Kysely / raw `pg`** — Drizzle ORM. *Constraint: Prisma's binary engine is heavy; Kysely lacks a migration tool; raw `pg` lacks type safety. Drizzle is SQL-first + type-safe + has built-in migrations.*

<a id="orm-zod-clients"></a>**drizzle-zod auto-generation** — Zod schemas hand-written. *Constraint: drizzle-zod is fine but creates schema-graph entanglement; for v1 the explicit Zod schemas are easier to reason about.*

<a id="cookie-primary-transport"></a>**Cookie as the PRIMARY browser-key transport** — header + cookie hybrid. *Constraint: header is the canonical fetcher transport; cookie is the SSR-handoff fallback only (added in Story 2.9 as a documented refinement).*

<a id="server-actions"></a>**Server Actions / RSC mutations** — RR7 loader/action pattern is the v1 idiom. *Constraint: RSC complexity buries the request-context seam; v1 stays on the well-trodden RR7 framework-mode path.*

<a id="vitest-pretty-printer"></a>**Custom Vitest reporter** — default reporter + `@vitest/ui` (untouched, available ad-hoc). *Constraint: marginal value at v1's test-suite size.*

<a id="docker-compose-version"></a>**`version:` field in docker-compose.yaml** — Compose v2 deprecated it. *Constraint: don't fight the tool's modern conventions.*

---

## UX Refusals (Visual & Interaction)

<a id="confirmation-dialogs"></a>**Confirmation dialogs ("Are you sure?")** — none. Delete is one-tap; recovery is via Toast on backend rejection. *Constraint: confirmation friction violates calm-by-default; the optimistic-rollback contract is the safety net.*

<a id="multi-button-hierarchy"></a>**Multi-button hierarchy (primary / secondary / tertiary)** — only Retry exists as a button in v1. *Constraint: `<Button>` primitive is single-variant; if a future story needs visual hierarchy, that's a Button-primitive expansion, not a v1 concern.*

<a id="success-warning-info-toasts"></a>**Success / warning / info toasts** — Toast surfaces only on failure (recovery affordance). *Constraint: success toasts are decorative noise; the optimistic UI IS the success signal.*

<a id="inline-form-validation"></a>**Inline form validation (red borders, error messages)** — Toast on submit; field is unstyled. *Constraint: input is one field, max 256 chars, whitespace silently rejected. Inline validation would be over-engineered for the surface.*

<a id="required-field-markers"></a>**Required-field markers (`*`, "(required)")** — only one field exists; required is implicit. *Constraint: marker noise.*

<a id="helper-text"></a>**Helper text under fields** — placeholder is the affordance. *Constraint: same.*

<a id="auto-dismiss-toast"></a>**Auto-dismiss on Toast** — Toast persists until Retry / Dismiss. *Constraint: auto-dismissing a recovery affordance is hostile — the user might miss it.*

<a id="navigation-chrome"></a>**Navigation chrome (top nav, sidebar, breadcrumbs)** — none. v1 is a single screen. *Constraint: nothing to navigate to; chrome would be ornament.*

<a id="search-filter-ui"></a>**Search / filter UI** — refused at PRD level (see above); no UI burden either.

<a id="onboarding-ui"></a>**Onboarding modal / tour** — refused at PRD level; UX side: empty state is the canvas.

<a id="tooltips"></a>**Tooltips** — no element has tooltip-only context. *Constraint: every action's purpose is clear from its position + label.*

<a id="gdpr-cookie-banner"></a>**GDPR / cookie banner** — no third-party tracking; no analytics; cookies are first-party functional only. *Constraint: GDPR banner is performative without third-party data flows.*

<a id="long-press-menus"></a>**Long-press menus on mobile** — delete glyph is always-visible on mobile (per UX spec). *Constraint: long-press is a hidden affordance; calm-by-default favors visible affordances.*

<a id="modals-beyond-toast"></a>**Modals (other than Toast)** — none. No settings panel, no profile dialog, no delete confirmation. *Constraint: every modal is an interruption; Toast is the only deliberate one.*

<a id="dark-mode"></a>**Dark mode** — light mode only. UX spec mentions a future dark mode would re-define tokens under `[data-theme="dark"]` (component code unchanged) but v1 ships light only. *Constraint: dark mode is a token-set decision, not a component-architecture decision; defer.*

<a id="animations"></a>**Decorative animations (bounce on add, confetti on complete, scroll parallax)** — none. *Constraint: motion is reserved for *state changes that need to be noticed* per UX spec.*

<a id="skeleton-loader-pulse"></a>**Skeleton-loader pulse** — `LoadingState` is a quiet text line. *Constraint: pulse animations are decorative motion in disguise.*

<a id="custom-scrollbar"></a>**Custom scrollbar styling** — browser default. *Constraint: native scrollbar respects user OS preferences; custom styling would override accessibility settings.*

<a id="fonts-via-google-fonts"></a>**Webfonts via Google Fonts** — Charter / Iowan Old Style / Palatino / Georgia (system-only stack). *Constraint: webfont = network request + privacy concern (Google Fonts pings) + FOIT/FOUT flicker; the system stack avoids all three.*

---

## Known Limitations

<a id="two-tab-race"></a>**Two-tab race condition (DATA-2)** — TEA amendment m-3. Two browser tabs sharing the same browser key produce last-write-wins behavior. v1 accepts this; a future sync module would resolve it. The optimistic store is per-tab; if Tab 1 deletes a row that Tab 2 has open, Tab 2's local store has the (now-stale) row until the next loader run. *Constraint: cross-tab sync requires `BroadcastChannel` or Service Worker + reconciliation logic; out of scope for v1.*

<a id="lighthouse-budget"></a>**Lighthouse perf budget assertion** — deferred from Story 2.10. Lighthouse adds a separate tool surface (lighthouse package + headless Chrome session config) for marginal value at v1's static-asset-light scale. *Constraint: re-add post-ship if perf regressions surface.*

<a id="image-size-target"></a>**Docker image size 305 MB** — exceeds Story 2.1's 200 MB AC target. Captured as a documented deviation. *Constraint: React 19 + Drizzle + Postgres driver + RR7 server bundle just is what it is at this stack; further shaving would add maintenance disproportionate to a v1 training reference.*

<a id="csp-unsafe-inline"></a>**CSP `'unsafe-inline'` for scripts + styles** — required for RR7's hydration scripts and Vite's critical CSS injection. Documented for tightening post-v1 (would require nonce-based CSP + RR7 plugin work).

---

Total entries: 47. Each is linkable via its anchor (`#kebab-case-name`) for cross-referencing from issues, PRs, or future planning artifacts.
