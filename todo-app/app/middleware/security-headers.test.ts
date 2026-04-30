// @vitest-environment node

import { applySecurityHeaders, securityHeaders } from "./security-headers";

describe("securityHeaders", () => {
  const originalEnv = process.env.HTTPS_ENABLED;

  afterEach(() => {
    if (originalEnv === undefined) {
      delete process.env.HTTPS_ENABLED;
    } else {
      process.env.HTTPS_ENABLED = originalEnv;
    }
  });

  it("returns the four base headers", () => {
    delete process.env.HTTPS_ENABLED;
    const h = securityHeaders();
    expect(h["X-Content-Type-Options"]).toBe("nosniff");
    expect(h["Referrer-Policy"]).toBe("same-origin");
    expect(h["X-Frame-Options"]).toBe("DENY");
    expect(h["Content-Security-Policy"]).toContain("default-src 'self'");
    expect(h["Content-Security-Policy"]).toContain("frame-ancestors 'none'");
  });

  it("excludes HSTS when HTTPS_ENABLED is unset", () => {
    delete process.env.HTTPS_ENABLED;
    const h = securityHeaders();
    expect(h["Strict-Transport-Security"]).toBeUndefined();
  });

  it("excludes HSTS when HTTPS_ENABLED is anything other than 'true'", () => {
    process.env.HTTPS_ENABLED = "false";
    expect(securityHeaders()["Strict-Transport-Security"]).toBeUndefined();
    process.env.HTTPS_ENABLED = "1";
    expect(securityHeaders()["Strict-Transport-Security"]).toBeUndefined();
  });

  it("includes HSTS when HTTPS_ENABLED='true'", () => {
    process.env.HTTPS_ENABLED = "true";
    const h = securityHeaders();
    expect(h["Strict-Transport-Security"]).toBe(
      "max-age=31536000; includeSubDomains",
    );
  });
});

describe("applySecurityHeaders", () => {
  it("mutates the response in place and returns it", () => {
    const res = new Response("body", { status: 200 });
    const same = applySecurityHeaders(res);
    expect(same).toBe(res);
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("Referrer-Policy")).toBe("same-origin");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Content-Security-Policy")).toContain(
      "default-src 'self'",
    );
  });
});
