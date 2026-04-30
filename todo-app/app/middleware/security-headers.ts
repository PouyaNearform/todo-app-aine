// Helmet-style security headers — hand-rolled per architecture line 182's
// "no third-party SDK" stance. Applied via the withRequestLogging wrapper
// (for action Responses) and root.tsx's headers() export (for HTML pages).

export function securityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "X-Frame-Options": "DENY",
    "Content-Security-Policy": [
      "default-src 'self'",
      // 'unsafe-inline' is required for RR7's inlined hydration scripts.
      // Tighten post-v1 by extracting hydration + adding nonce-based CSP.
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

/** Mutates the given response to add security headers; returns the same response. */
export function applySecurityHeaders(response: Response): Response {
  const headers = securityHeaders();
  for (const [name, value] of Object.entries(headers)) {
    response.headers.set(name, value);
  }
  return response;
}
