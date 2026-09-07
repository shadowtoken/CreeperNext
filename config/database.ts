/** Shared by Next.js and database CLI tools. Never import into browser code. */
export function databaseUrl(value: string | undefined, name = "DATABASE_URL"): string {
  try {
    const url = new URL(value?.trim() ?? "");
    if (
      !["postgres:", "postgresql:"].includes(url.protocol)
      || !url.hostname
      || !url.username
      || url.pathname.length <= 1
      || url.pathname.slice(1).includes("/")
      || url.hash
    ) throw new Error("invalid connection URL");
    return url.toString();
  } catch {
    // Connection strings contain credentials: never include the value in errors.
    throw new Error(`${name} must be a PostgreSQL URL with a host, user and database name.`);
  }
}

export function databasePoolSize(value: string | undefined): number {
  if (value === undefined || value.trim() === "") return 5;
  if (!/^\d+$/.test(value) || Number(value) < 1 || Number(value) > 100) {
    throw new Error("DATABASE_POOL_MAX must be an integer between 1 and 100.");
  }
  return Number(value);
}

export function getDatabaseConfig() {
  return {
    url: databaseUrl(process.env.DATABASE_URL),
    poolMax: databasePoolSize(process.env.DATABASE_POOL_MAX),
  };
}

export function getMigrationUrl() {
  return databaseUrl(
    process.env.DATABASE_DIRECT_URL?.trim() || process.env.DATABASE_URL,
    "DATABASE_DIRECT_URL or DATABASE_URL",
  );
}
