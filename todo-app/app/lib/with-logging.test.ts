// @vitest-environment node

const calls: Array<{ level: string; payload: any; msg: string }> = [];

vi.mock("~/lib/logger", () => ({
  logger: {
    info: (payload: any, msg: string) =>
      calls.push({ level: "info", payload, msg }),
    warn: (payload: any, msg: string) =>
      calls.push({ level: "warn", payload, msg }),
    error: (payload: any, msg: string) =>
      calls.push({ level: "error", payload, msg }),
  },
  truncateBrowserKey: (k: string) => k.slice(0, 8),
}));

import { withRequestLogging } from "./with-logging";

describe("withRequestLogging", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("emits request.start and request.end with the standard fields on success", async () => {
    const handler = vi.fn(async () => ({ ok: true as const, data: 42 }));
    const wrapped = withRequestLogging<{ request: Request }, unknown>(
      "GET /",
      handler,
    );
    const result = await wrapped({
      request: new Request("http://localhost/", {
        headers: { "X-Browser-Key": "11111111-2222-4333-8444-555555555555" },
      }),
    });
    expect(result).toEqual({ ok: true, data: 42 });
    expect(calls).toHaveLength(2);
    expect(calls[0].payload).toMatchObject({
      event: "request.start",
      route: "GET /",
      method: "GET",
      browserKey: "11111111",
    });
    expect(calls[0].payload.requestId).toMatch(/^[0-9a-f-]{36}$/);
    expect(calls[1].payload).toMatchObject({
      event: "request.end",
      route: "GET /",
      method: "GET",
      browserKey: "11111111",
    });
    expect(typeof calls[1].payload.durationMs).toBe("number");
  });

  it("emits request.failed and rethrows when handler throws", async () => {
    const handler = vi.fn(async () => {
      throw new Error("boom");
    });
    const wrapped = withRequestLogging<{ request: Request }, unknown>(
      "POST /api/todos",
      handler,
    );
    await expect(
      wrapped({
        request: new Request("http://localhost/api/todos", {
          method: "POST",
          headers: {
            "X-Browser-Key": "abcdef12-3456-4789-8abc-deadbeef1234",
          },
        }),
      }),
    ).rejects.toThrow("boom");
    expect(calls).toHaveLength(2);
    expect(calls[0].payload.event).toBe("request.start");
    expect(calls[1].payload.event).toBe("request.failed");
    expect(calls[1].level).toBe("error");
    expect(calls[1].payload.err).toBe("Error: boom");
  });

  it("passes the built RequestContext into the handler args", async () => {
    const handler = vi.fn(async (args: any) => args.ctx.ownerId);
    const wrapped = withRequestLogging<{ request: Request }, string>(
      "GET /",
      handler,
    );
    const result = await wrapped({
      request: new Request("http://localhost/", {
        headers: { "X-Browser-Key": "deadbeef-0000-4000-8000-000000000000" },
      }),
    });
    expect(result).toBe("deadbeef-0000-4000-8000-000000000000");
  });
});
