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
