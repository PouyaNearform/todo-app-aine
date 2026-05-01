# Story 2.5: Helmet-Style Security Headers

Status: review

## Story

As a security-conscious operator,
I want every server response to include defense-in-depth browser security headers,
so that common browser-side attack vectors (clickjacking, MIME-sniffing, content injection) are mitigated by default — without taking on a Helmet dependency for what amounts to ~10 lines of header setting.

## Acceptance Criteria

Source: `_bmad-output/planning-artifacts/epics.md` § Story 2.5 (lines 608–621).

1. **Given** Story 1.1 is complete, **When** I implement `app/middleware/security-headers.ts` exporting a header-application helper, **Then** every response includes `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY`.
2. **And** `Content-Security-Policy` is set with a permissive-for-v1 policy: `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; frame-ancestors 'none';` — documented for tightening post-v1 (the `'unsafe-inline'`s are required for RR7's hydration scripts + critical CSS injection).
3. **And** `Strict-Transport-Security: max-age=31536000; includeSubDomains` is added when env var `HTTPS_ENABLED=true` (set by reverse proxy in production deploy).
4. **And** API responses (Response.json from action handlers) include the headers via the `withRequestLogging` wrapper — applied to any `Response` instance the handler returns.
5. **And** HTML responses (page renders from loaders) include the headers via root.tsx's `headers()` export — RR7 cascades root headers to all routes.
6. **And** integration test asserts headers present on a sample API action response.

## Tasks / Subtasks

- [ ] **Task 1: Create `app/middleware/security-headers.ts`** (AC 1, 2, 3)
  - [ ] 1.1: Create the middleware:
    ```ts
    export function securityHeaders(): Record<string, string> {
      const headers: Record<string, string> = {
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "same-origin",
        "X-Frame-Options": "DENY",
        "Content-Security-Policy": [
          "default-src 'self'",
          // 'unsafe-inline' required for RR7's inlined hydration scripts.
          // Tighten post-v1 by extracting hydration into a separate file +
          // adding a nonce.
          "script-src 'self' 'unsafe-inline'",
          // 'unsafe-inline' required for critical CSS Vite injects into <head>.
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data:",
          "connect-src 'self'",
          "font-src 'self'",
          // Defense in depth on top of X-Frame-Options.
          "frame-ancestors 'none'",
        ].join("; "),
      };
      if (process.env.HTTPS_ENABLED === "true") {
        headers["Strict-Transport-Security"] =
          "max-age=31536000; includeSubDomains";
      }
      return headers;
    }

    /** Mutates the given response to add security headers. Returns same response. */
    export function applySecurityHeaders(response: Response): Response {
      const headers = securityHeaders();
      for (const [name, value] of Object.entries(headers)) {
        response.headers.set(name, value);
      }
      return response;
    }
    ```
  - [ ] 1.2: **CSP rationale** — `'unsafe-inline'` is required for RR7's framework-mode hydration. RR7 inlines a `<script>` block with serialized loader data; CSP without `'unsafe-inline'` would block it. Tightening is a post-v1 concern (would require nonce-based CSP + RR7 plugin support). Document the tradeoff inline.
  - [ ] 1.3: **`frame-ancestors 'none'`** is the modern equivalent of `X-Frame-Options: DENY`. Setting both is defense in depth — older browsers honor X-Frame-Options; modern ones honor CSP frame-ancestors.
  - [ ] 1.4: **HSTS only when `HTTPS_ENABLED=true`** — sending HSTS over HTTP is a dev-mode footgun (browsers may pin HSTS to dev hostnames). The reverse proxy in production sets the env var; local dev (HTTP) doesn't.

- [ ] **Task 2: Apply headers in `withRequestLogging` for action Response objects** (AC 4)
  - [ ] 2.1: Modify `app/lib/with-logging.ts`. Import `applySecurityHeaders`. After the handler returns, if the result is a `Response`, apply headers:
    ```ts
    const result = await handler({ ...args, ctx });
    // ... existing logging ...
    if (result instanceof Response) {
      applySecurityHeaders(result);
    }
    return result;
    ```
  - [ ] 2.2: This catches all action handlers (which return Response.json). Loaders that return plain objects (e.g., the home loader's `ok({ todos })`) get serialized by RR7 into the HTML stream — those use root.tsx's `headers()` export instead.

- [ ] **Task 3: Add `headers()` export to root.tsx** (AC 5)
  - [ ] 3.1: Modify `app/root.tsx`. Add an `export function headers()` that returns `securityHeaders()`:
    ```ts
    import { securityHeaders } from "~/middleware/security-headers";
    // ...
    export function headers() {
      return securityHeaders();
    }
    ```
  - [ ] 3.2: RR7 framework mode applies a route's `headers` export to the route's HTML response. Defining it at root.tsx means every page gets the headers (since every page renders inside root). Per-route headers override root's; we don't override anywhere in v1.

- [ ] **Task 4: Integration test for headers on action response** (AC 6)
  - [ ] 4.1: Create `app/middleware/security-headers.test.ts` (node env). Tests:
    - `securityHeaders()` returns the four base headers
    - `securityHeaders()` includes HSTS when `HTTPS_ENABLED=true`
    - `securityHeaders()` excludes HSTS when `HTTPS_ENABLED` unset or false
    - `applySecurityHeaders(response)` mutates and returns the same response with headers set
  - [ ] 4.2: Add an assertion to `app/routes/api.todos.test.ts` (or extend an existing test): after a successful `action(args)`, the returned `Response` has the security headers set. Single test confirms the wrapper-level integration.

- [ ] **Task 5: Verify gates + container smoke + commit**
  - [ ] 5.1: `pnpm typecheck` exit 0.
  - [ ] 5.2: `pnpm test` ~129+ passing (125 prior + 4-5 new).
  - [ ] 5.3: `pnpm dev`; curl `-i` the home page and an API endpoint — confirm headers visible in the response.
  - [ ] 5.4: `pnpm check:gap-i1` exit 0.
  - [ ] 5.5: `git add . && git commit -m "Story 2.5: helmet-style security headers"`.

## Dev Notes

### Why this story matters

**No Helmet dependency.** Helmet is the standard Node middleware for security headers, but it's a 50+ kB dep that does what 30 lines of plain header-setting does. Per the lead differentiator (minimal-dependency profile + documented refusals): hand-roll the headers. The trainee can read every header set in one file.

After Story 2.5, every server response carries the AA-compliant defense-in-depth headers. Story 2.11 (security review with documented triage) will validate against the OWASP Top 10 — the headers here knock out clickjacking, MIME-sniffing, and basic CSP violations as default-on mitigations.

### Architectural context

- **Helmet rejected (architecture line 182):** "Helmet-style security headers" — the language is *helmet-style*, not helmet itself. Hand-rolled.
- **Headers per architecture line 182:** `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`, `X-Frame-Options: DENY`. Permissive CSP for v1, no third-party scripts, same-origin only (no CORS).
- **HSTS conditional on `HTTPS_ENABLED`** — Story 2.6 (private-URL deployment) will document the reverse-proxy setup that sets this env var.
- **CSP `'unsafe-inline'` for v1** — RR7's hydration scripts are inlined. Tightening to nonce-based CSP requires RR7 plugin work (post-v1). Documented inline.
- **`frame-ancestors 'none'` + `X-Frame-Options: DENY` together** — defense in depth across browser eras.

### Carry-over

From **Story 2.4**: `withRequestLogging` is the per-handler wrapper. Story 2.5 adds the `applySecurityHeaders(result)` call inside it for Response-returning handlers.
From **Story 2.3**: env vars are validated at process start. The `HTTPS_ENABLED` check in security-headers reads `process.env.HTTPS_ENABLED` directly (it's optional + boolean-like; doesn't merit a Zod schema entry).

### Files being modified/created

- `app/middleware/security-headers.ts` — NEW (~30 lines)
- `app/middleware/security-headers.test.ts` — NEW (4 tests)
- `app/lib/with-logging.ts` — MODIFIED (apply headers on Response result)
- `app/root.tsx` — MODIFIED (add `headers()` export)
- `app/routes/api.todos.test.ts` — MODIFIED (1 new assertion in the success-case test)

### LLM-developer guardrails

- **Don't add Helmet.** Hand-rolled is the contract.
- **Don't tighten CSP without verifying RR7 hydration still works.** `'unsafe-inline'` is load-bearing for the framework's inlined scripts.
- **Don't always send HSTS.** Sending HSTS over HTTP can pin browsers to a hostname incorrectly (subsequent dev attempts get blocked). Conditional on `HTTPS_ENABLED=true`.
- **Don't add per-route header overrides** unless a specific route needs to (none do in v1).
- **Don't apply security headers to streaming responses inside the route handlers.** The wrapper handles the action case; root.tsx handles the loader case; both cover v1's surface.

### Cross-cutting AC compliance (Epic 2)

- ✓ Helmet-style security headers applied ✓
- ✓ OWASP Top 10 review: deferred to Story 2.11
- ✓ All container images run as non-root (Story 2.1) ✓
- ✓ pino structured JSON to stdout (Story 2.4) ✓
- ✓ env validation (Story 2.3) ✓

### References

- `_bmad-output/planning-artifacts/epics.md` § "Story 2.5" lines 608–621
- `_bmad-output/planning-artifacts/architecture.md` line 182 (locked header list, CSP permissive-for-v1, same-origin only)
- Story 2.4 file: withRequestLogging wrapper being extended

## Dev Agent Record

### Agent Model Used
Claude Opus 4.7.

### Debug Log References
(Populated.)

### Completion Notes List
(Populated.)

### File List
(Populated.)

### Change Log
(Populated.)
