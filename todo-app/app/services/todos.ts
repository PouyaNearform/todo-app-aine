import { desc, eq } from "drizzle-orm";
import { db } from "../../db/client";
import { todos } from "../../db/schema";
import type { RequestContext } from "~/middleware/request-context";
import type { Todo } from "~/types/todo";

export async function listTodos(ctx: RequestContext): Promise<Todo[]> {
  return db
    .select()
    .from(todos)
    .where(eq(todos.ownerId, ctx.ownerId))
    .orderBy(desc(todos.createdAt));
}

export async function createTodo(
  ctx: RequestContext,
  input: { id: string; description: string },
): Promise<Todo> {
  const result = await db
    .insert(todos)
    .values({
      id: input.id,
      description: input.description,
      ownerId: ctx.ownerId,
    })
    .onConflictDoNothing({ target: todos.id })
    .returning();

  if (result.length > 0) return result[0];

  // Conflict path: row with this id already exists (idempotent retry).
  // Look up by id only — the conflict is on the primary key, so the row
  // is uniquely identified without filtering by ownerId.
  const existing = await db
    .select()
    .from(todos)
    .where(eq(todos.id, input.id))
    .limit(1);
  if (existing.length === 0) {
    throw new Error("createTodo: ON CONFLICT path returned no row");
  }
  return existing[0];
}
