import { additionalTrustedOrigins, allowedHosts, baseURLProtocol, cookiePrefix, requiredSecret, requiredUrl } from "./auth";
import { getDatabaseConfig, getMigrationUrl } from "./database";
import { developmentOrigins, getSiteUrl } from "./runtime";

/** No I/O: a production build must never require an online database. */
export function configurationIssues(): string[] {
  const checks = [
    requiredSecret,
    () => requiredUrl("BETTER_AUTH_URL"),
    getSiteUrl,
    cookiePrefix,
    getDatabaseConfig,
    getMigrationUrl,
    developmentOrigins,
    // Validate independent settings even if the canonical URL is missing.
    () => additionalTrustedOrigins("http://localhost"),
    () => allowedHosts("http://localhost"),
    () => baseURLProtocol("http://localhost"),
  ];
  return checks.flatMap((check) => {
    try { check(); return []; }
    catch (error) { return [error instanceof Error ? error.message : "Invalid configuration."]; }
  });
}

export function assertConfiguration(): void {
  const issues = configurationIssues();
  if (issues.length) {
    throw new Error(`Configuration is incomplete:\n${issues.map((issue) => `- ${issue}`).join("\n")}\nRun pnpm setup:local on a fresh checkout, then pnpm check:env. Existing .env.local is never overwritten.`);
  }
}
