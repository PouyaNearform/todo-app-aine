// @vitest-environment node

const warnCalls: Array<{ payload: any; msg: string }> = [];

vi.mock("~/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: (payload: any, msg: string) => warnCalls.push({ payload, msg }),
    error: vi.fn(),
  },
}));

import { buildRequestContext } from "./request-context";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("buildRequestContext", () => {
  beforeEach(() => {
    warnCalls.length = 0;
  });

  it("uses the X-Browser-Key header value when present", () => {
    const preset = "11111111-2222-4333-8444-555555555555";
    const req = new Request("http://localhost/api/todos", {
      headers: { "X-Browser-Key": preset },
    });
    const ctx = buildRequestContext(req);
    expect(ctx.principal).toEqual({ kind: "browser-key", browserKey: preset });
    expect(ctx.ownerId).toBe(preset);
    expect(warnCalls).toHaveLength(0);
  });

  it("generates a server-side fallback UUID when the header is absent", () => {
    const req = new Request("http://localhost/api/todos");
    const ctx = buildRequestContext(req);
    expect(ctx.principal.kind).toBe("browser-key");
    if (ctx.principal.kind === "browser-key") {
      expect(ctx.principal.browserKey).toMatch(UUID_V4);
    }
    expect(ctx.ownerId).toMatch(UUID_V4);
    expect(warnCalls).toHaveLength(1);
  });

  it("generates a fallback when the header is the empty string", () => {
    const req = new Request("http://localhost/api/todos", {
      headers: { "X-Browser-Key": "" },
    });
    const ctx = buildRequestContext(req);
    if (ctx.principal.kind === "browser-key") {
      expect(ctx.principal.browserKey).toMatch(UUID_V4);
    }
    expect(warnCalls).toHaveLength(1);
  });

  it("derives ownerId from principal.browserKey", () => {
    const preset = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
    const req = new Request("http://localhost/", {
      headers: { "X-Browser-Key": preset },
    });
    const ctx = buildRequestContext(req);
    expect(ctx.ownerId).toBe(
      ctx.principal.kind === "browser-key" ? ctx.principal.browserKey : "",
    );
  });

  it("generates a unique requestId per call (UUID v4)", () => {
    const preset = "11111111-2222-4333-8444-555555555555";
    const req = new Request("http://localhost/", {
      headers: { "X-Browser-Key": preset },
    });
    const a = buildRequestContext(req);
    const b = buildRequestContext(req);
    expect(a.requestId).toMatch(UUID_V4);
    expect(b.requestId).toMatch(UUID_V4);
    expect(a.requestId).not.toBe(b.requestId);
  });

  it("falls back to the todo-app-browser-key cookie when the X-Browser-Key header is absent", () => {
    const cookieKey = "cookie01-2222-4333-8444-555555555555";
    const req = new Request("http://localhost/", {
      headers: { cookie: `todo-app-browser-key=${cookieKey}` },
    });
    const ctx = buildRequestContext(req);
    if (ctx.principal.kind === "browser-key") {
      expect(ctx.principal.browserKey).toBe(cookieKey);
    }
    expect(ctx.ownerId).toBe(cookieKey);
    // Cookie hit means no fallback warning fires.
    expect(warnCalls).toHaveLength(0);
  });

  it("prefers the X-Browser-Key header over the cookie when both are present", () => {
    const headerKey = "headerff-2222-4333-8444-555555555555";
    const cookieKey = "cookie01-2222-4333-8444-555555555555";
    const req = new Request("http://localhost/", {
      headers: {
        "X-Browser-Key": headerKey,
        cookie: `todo-app-browser-key=${cookieKey}`,
      },
    });
    const ctx = buildRequestContext(req);
    expect(ctx.ownerId).toBe(headerKey);
  });

  it("ignores cookie values from unrelated cookie names", () => {
    const req = new Request("http://localhost/", {
      headers: {
        cookie: "session-id=abc; other=def",
      },
    });
    const ctx = buildRequestContext(req);
    expect(ctx.ownerId).toMatch(UUID_V4);
    expect(warnCalls).toHaveLength(1); // Falls through to fallback.
  });

  it("emits a structured warning that includes event and path", () => {
    const req = new Request("http://localhost/api/todos");
    buildRequestContext(req);
    expect(warnCalls).toHaveLength(1);
    expect(warnCalls[0].payload).toMatchObject({
      event: "browser-key.missing",
      path: "/api/todos",
    });
    expect(warnCalls[0].msg).toContain("X-Browser-Key absent");
  });
});
