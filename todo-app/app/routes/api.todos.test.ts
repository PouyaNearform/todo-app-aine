// @vitest-environment node

vi.mock("~/services/todos", () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
}));
vi.mock("../../db/client", () => ({ db: {}, sql: { end: vi.fn() } }));

import { action } from "./api.todos";
import { createTodo } from "~/services/todos";

const validId = "11111111-2222-4333-8444-555555555555";

function actionArgs(body: unknown, browserKey = validId) {
  return {
    request: new Request("http://localhost/api/todos", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Browser-Key": browserKey,
      },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
    params: {},
    context: {},
  } as unknown as Parameters<typeof action>[0];
}

describe("POST /api/todos action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 400 with VALIDATION code when body is not JSON", async () => {
    const res = await action(actionArgs("not json"));
    expect(res.status).toBe(400);
    const env = await res.json();
    expect(env.ok).toBe(false);
    expect(env.error.code).toBe("VALIDATION");
  });

  it("returns 400 with VALIDATION code when payload fails Zod", async () => {
    const res = await action(actionArgs({ id: "not-a-uuid", description: "" }));
    expect(res.status).toBe(400);
    const env = await res.json();
    expect(env.ok).toBe(false);
    expect(env.error.code).toBe("VALIDATION");
    expect(env.error.fieldErrors).toBeDefined();
  });

  it("returns 201 with envelope on valid payload", async () => {
    const fakeRow = {
      id: validId,
      description: "buy milk",
      completionStatus: false,
      createdAt: new Date().toISOString(),
      ownerId: validId,
    };
    vi.mocked(createTodo).mockResolvedValue(fakeRow as never);
    const res = await action(
      actionArgs({ id: validId, description: "buy milk" }),
    );
    expect(res.status).toBe(201);
    const env = await res.json();
    expect(env.ok).toBe(true);
    expect(env.data.id).toBe(validId);
    // Story 2.5: security headers applied via withRequestLogging wrapper.
    expect(res.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(res.headers.get("X-Frame-Options")).toBe("DENY");
    expect(res.headers.get("Referrer-Policy")).toBe("same-origin");
    expect(res.headers.get("Content-Security-Policy")).toContain(
      "default-src 'self'",
    );
  });

  it("returns 500 with INTERNAL code when service throws", async () => {
    vi.mocked(createTodo).mockRejectedValue(new Error("DB down"));
    const res = await action(
      actionArgs({ id: validId, description: "buy milk" }),
    );
    expect(res.status).toBe(500);
    const env = await res.json();
    expect(env.ok).toBe(false);
    expect(env.error.code).toBe("INTERNAL");
  });
});
