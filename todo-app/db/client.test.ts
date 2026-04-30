// @vitest-environment node

import "dotenv/config";

const hasDb = !!process.env.DATABASE_URL;
const describeIfDb = hasDb ? describe : describe.skip;

describeIfDb("db/client (integration)", () => {
  let db: typeof import("./client").db;
  let sql: typeof import("./client").sql;
  let todos: typeof import("./schema").todos;

  beforeAll(async () => {
    const client = await import("./client");
    const schema = await import("./schema");
    db = client.db;
    sql = client.sql;
    todos = schema.todos;
  });

  afterAll(async () => {
    await sql.end();
  });

  it("connects and runs SELECT against the todos table", async () => {
    const rows = await db.select().from(todos);
    expect(Array.isArray(rows)).toBe(true);
  });
});
