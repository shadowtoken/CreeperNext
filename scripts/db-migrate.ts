import nextEnv from "@next/env";
import { drizzle } from "drizzle-orm/node-postgres";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { Pool } from "pg";
import { getMigrationUrl } from "../config/database";

nextEnv.loadEnvConfig(process.cwd());

const pool = new Pool({
  connectionString: getMigrationUrl(),
  max: 1,
  connectionTimeoutMillis: 5_000,
});

try {
  await migrate(drizzle(pool), { migrationsFolder: "./drizzle" });
  console.log("Database migrations applied.");
} catch {
  console.error("Database migration failed. Check connectivity, credentials and migration SQL.");
  process.exitCode = 1;
} finally {
  await pool.end();
}
