// Re-export the schema-inferred Todo type so server (services, loaders) and
// client (components, optimistic store) consume the same definition without
// reaching into db/schema.ts directly. Type-only re-export is erased at build,
// so the client bundle stays free of Drizzle/Postgres code.

export type { Todo, NewTodo } from "../../db/schema";
