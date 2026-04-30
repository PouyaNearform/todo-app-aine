// @vitest-environment node

import { buildRequestContext } from "./request-context";

const UUID_V4 =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

describe("buildRequestContext", () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("uses the X-Browser-Key header value when present", () => {
    const preset = "11111111-2222-4333-8444-555555555555";
    const req = new Request("http://localhost/api/todos", {
      headers: { "X-Browser-Key": preset },
    });
    const ctx = buildRequestContext(req);
    expect(ctx.principal).toEqual({ kind: "browser-key", browserKey: preset });
    expect(ctx.ownerId).toBe(preset);
    expect(warnSpy).not.toHaveBeenCalled();
  });

  it("generates a server-side fallback UUID when the header is absent", () => {
    const req = new Request("http://localhost/api/todos");
    const ctx = buildRequestContext(req);
    expect(ctx.principal.kind).toBe("browser-key");
    if (ctx.principal.kind === "browser-key") {
      expect(ctx.principal.browserKey).toMatch(UUID_V4);
    }
    expect(ctx.ownerId).toMatch(UUID_V4);
    expect(warnSpy).toHaveBeenCalledTimes(1);
  });

  it("generates a fallback when the header is the empty string", () => {
    const req = new Request("http://localhost/api/todos", {
      headers: { "X-Browser-Key": "" },
    });
    const ctx = buildRequestContext(req);
    if (ctx.principal.kind === "browser-key") {
      expect(ctx.principal.browserKey).toMatch(UUID_V4);
    }
    expect(warnSpy).toHaveBeenCalledTimes(1);
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

  it("emits a structured warning that includes event and path", () => {
    const req = new Request("http://localhost/api/todos");
    buildRequestContext(req);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const line = warnSpy.mock.calls[0][0] as string;
    expect(line).toContain("browser-key.missing");
    expect(line).toContain("/api/todos");
  });
});
