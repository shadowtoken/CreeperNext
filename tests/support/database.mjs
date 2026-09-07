import nextEnv from "@next/env";
import { randomUUID } from "node:crypto";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";

export function validateTestDatabaseUrl(value) {
  try {
    const url = new URL(value ?? "");
    if (
      !["postgres:", "postgresql:"].includes(url.protocol)
      || !url.hostname || !url.username
      || !/^\/[a-z0-9_]+_test$/.test(url.pathname)
      || url.hash
      || [...url.searchParams.keys()].some((key) => ![
        "sslmode", "sslrootcert", "sslcert", "sslkey", "application_name",
      ].includes(key))
    ) throw new Error("invalid test database");
    return url;
  } catch {
    throw new Error("Set TEST_DATABASE_URL to a dedicated PostgreSQL database ending in _test; tests never fall back to DATABASE_URL.");
  }
}

/** Every suite owns a fresh database; no TRUNCATE/DROP touches the configured DB. */
export async function createTestDatabase() {
  nextEnv.loadEnvConfig(process.cwd());
  const base = validateTestDatabaseUrl(process.env.TEST_DATABASE_URL);
  const name = `creeper_test_${randomUUID().replaceAll("-", "")}`;
  const admin = new Pool({ connectionString: base.toString(), max: 1, connectionTimeoutMillis: 5_000 });
  const url = new URL(base);
  url.pathname = `/${name}`;
  let created = false;
  let disposed = false;

  async function dispose() {
    if (disposed) return;
    disposed = true;
    try {
      // The identifier is generated above, never supplied by env or a caller.
      if (created) await admin.query(`DROP DATABASE "${name}" WITH (FORCE)`);
    } finally {
      await admin.end();
    }
  }

  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    const pool = new Pool({ connectionString: url.toString(), max: 1 });
    try {
      await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
    } finally {
      await pool.end();
    }
    return { url: url.toString(), dispose };
  } catch (error) {
    await dispose();
    throw error;
  }
}

export function testEnvironment(database, origin, cookiePrefix) {
  return {
    ...process.env,
    NODE_ENV: "production",
    DATABASE_URL: database,
    DATABASE_DIRECT_URL: "",
    DATABASE_POOL_MAX: "2",
    BETTER_AUTH_SECRET: "creeper-isolated-test-secret-at-least-thirty-two-characters",
    BETTER_AUTH_URL: origin,
    BETTER_AUTH_PROTOCOL: "http",
    BETTER_AUTH_ALLOWED_HOSTS: "localhost:*,127.0.0.1:*",
    BETTER_AUTH_TRUSTED_ORIGINS: "",
    AUTH_COOKIE_PREFIX: cookiePrefix,
    SITE_URL: origin,
  };
}

export async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  await new Promise((resolve) => {
    const timer = setTimeout(() => child.kill("SIGKILL"), 5_000);
    child.once("exit", () => { clearTimeout(timer); resolve(); });
    child.kill("SIGTERM");
  });
}
