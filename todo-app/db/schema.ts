import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const todos = pgTable(
  "todos",
  {
    id: uuid("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    description: varchar("description").notNull(),
    completionStatus: boolean("completion_status").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ownerId: uuid("owner_id"),
  },
  (table) => [
    index("idx_todos_owner_id_created_at").on(
      table.ownerId,
      table.createdAt.desc(),
    ),
  ],
);

export type Todo = typeof todos.$inferSelect;
export type NewTodo = typeof todos.$inferInsert;
