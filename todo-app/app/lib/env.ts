import { z } from "zod";
import { logger } from "~/lib/logger";

const EnvSchema = z.object({
  DATABASE_URL: z
    .string()
    .min(1, "DATABASE_URL is required")
    .refine(
      (v) => v.startsWith("postgres://") || v.startsWith("postgresql://"),
      "DATABASE_URL must start with postgres:// or postgresql://",
    ),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
});

export type Env = z.infer<typeof EnvSchema>;

// Test-friendly: parses an arbitrary source rather than process.env.
// Same schema; same error shape.
export function parseEnvWith(source: Record<string, unknown>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    throw new Error(
      `Invalid environment configuration: ${JSON.stringify(fieldErrors)}`,
    );
  }
  return result.data;
}

function parseEnv(): Env {
  const result = EnvSchema.safeParse(process.env);
  if (!result.success) {
    const fieldErrors = result.error.flatten().fieldErrors;
    logger.error(
      { event: "env.invalid", fieldErrors },
      "Invalid environment configuration",
    );
    throw new Error(
      `Invalid environment configuration: ${JSON.stringify(fieldErrors)}`,
    );
  }
  return result.data;
}

// Validate immediately at module load. The first server-side import of this
// module triggers validation — by the time any loader/action runs, env has
// already been validated (or the process has thrown).
export const env = parseEnv();
