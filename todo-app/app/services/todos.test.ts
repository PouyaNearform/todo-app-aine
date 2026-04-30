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

describeIfDb("listTodos (integration)", () => {
  let listTodos: typeof import("./todos").listTodos;
  let db: typeof import("../../db/client").db;
  let sql: typeof import("../../db/client").sql;
  let todos: typeof import("../../db/schema").todos;

  beforeAll(async () => {
    const services = await import("./todos");
    const client = await import("../../db/client");
    const schema = await import("../../db/schema");
    listTodos = services.listTodos;
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
});
