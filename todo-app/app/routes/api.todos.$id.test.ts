// @vitest-environment node

vi.mock("~/services/todos", () => ({
  listTodos: vi.fn(),
  createTodo: vi.fn(),
  toggleComplete: vi.fn(),
  getTodoOwnership: vi.fn(),
}));
vi.mock("../../db/client", () => ({ db: {}, sql: { end: vi.fn() } }));

import { action } from "./api.todos.$id";
import { getTodoOwnership, toggleComplete } from "~/services/todos";

const validId = "11111111-2222-4333-8444-555555555555";
const validTodoId = "22222222-3333-4444-9555-666666666666";

function actionArgs(
  body: unknown,
  options: {
    method?: string;
    id?: string;
    browserKey?: string;
  } = {},
) {
  const method = options.method ?? "PATCH";
  const id = options.id ?? validTodoId;
  return {
    request: new Request(`http://localhost/api/todos/${id}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Browser-Key": options.browserKey ?? validId,
      },
      body:
        method === "GET" || method === "DELETE"
          ? undefined
          : typeof body === "string"
            ? body
            : JSON.stringify(body),
    }),
    params: { id },
    context: {},
  } as unknown as Parameters<typeof action>[0];
}

describe("PATCH /api/todos/:id action", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns 405 for methods other than PATCH", async () => {
    const res = await action(actionArgs({ completed: true }, { method: "POST" }));
    expect(res.status).toBe(405);
  });

  it("returns 400 with VALIDATION when body is not JSON", async () => {
    const res = await action(actionArgs("not json"));
    expect(res.status).toBe(400);
    const env = await res.json();
    expect(env.error.code).toBe("VALIDATION");
  });

  it("returns 400 when payload fails Zod (completed is a string)", async () => {
    const res = await action(actionArgs({ completed: "yes" }));
    expect(res.status).toBe(400);
    const env = await res.json();
    expect(env.error.code).toBe("VALIDATION");
  });

  it("returns 404 when the todo doesn't exist", async () => {
    vi.mocked(getTodoOwnership).mockResolvedValue(null);
    const res = await action(actionArgs({ completed: true }));
    expect(res.status).toBe(404);
    const env = await res.json();
    expect(env.error.code).toBe("NOT_FOUND");
  });

  it("returns 200 with envelope on successful PATCH", async () => {
    vi.mocked(getTodoOwnership).mockResolvedValue(validId);
    vi.mocked(toggleComplete).mockResolvedValue({
      id: validTodoId,
      description: "row",
      completionStatus: true,
      createdAt: new Date(),
      ownerId: validId,
    } as never);
    const res = await action(actionArgs({ completed: true }));
    expect(res.status).toBe(200);
    const env = await res.json();
    expect(env.ok).toBe(true);
    expect(env.data.completionStatus).toBe(true);
  });

  it("returns 404 when toggleComplete returns null (race or cross-owner)", async () => {
    vi.mocked(getTodoOwnership).mockResolvedValue(validId);
    vi.mocked(toggleComplete).mockResolvedValue(null);
    const res = await action(actionArgs({ completed: true }));
    expect(res.status).toBe(404);
  });

  it("returns 500 with INTERNAL when toggleComplete throws", async () => {
    vi.mocked(getTodoOwnership).mockResolvedValue(validId);
    vi.mocked(toggleComplete).mockRejectedValue(new Error("DB down"));
    const res = await action(actionArgs({ completed: true }));
    expect(res.status).toBe(500);
    const env = await res.json();
    expect(env.error.code).toBe("INTERNAL");
  });
});
