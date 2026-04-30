import { and, desc, eq } from "drizzle-orm";
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

// Ownership-bypass lookup. Used ONLY by action handlers to feed
// checkOwnership(ctx, resourceOwnerId). All other reads filter by ownerId.
export async function getTodoOwnership(id: string): Promise<string | null> {
  const rows = await db
    .select({ ownerId: todos.ownerId })
    .from(todos)
    .where(eq(todos.id, id))
    .limit(1);
  return rows.length > 0 ? rows[0].ownerId : null;
}

export async function toggleComplete(
  ctx: RequestContext,
  id: string,
  completed: boolean,
): Promise<Todo | null> {
  const result = await db
    .update(todos)
    .set({ completionStatus: completed })
    .where(and(eq(todos.id, id), eq(todos.ownerId, ctx.ownerId)))
    .returning();
  return result.length > 0 ? result[0] : null;
}

export async function deleteTodo(
  ctx: RequestContext,
  id: string,
): Promise<Todo | null> {
  const result = await db
    .delete(todos)
    .where(and(eq(todos.id, id), eq(todos.ownerId, ctx.ownerId)))
    .returning();
  return result.length > 0 ? result[0] : null;
}
