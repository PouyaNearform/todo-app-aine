// @vitest-environment node

import "dotenv/config";
import { parseEnvWith } from "./env";

describe("parseEnvWith", () => {
  it("parses a valid env (NODE_ENV unset → defaults to 'development')", () => {
    const env = parseEnvWith({
      DATABASE_URL: "postgres://u:p@h:5432/d",
    });
    expect(env.DATABASE_URL).toBe("postgres://u:p@h:5432/d");
    expect(env.NODE_ENV).toBe("development");
  });

  it("accepts the postgresql:// scheme variant", () => {
    const env = parseEnvWith({
      DATABASE_URL: "postgresql://u:p@h:5432/d",
      NODE_ENV: "production",
    });
    expect(env.DATABASE_URL).toBe("postgresql://u:p@h:5432/d");
    expect(env.NODE_ENV).toBe("production");
  });

  it("throws when DATABASE_URL is missing", () => {
    expect(() => parseEnvWith({})).toThrowError(/DATABASE_URL/);
  });

  it("throws when DATABASE_URL has the wrong protocol", () => {
    expect(() =>
      parseEnvWith({ DATABASE_URL: "mysql://u:p@h:3306/d" }),
    ).toThrowError(/postgres/);
  });

  it("throws when NODE_ENV is outside the enum", () => {
    expect(() =>
      parseEnvWith({
        DATABASE_URL: "postgres://u:p@h:5432/d",
        NODE_ENV: "staging",
      }),
    ).toThrowError(/Invalid environment configuration/);
  });
});
