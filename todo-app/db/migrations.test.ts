// @vitest-environment node

import "dotenv/config";

const hasDb = !!process.env.DATABASE_URL;
const describeIfDb = hasDb ? describe : describe.skip;

type ColumnRow = {
  column_name: string;
  data_type: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
};

type IndexRow = { indexname: string; indexdef: string };

describeIfDb("Test 1.4-INT-001: schema-state assertions (TEA M-1)", () => {
  let sql: typeof import("./client").sql;

  beforeAll(async () => {
    const client = await import("./client");
    sql = client.sql;
  });

  afterAll(async () => {
    await sql.end();
  });

  it("todos.id is uuid NOT NULL with gen_random_uuid() default", async () => {
    const rows = (await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'todos' AND column_name = 'id'
    `) as unknown as ColumnRow[];
    expect(rows).toHaveLength(1);
    expect(rows[0].data_type).toBe("uuid");
    expect(rows[0].is_nullable).toBe("NO");
    expect(rows[0].column_default).toContain("gen_random_uuid()");
  });

  it("todos.description is character varying NOT NULL", async () => {
    const rows = (await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'todos' AND column_name = 'description'
    `) as unknown as ColumnRow[];
    expect(rows).toHaveLength(1);
    expect(rows[0].data_type).toBe("character varying");
    expect(rows[0].is_nullable).toBe("NO");
  });

  it("todos.completion_status is boolean NOT NULL with default false", async () => {
    const rows = (await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'todos' AND column_name = 'completion_status'
    `) as unknown as ColumnRow[];
    expect(rows).toHaveLength(1);
    expect(rows[0].data_type).toBe("boolean");
    expect(rows[0].is_nullable).toBe("NO");
    expect(rows[0].column_default).toBe("false");
  });

  it("todos.created_at is timestamptz NOT NULL with default now()", async () => {
    const rows = (await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'todos' AND column_name = 'created_at'
    `) as unknown as ColumnRow[];
    expect(rows).toHaveLength(1);
    expect(rows[0].data_type).toBe("timestamp with time zone");
    expect(rows[0].is_nullable).toBe("NO");
    expect(rows[0].column_default).toContain("now()");
  });

  it("todos.owner_id is uuid AND nullable (the seam-shape contract)", async () => {
    const rows = (await sql`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'todos' AND column_name = 'owner_id'
    `) as unknown as ColumnRow[];
    expect(rows).toHaveLength(1);
    expect(rows[0].data_type).toBe("uuid");
    expect(rows[0].is_nullable).toBe("YES");
  });

  it("idx_todos_owner_id_created_at index exists on (owner_id, created_at DESC)", async () => {
    const rows = (await sql`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'todos' AND indexname = 'idx_todos_owner_id_created_at'
    `) as unknown as IndexRow[];
    expect(rows).toHaveLength(1);
    expect(rows[0].indexdef).toMatch(/owner_id/);
    expect(rows[0].indexdef).toMatch(/created_at DESC/);
  });
});
