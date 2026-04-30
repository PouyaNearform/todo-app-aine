import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "../app/lib/env";
import * as schema from "./schema";

const queryClient = postgres(env.DATABASE_URL);

export const db = drizzle(queryClient, { schema });
export const sql = queryClient;
export type DB = typeof db;
