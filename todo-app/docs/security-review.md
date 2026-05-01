# Security Review — v1

OWASP Top 10 (2021) coverage with explicit per-category triage. Each entry is one of: **N/A** (not applicable to v1's surface), **Mitigated** (active control in place), or **Accepted** (risk acknowledged with written rationale).

The browser-key model is the load-bearing assumption: it's an **identity proxy, not a security boundary** (architecture line 179). A user who can reach the URL can create todos under their own browser key; if their UUIDv4 collides with another user's (cosmically improbable: 1 in 2^122), they'd see each other's lists. That's the v1 risk profile by design — see `README.md` § Deployment for the private-URL stance.

## A01 Broken Access Control

**Mitigated.** Architectural seams enforce the access-control contract:

- `app/middleware/ownership-check.ts` runs `checkOwnership(ctx, resourceOwnerId)` in every action handler before any service-layer call. The Story 1.6 pattern-verification test scans `app/routes/**/*.{ts,tsx}` and fails CI if any action handler is missing the call.
- `scripts/check-gap-i1.sh` (Story 1.5) statically enforces that service-layer code consumes `ctx.ownerId`, never `ctx.principal.browserKey`. CI step `pnpm check:gap-i1` fails the build on any match.
- Service-layer mutations filter by `WHERE id AND owner_id = ctx.ownerId`. Defense in depth: even if `checkOwnership` is bypassed, the WHERE clause prevents cross-owner mutations.
- Cross-owner isolation verified end-to-end via curl (Story 1.11 commit `c1455b5`): Owner B's PATCH attempt against Owner A's row returns 404.

The `ownership-check` is a no-op pass-through in v1 (the browser key is an identity proxy, not an authenticated user). When auth lands, only the middleware body changes — no service-layer or route-handler changes. Architecture's seam discipline is what makes this swap safe.

## A02 Cryptographic Failures

**N/A.** v1 has no secret data at rest beyond the database password (which is set via env var per Story 2.3, not hardcoded). No PII, no payment data, no auth tokens. Browser keys are random UUIDs with no inherent secret content.

The `Strict-Transport-Security` header is conditionally emitted when `HTTPS_ENABLED=true` (Story 2.5) — the reverse proxy in deployment owns TLS termination. v1 doesn't ship its own TLS layer.

## A03 Injection

**Mitigated.** All database access goes through Drizzle ORM with parameterized queries:

- `db.select().from(todos).where(eq(todos.ownerId, ctx.ownerId))` — `ctx.ownerId` is bound as a parameter, never string-interpolated.
- `db.insert(todos).values({ id, description, ownerId })` — same pattern.
- `db.update(todos).set({ completionStatus }).where(...)` — same pattern.
- `db.delete(todos).where(...)` — same pattern.

No raw SQL anywhere in `app/`. The only raw SQL files are under `db/migrations/` (drizzle-kit generated, committed for trainee inspection, not parameter-bearing).

Zod schemas (`app/lib/validation.ts`) validate payload shapes at every action boundary:
- `TodoCreateSchema`: `id` must be UUID, `description` 1–256 chars
- `TodoUpdateSchema`: `completed` must be boolean

Validation failures return `{ ok: false, error: { code: "VALIDATION", fieldErrors } }` before the service layer is invoked.

## A04 Insecure Design

**Mitigated by deliberate scope.** v1's design refusals are documented:

- No third-party SDKs (Sentry, analytics, etc.) → no supply chain to compromise (architecture line 397)
- No outbound HTTP from the server → no SSRF surface (see A10)
- No file uploads → no upload-handling vulnerabilities
- No user-uploaded HTML → no XSS via uploads
- No multi-tenant data segregation beyond `owner_id` (the seam) — and the README explicitly stipulates v1 is private-URL deployment only (Story 2.6)

## A05 Security Misconfiguration

**Mitigated.** Story 2.5 adds Helmet-style headers via `app/middleware/security-headers.ts`:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: same-origin`
- `X-Frame-Options: DENY`
- `Content-Security-Policy` (default-src 'self' + necessary `'unsafe-inline'` for RR7 hydration scripts; documented for tightening post-v1)
- `frame-ancestors 'none'` (CSP equivalent of X-Frame-Options, defense in depth)
- `Strict-Transport-Security` (conditional on `HTTPS_ENABLED=true`)

Container hygiene per Story 2.1:
- `node:22-alpine` (no debian-bookworm bloat)
- Multi-stage build separating build tooling from runtime
- `USER node` (uid 1000, non-root)
- No `latest` tags
- Production `node_modules` only in runtime image

Compose hygiene per Story 2.2:
- Bridge network only (no host networking)
- Healthcheck-gated dependencies
- Named volume for PGDATA (no anonymous volumes)
- POSTGRES_PASSWORD parameterized via env

## A06 Vulnerable and Outdated Components

**Mitigated by lockfile + audit cadence.** All dependencies pinned via `pnpm-lock.yaml`. The `pnpm install --frozen-lockfile` in the Dockerfile + CI ensures the same versions land in every environment.

Periodic `pnpm audit` is recommended at release cadence (manually until Story 3.x adds CI scheduling). v1's prod-dep tree is small (~10 direct prod deps) — review surface is manageable.

## A07 Identification and Authentication Failures

**Accepted with documented rationale.** v1 has no authentication. The browser key is an opaque per-browser identity proxy (`crypto.randomUUID()`, persisted to localStorage and cookie per Story 2.9). It is **not** a security boundary:

- Anyone with the URL can create todos under their own browser key.
- A leaked browser key would let another person see/mutate that browser's list (probability of this happening: someone shoulder-surfing devtools or clipboard).
- There is no recovery flow — losing localStorage means losing the list.

This risk profile is **explicitly accepted** for v1 because the deployment posture (private-URL only — Story 2.6) keeps the surface small. The architecture's seam discipline ensures auth can be added later by replacing the `ownership-check` middleware body, with zero downstream code changes.

## A08 Software and Data Integrity Failures

**Mitigated by minimal-dependency stance.** No third-party SDKs, no auto-updaters, no plugin systems. Server-side dependencies are pinned via `pnpm-lock.yaml` + `--frozen-lockfile`. The Dockerfile copies only the lockfile + package.json before installing — no install-time side channels.

Idempotent migrations (`db/migrate.mjs`) run on every container start; rerunning is a no-op (drizzle's metadata table tracks applied migrations). No way to silently skip a migration.

## A09 Security Logging and Monitoring Failures

**Mitigated.** pino-structured JSON logging to stdout (Story 2.4). Per architecture line 399:
- Every loader/action emits `request.start` and `request.end` (or `request.failed` on throw).
- Standard fields: `requestId`, `browserKey` (truncated to 8 chars for privacy hygiene), `route`, `method`, `durationMs`.
- env validation errors logged at startup (Story 2.3) with structured `event: "env.invalid"`.
- Browser-key-missing fallbacks logged with `event: "browser-key.missing"` + path.

No third-party log aggregator SDK. Operators pipe stdout to whatever aggregator they choose (Loki, journald, ELK, etc.) — the structured-JSON shape works with all of them.

## A10 Server-Side Request Forgery (SSRF)

**N/A.** The server makes ZERO outbound HTTP requests. The only network calls are:
- Inbound from clients
- Outbound to the local Postgres (over the Compose bridge network, not the internet)

There is no fetch/got/axios/got call anywhere in `app/services/` or middleware. No webhook ingestion, no third-party API calls, no outbound integration.

## CSRF

Not part of OWASP Top 10 (2021) but worth explicit triage. **Mitigated** by the requirement of the custom `X-Browser-Key` header (architecture line 182). Cross-origin form posts CANNOT send custom headers without a CORS preflight; all our mutations require the header to be sent. The cookie fallback (Story 2.9) is `SameSite=Strict`, also blocking cross-origin send.

No anti-CSRF token is added — the custom-header requirement is the deliberate refusal.

## Summary

| Category | Status |
|---|---|
| A01 Broken Access Control | Mitigated (ownership-check seam + Gap I-1 grep + WHERE filter) |
| A02 Cryptographic Failures | N/A (no secrets at rest) |
| A03 Injection | Mitigated (Drizzle parameterized + Zod) |
| A04 Insecure Design | Mitigated by scope refusals |
| A05 Security Misconfiguration | Mitigated (Helmet headers + container hygiene) |
| A06 Vulnerable Components | Mitigated (lockfile + audit cadence) |
| A07 Identification & Auth Failures | **Accepted** — browser key as identity proxy; private-URL deployment posture |
| A08 Software/Data Integrity | Mitigated (no third-party SDKs; pinned deps; idempotent migrations) |
| A09 Logging & Monitoring | Mitigated (pino structured JSON to stdout) |
| A10 SSRF | N/A (no outbound HTTP from the server) |
| CSRF | Mitigated (custom X-Browser-Key header + SameSite=Strict cookie) |

**Sign-off required from Pouya before v1 ships.** This document is the artifact-level acknowledgement of the A07 acceptance — anything that was not "Mitigated" is either truly N/A or has a written rationale here.

Reference for the A07 acceptance specifically: PRD's "Project Principles" section + README's Deployment section. Both make the private-URL posture explicit.
