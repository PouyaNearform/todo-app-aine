# ToDo App — and the canonical AINE BMAD training reference

This repo is two things at once. **The first thing it is** is a real, deliberately small personal todo product — `docker compose up` and you have a working app at `localhost:3000`, with optimistic UI, persistence per browser key, WCAG 2.1 AA-compliant accessibility, and a vintage-Macintosh-System-7 visual identity rendered through 26 hand-rolled design tokens. **The second thing it is** is the canonical AINE BMAD training reference: every architectural decision, every refused feature, and every per-stage AI prompt that produced this app is documented as an artifact at `_bmad-output/`. A trainee following the artifacts can re-derive the entire app, understand why each piece exists, and emerge with a working internal model of the BMAD methodology.

The two natures cohabit via an explicit **tiebreaker**: when training clarity and product expediency conflict, training clarity wins — *with carve-outs for security floors, accessibility floors, and data-integrity floors* (those are non-negotiable regardless of teaching value). Most of the time the two natures align: a clearer architecture is usually a more shippable architecture. Where they don't (e.g., why `INSERT ... ON CONFLICT (id) DO NOTHING` is documented in plain SQL form rather than abstracted away — even though abstraction would be more "DRY"), this repo deliberately favors the trainee-readable form.

## Quick Start

```bash
git clone <this-repo>
cd ToDo-App-AINE/todo-app
docker compose up --build -d        # ~30 s on a primed machine
open http://localhost:3000           # (or curl)
pnpm install && pnpm test:e2e        # 11/11 specs in ~10 s
```

For local development (without Docker, against a host-mounted Postgres):

```bash
cd todo-app
docker run -d --name todo-app-pg-dev \
  -e POSTGRES_USER=todo -e POSTGRES_PASSWORD=todo -e POSTGRES_DB=todo \
  -p 5432:5432 postgres:17-alpine
cp .env.example .env
pnpm install && pnpm db:migrate && pnpm dev
```

See [`todo-app/README.md`](todo-app/README.md) for the developer-focused walkthrough.

## Artifact Set — BMAD Lifecycle Index

Every BMAD lifecycle stage produced an artifact. Read in order to follow the methodology end-to-end.

### Phase 1 — Planning (PRD & Design)

| Artifact | Purpose |
|---|---|
| [Product Brief](_bmad-output/planning-artifacts/product-brief-ToDo-App.md) | The "what + why" — problem, audience, core hypothesis |
| [Brief Distillate](_bmad-output/planning-artifacts/product-brief-ToDo-App-distillate.md) | Token-efficient context for downstream stages |
| [PRD](_bmad-output/planning-artifacts/prd.md) | 48 functional requirements across 8 capability areas; phased delivery; Project Principles + tiebreaker explicit |
| [Architecture](_bmad-output/planning-artifacts/architecture.md) | Tech stack locked; 4 named architectural seams; Gap I-1 semantic-naming fix |
| [UX Design Specification](_bmad-output/planning-artifacts/ux-design-specification.md) | Vintage System 7 visual language; 26 design tokens; 5 component primitives; 4 user-journey flows; full WCAG 2.1 AA strategy |
| [UX Design Mockup (HTML)](_bmad-output/planning-artifacts/ux-design-mockup.html) | Self-contained static visual showcase — open in any browser; no build step |

### Phase 2 — Test Design (System-Level)

| Artifact | Purpose |
|---|---|
| [Test Design — Architecture](_bmad-output/test-artifacts/test-design/test-design-architecture.md) | Risk register (24 risks, 8 high-priority); testability gaps; mitigation plans |
| [Test Design — QA](_bmad-output/test-artifacts/test-design/test-design-qa.md) | 71 test scenarios (28 Unit / 16 Integration / 18 E2E / 9 Manual); priorities P0–P3 |
| [BMAD Handoff](_bmad-output/test-artifacts/test-design/ToDo-App-handoff.md) | TEA → BMAD integration; 8 Story acceptance-criteria amendments (TEA M-1 through M-6) |

### Phase 3 — Stories & Implementation Readiness

| Artifact | Purpose |
|---|---|
| [Epics & Stories](_bmad-output/planning-artifacts/epics.md) | 3 epics, 34 stories with Given/When/Then ACs; full FR coverage; TEA amendments applied |
| [Implementation Readiness Report](_bmad-output/planning-artifacts/implementation-readiness-report-2026-04-29.md) | Cross-document alignment check; status `READY WITH RECOMMENDED PRE-IMPLEMENTATION AMENDMENTS`; 9 amendments applied |

### Phase 4 — Implementation Artifacts

The 34 per-story implementation context files live at [`_bmad-output/implementation-artifacts/`](_bmad-output/implementation-artifacts/). Each story has a `.md` file with: requirements, tasks/subtasks, dev notes, completion notes, file list, and change log. These are the per-story records of "what was built and what was learned."

### Phase 5 — Quality & Security Reviews

| Artifact | Purpose |
|---|---|
| [Security Review](todo-app/docs/security-review.md) | OWASP Top 10 (2021) triage with explicit per-category status; A07 acceptance with rationale |
| [Keyboard Walkthrough](todo-app/docs/keyboard-walkthrough.md) | Manual WCAG 2.1 AA verification path |
| [Usability Test](todo-app/docs/usability-test.md) | Method + targets + result-template for the 5-person first-time-user observation |

### Phase 6 — Process & Methodology

| Artifact | Purpose |
|---|---|
| [CONVENTIONS.md](CONVENTIONS.md) | Pointer to canonical naming/structure/format conventions |
| [DECISIONS-NOT-MADE.md](DECISIONS-NOT-MADE.md) | Catalog of refused features with one-line rationales (re-derive scope under different constraints) |
| [AI-INTEGRATION-LOG.md](AI-INTEGRATION-LOG.md) | Per-stage record of how the human–AI partnership produced each artifact |
| [Trainee Dry-Run](todo-app/docs/trainee-dry-run.md) | Real-trainee validation of the artifact set; ship-gate criterion |

## Status

- **Epic 1 — Use Your List:** ✅ 17/17 stories closed; full UX, four architectural seams, WCAG 2.1 AA-ready
- **Epic 2 — Container & Quality Gates:** ✅ 12/12 stories closed; multi-stage Dockerfile, Compose stack, env validation, pino, security headers, deployment posture, CI pipeline, 130 unit tests at 90%+ coverage, 11 E2E specs, security review
- **Epic 3 — Artifact-Set & Training Identity:** 5/5 stories closed (Story 3.5 awaits real-trainee dry-run before v1 ships)

## License

(TBD — repo is private during the v1 build phase. License to be assigned when v1 ships.)
