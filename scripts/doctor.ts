import nextEnv from "@next/env";
import { Pool } from "pg";
import { configurationIssues } from "../config/validation";
import { getDatabaseConfig } from "../config/database";
import { getSiteUrl } from "../config/runtime";
import { requiredUrl } from "../config/auth";

const args = process.argv.slice(2);
if (args.some((arg) => !["--production", "--database"].includes(arg))) {
  console.error("Usage: pnpm check:env [--production] [--database]");
  process.exitCode = 1;
} else {
  // Match Next's environment precedence, including inherited process variables.
  Object.assign(process.env, { NODE_ENV: args.includes("--production") ? "production" : "development" });
  nextEnv.loadEnvConfig(process.cwd(), process.env.NODE_ENV === "development", {
    info: () => {},
    error: () => { console.error("Unable to load an environment file. Check syntax and permissions."); process.exitCode = 1; },
  });
  const issues = configurationIssues();
  const [major, minor] = process.versions.node.split(".").map(Number);
  if (major < 22 || major === 22 && minor < 19) issues.unshift("Node.js >=22.19.0 is required.");
  if (issues.length) {
    console.error(`Configuration check failed:\n${issues.map((issue) => `- ${issue}`).join("\n")}\nFresh checkout: pnpm setup:local. Existing configuration: edit .env.local or your deployment environment.`);
    process.exitCode = 1;
  } else if (!process.exitCode) {
    console.log(`Configuration OK (${process.env.NODE_ENV}). Secret and connection values are not printed.`);
    if (getSiteUrl().origin !== requiredUrl("BETTER_AUTH_URL")) {
      console.warn("Warning: SITE_URL and BETTER_AUTH_URL differ. Confirm this is intentional; changing the dev port does not update either value.");
    }
    if (args.includes("--production") && [getSiteUrl().protocol, new URL(requiredUrl("BETTER_AUTH_URL")).protocol].includes("http:")) {
      console.warn("Warning: HTTP origins are suitable for local production-mode testing, not a public deployment. Configure HTTPS before publishing.");
    }
    if (!args.includes("--database")) {
      console.log("Database not contacted. Use pnpm check:env --database to check connectivity and required auth tables (read-only).");
    } else {
      const pool = new Pool({ connectionString: getDatabaseConfig().url, max: 1, connectionTimeoutMillis: 5000, query_timeout: 5000 });
      // Never print pg errors: they may contain credentials or connection details.
      pool.on("error", () => { console.error("Database connection interrupted."); process.exitCode = 1; });
      try {
        const result = await pool.query<{ ready: boolean }>(`
          SELECT to_regclass('public."user"') IS NOT NULL
             AND to_regclass('public.session') IS NOT NULL
             AND to_regclass('public.account') IS NOT NULL
             AND to_regclass('public.verification') IS NOT NULL
             AND to_regclass('public.two_factor') IS NOT NULL AS ready
        `);
        if (!result.rows[0]?.ready) {
          console.error("Database reachable, but auth tables are missing. Review the target, then run pnpm db:migrate. Doctor never applies migrations.");
          process.exitCode = 1;
        } else {
          console.log("Database reachable; required auth tables exist. This is not a schema drift or write-permission audit.");
        }
      } catch {
        console.error("Database check failed. Verify the server, DATABASE_URL, credentials and TLS settings. For local Compose: pnpm db:up.");
        process.exitCode = 1;
      } finally { await pool.end(); }
    }
  }
}
