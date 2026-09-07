import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getDatabaseConfig } from "@/config/database";
import * as schema from "./schema/auth";

const config = getDatabaseConfig();
const globalForDatabase = globalThis as unknown as { creeperDatabasePool?: Pool };

// One pool per Node process, also reused across Next.js development hot reloads.
// Pool construction opens no connection; builds do not need a reachable database.
const pool = globalForDatabase.creeperDatabasePool ?? new Pool({
  connectionString: config.url,
  max: config.poolMax,
  connectionTimeoutMillis: 5_000,
  idleTimeoutMillis: 30_000,
  statement_timeout: 15_000,
});

if (!globalForDatabase.creeperDatabasePool) {
  pool.on("error", () => {
    // Idle-client errors must be handled, but must not log credentials or SQL.
    console.error("[database] An idle PostgreSQL connection failed.");
  });
  globalForDatabase.creeperDatabasePool = pool;
}

export const db = drizzle(pool, { schema });
