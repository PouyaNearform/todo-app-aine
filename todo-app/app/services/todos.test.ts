// @vitest-environment node

import "dotenv/config";
import type { RequestContext } from "~/middleware/request-context";

const hasDb = !!process.env.DATABASE_URL;
const describeIfDb = hasDb ? describe : describe.skip;

function makeCtx(ownerId: string): RequestContext {
  return {
    requestId: crypto.randomUUID(),
    principal: { kind: "browser-key", browserKey: ownerId },
    ownerId,
  };
}

describeIfDb("todos service (integration)", () => {
  let listTodos: typeof import("./todos").listTodos;
  let createTodo: typeof import("./todos").createTodo;
  let toggleComplete: typeof import("./todos").toggleComplete;
  let deleteTodo: typeof import("./todos").deleteTodo;
  let getTodoOwnership: typeof import("./todos").getTodoOwnership;
  let db: typeof import("../../db/client").db;
  let sql: typeof import("../../db/client").sql;
  let todos: typeof import("../../db/schema").todos;

  beforeAll(async () => {
    const services = await import("./todos");
    const client = await import("../../db/client");
    const schema = await import("../../db/schema");
    listTodos = services.listTodos;
    createTodo = services.createTodo;
    toggleComplete = services.toggleComplete;
    deleteTodo = services.deleteTodo;
    getTodoOwnership = services.getTodoOwnership;
    db = client.db;
    sql = client.sql;
    todos = schema.todos;
  });

  afterAll(async () => {
    await sql.end();
  });

  it("returns [] when no todos exist for this owner", async () => {
    const ownerId = crypto.randomUUID();
    const result = await listTodos(makeCtx(ownerId));
    expect(result).toEqual([]);
  });

  it("returns a single todo for the given owner", async () => {
    const ownerId = crypto.randomUUID();
    await db.insert(todos).values({ description: "buy milk", ownerId });
    const result = await listTodos(makeCtx(ownerId));
    expect(result).toHaveLength(1);
    expect(result[0].description).toBe("buy milk");
    expect(result[0].ownerId).toBe(ownerId);
    expect(result[0].completionStatus).toBe(false);
  });

  it("returns multiple todos in created_at DESC order", async () => {
    const ownerId = crypto.randomUUID();
    const older = new Date(Date.now() - 1000);
    const newer = new Date();
    await db
      .insert(todos)
      .values({ description: "older", ownerId, createdAt: older });
    await db
      .insert(todos)
      .values({ description: "newer", ownerId, createdAt: newer });
    const result = await listTodos(makeCtx(ownerId));
    expect(result).toHaveLength(2);
    expect(result[0].description).toBe("newer");
    expect(result[1].description).toBe("older");
  });

  it("returns [] for a foreign ownerId even when other owners have rows", async () => {
    const ownerA = crypto.randomUUID();
    const ownerB = crypto.randomUUID();
    await db
      .insert(todos)
      .values({ description: "A's todo", ownerId: ownerA });
    const result = await listTodos(makeCtx(ownerB));
    expect(result).toEqual([]);
  });

  it("createTodo inserts and returns a row with server-generated createdAt", async () => {
    const ownerId = crypto.randomUUID();
    const id = crypto.randomUUID();
    const created = await createTodo(makeCtx(ownerId), {
      id,
      description: "test create",
    });
    expect(created.id).toBe(id);
    expect(created.description).toBe("test create");
    expect(created.completionStatus).toBe(false);
    expect(created.ownerId).toBe(ownerId);
    expect(created.createdAt).toBeInstanceOf(Date);
  });

  it("createTodo is idempotent: same id returns the same row on retry", async () => {
    const ownerId = crypto.randomUUID();
    const id = crypto.randomUUID();
    const first = await createTodo(makeCtx(ownerId), {
      id,
      description: "first call",
    });
    const second = await createTodo(makeCtx(ownerId), {
      id,
      description: "second call (different desc, ignored on conflict)",
    });
    expect(second.id).toBe(first.id);
    expect(second.description).toBe("first call");
    expect(second.createdAt.getTime()).toBe(first.createdAt.getTime());
  });

  it("createTodo by different owners doesn't interfere", async () => {
    const ownerA = crypto.randomUUID();
    const ownerB = crypto.randomUUID();
    const a = await createTodo(makeCtx(ownerA), {
      id: crypto.randomUUID(),
      description: "A row",
    });
    const b = await createTodo(makeCtx(ownerB), {
      id: crypto.randomUUID(),
      description: "B row",
    });
    expect(a.ownerId).toBe(ownerA);
    expect(b.ownerId).toBe(ownerB);
    const aList = await listTodos(makeCtx(ownerA));
    expect(aList.map((t) => t.id)).toContain(a.id);
    expect(aList.map((t) => t.id)).not.toContain(b.id);
  });

  it("toggleComplete flips false → true and returns the updated row", async () => {
    const ownerId = crypto.randomUUID();
    const created = await createTodo(makeCtx(ownerId), {
      id: crypto.randomUUID(),
      description: "to toggle",
    });
    expect(created.completionStatus).toBe(false);
    const toggled = await toggleComplete(makeCtx(ownerId), created.id, true);
    expect(toggled).not.toBeNull();
    expect(toggled?.completionStatus).toBe(true);
    expect(toggled?.id).toBe(created.id);
  });

  it("toggleComplete is naturally idempotent (true → true is no-op return)", async () => {
    const ownerId = crypto.randomUUID();
    const created = await createTodo(makeCtx(ownerId), {
      id: crypto.randomUUID(),
      description: "idempotent toggle",
    });
    await toggleComplete(makeCtx(ownerId), created.id, true);
    const second = await toggleComplete(makeCtx(ownerId), created.id, true);
    expect(second?.completionStatus).toBe(true);
  });

  it("toggleComplete returns null when id doesn't exist", async () => {
    const ownerId = crypto.randomUUID();
    const result = await toggleComplete(
      makeCtx(ownerId),
      crypto.randomUUID(),
      true,
    );
    expect(result).toBeNull();
  });

  it("toggleComplete returns null when the todo belongs to a different owner", async () => {
    const ownerA = crypto.randomUUID();
    const ownerB = crypto.randomUUID();
    const created = await createTodo(makeCtx(ownerA), {
      id: crypto.randomUUID(),
      description: "A's row",
    });
    const result = await toggleComplete(makeCtx(ownerB), created.id, true);
    expect(result).toBeNull();
  });

  it("getTodoOwnership returns ownerId for an existing row", async () => {
    const ownerId = crypto.randomUUID();
    const created = await createTodo(makeCtx(ownerId), {
      id: crypto.randomUUID(),
      description: "owns this",
    });
    const owner = await getTodoOwnership(created.id);
    expect(owner).toBe(ownerId);
  });

  it("getTodoOwnership returns null for non-existent id", async () => {
    const owner = await getTodoOwnership(crypto.randomUUID());
    expect(owner).toBeNull();
  });

  it("deleteTodo removes the row and returns it", async () => {
    const ownerId = crypto.randomUUID();
    const created = await createTodo(makeCtx(ownerId), {
      id: crypto.randomUUID(),
      description: "to delete",
    });
    const deleted = await deleteTodo(makeCtx(ownerId), created.id);
    expect(deleted).not.toBeNull();
    expect(deleted?.id).toBe(created.id);
    const list = await listTodos(makeCtx(ownerId));
    expect(list.find((t) => t.id === created.id)).toBeUndefined();
  });

  it("deleteTodo returns null for non-existent id (idempotent)", async () => {
    const ownerId = crypto.randomUUID();
    const result = await deleteTodo(makeCtx(ownerId), crypto.randomUUID());
    expect(result).toBeNull();
  });

  it("deleteTodo returns null when row belongs to a different owner", async () => {
    const ownerA = crypto.randomUUID();
    const ownerB = crypto.randomUUID();
    const created = await createTodo(makeCtx(ownerA), {
      id: crypto.randomUUID(),
      description: "A's row",
    });
    const result = await deleteTodo(makeCtx(ownerB), created.id);
    expect(result).toBeNull();
    // Confirm A's row still exists.
    const aList = await listTodos(makeCtx(ownerA));
    expect(aList.map((t) => t.id)).toContain(created.id);
  });
});
