import { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

const globalForAuth = globalThis as unknown as {
  foundationAuthDatabase?: DatabaseSync;
};

const database =
  globalForAuth.foundationAuthDatabase ??
  new DatabaseSync(process.env.AUTH_DB_PATH ?? "foundation-auth.sqlite");

database.exec("PRAGMA busy_timeout = 5000");
database.exec("PRAGMA foreign_keys = ON");
database.exec("PRAGMA journal_mode = WAL");

globalForAuth.foundationAuthDatabase = database;

export const auth = betterAuth({
  appName: "Foundation",
  baseURL: requiredUrl("BETTER_AUTH_URL"),
  secret: requiredSecret(),
  database,
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  plugins: [nextCookies()],
  advanced: {
    cookiePrefix: "foundation",
  },
});

function requiredSecret(): string {
  const value = process.env.BETTER_AUTH_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }
  return value;
}

function requiredUrl(name: "BETTER_AUTH_URL"): string {
  const value = process.env[name]?.trim();
  try {
    const url = new URL(value ?? "");
    if (url.protocol === "http:" || url.protocol === "https:") return url.toString();
  } catch {
    // Fall through to one actionable configuration error.
  }
  throw new Error(`${name} must be a valid http(s) URL.`);
}
