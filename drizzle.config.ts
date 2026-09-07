import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./server/db/schema/*.ts",
  out: "./drizzle",
  strict: true,
  verbose: false,
});
