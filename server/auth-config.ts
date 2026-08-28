import { DatabaseSync } from "node:sqlite";
import { betterAuth } from "better-auth";
import {
  APIError,
  createAuthMiddleware,
  getAuthoritativeSessionFromCtx,
} from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { siteConfig } from "../config/site";

const MFA_VERIFICATION_PATHS = new Set([
  "/two-factor/verify-totp",
  "/two-factor/verify-backup-code",
]);

const HARD_DISABLED_PATHS = new Set([
  "/two-factor/disable",
  "/two-factor/get-totp-uri",
]);

// Public entry points and the short-lived second-factor challenge must remain
// usable without an MFA-assured application session. Everything else becomes
// fail-closed whenever a bootstrap/stale session cookie is present, including
// future Better Auth management endpoints added during an upgrade.
const UNASSURED_ALLOWED_PATHS = new Set([
  "/delete-user/callback",
  "/error",
  "/get-session",
  "/ok",
  "/request-password-reset",
  "/reset-password",
  "/send-verification-email",
  "/sign-in/email",
  "/sign-in/social",
  "/sign-out",
  "/sign-up/email",
  "/two-factor/send-otp",
  "/two-factor/verify-backup-code",
  "/two-factor/verify-otp",
  "/two-factor/verify-totp",
  "/verify-email",
]);

const globalForAuth = globalThis as unknown as {
  creeperNextAuthDatabase?: DatabaseSync;
};

const database =
  globalForAuth.creeperNextAuthDatabase ??
  new DatabaseSync(process.env.AUTH_DB_PATH ?? "creeper-next-auth.sqlite");

database.exec("PRAGMA busy_timeout = 5000");
database.exec("PRAGMA foreign_keys = ON");
database.exec("PRAGMA journal_mode = WAL");

globalForAuth.creeperNextAuthDatabase = database;

const fallbackURL = requiredUrl("BETTER_AUTH_URL");

export const auth = betterAuth({
  appName: siteConfig.name,
  baseURL: {
    allowedHosts: allowedHosts(fallbackURL),
    protocol: baseURLProtocol(fallbackURL),
    fallback: fallbackURL,
  },
  trustedOrigins: additionalTrustedOrigins(fallbackURL),
  secret: requiredSecret(),
  database,
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  session: {
    additionalFields: {
      mfaVerifiedAt: {
        type: "date",
        required: false,
        input: false,
        returned: true,
      },
    },
  },
  databaseHooks: {
    session: {
      create: {
        before: async (session, context) => ({
          data: {
            ...session,
            // Never inherit an assurance level from an older session. Only a
            // successful second-factor endpoint may mint a fully trusted one.
            mfaVerifiedAt: MFA_VERIFICATION_PATHS.has(context?.path ?? "")
              ? new Date()
              : null,
          },
        }),
      },
    },
  },
  hooks: {
    before: createAuthMiddleware(async (context) => {
      if (HARD_DISABLED_PATHS.has(context.path)) {
        throw new APIError("NOT_FOUND", {
          code: "NOT_FOUND",
          message: "This authentication capability is disabled.",
        });
      }

      if (
        MFA_VERIFICATION_PATHS.has(context.path)
        && context.body?.trustDevice === true
      ) {
        throw new APIError("BAD_REQUEST", {
          code: "TRUST_DEVICE_DISABLED",
          message: "Trusted-device bypass is disabled by the required MFA policy.",
        });
      }

      if (MFA_VERIFICATION_PATHS.has(context.path)) {
        const existingSession = await getAuthoritativeSessionFromCtx(context);
        if (
          existingSession?.user.twoFactorEnabled
          && !existingSession.session.mfaVerifiedAt
        ) {
          throw new APIError("FORBIDDEN", {
            code: "MFA_REAUTH_REQUIRED",
            message: "Sign in again before completing the second-factor challenge.",
          });
        }
      }

      if (context.path === "/two-factor/enable") {
        // Re-read the stateful session from SQLite. A cached cookie must never
        // authorize recovery-code or identity management after revocation.
        const session = await getAuthoritativeSessionFromCtx(context);

        if (!session?.session) {
          throw new APIError("UNAUTHORIZED", {
            code: "UNAUTHORIZED",
            message: "A valid session is required.",
          });
        }

        // This endpoint is reserved for first-time enrollment. Otherwise an
        // older password session could replace the verified TOTP secret.
        if (session.user.twoFactorEnabled) {
          throw new APIError("FORBIDDEN", {
            code: "TWO_FACTOR_ALREADY_ENABLED",
            message: "The authenticator is already enrolled.",
          });
        }

        return;
      }

      if (isUnassuredAllowedPath(context.path)) return;

      const session = await getAuthoritativeSessionFromCtx(context);
      if (
        session
        && (!session.user.twoFactorEnabled || !session.session.mfaVerifiedAt)
      ) {
        throw new APIError("FORBIDDEN", {
          code: "MFA_REQUIRED",
          message: "Complete two-factor authentication before managing this account.",
        });
      }
    }),
  },
  disabledPaths: [...HARD_DISABLED_PATHS],
  plugins: [
    twoFactor({
      issuer: siteConfig.name,
      skipVerificationOnEnable: false,
      allowPasswordless: false,
      twoFactorCookieMaxAge: 10 * 60,
      // The starter's default policy requires a fresh second factor after
      // every password sign-in. The request hook also rejects trustDevice.
      trustDeviceMaxAge: 0,
      totpOptions: {
        digits: 6,
        period: 30,
      },
      backupCodeOptions: {
        amount: 10,
        length: 10,
        storeBackupCodes: "encrypted",
      },
      accountLockout: {
        enabled: true,
        maxFailedAttempts: 5,
        durationSeconds: 15 * 60,
      },
    }),
    // Keep this last so cookies written by Better Auth endpoints reach Next.js.
    nextCookies(),
  ],
  advanced: {
    cookiePrefix: cookiePrefix(),
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

function additionalTrustedOrigins(fallback: string): string[] {
  const value = process.env.BETTER_AUTH_TRUSTED_ORIGINS?.trim();
  if (!value) return [];

  const origins = value.split(",").map((entry) => {
    const candidate = entry.trim();
    if (!candidate) {
      throw new Error("BETTER_AUTH_TRUSTED_ORIGINS must not contain empty entries.");
    }

    try {
      const url = new URL(candidate);
      if (
        (url.protocol !== "http:" && url.protocol !== "https:") ||
        candidate.includes("*") ||
        url.username ||
        url.password ||
        url.origin === "null"
      ) {
        throw new Error("invalid origin");
      }
      return url.origin;
    } catch {
      throw new Error(
        `BETTER_AUTH_TRUSTED_ORIGINS contains an invalid http(s) URL: ${candidate}`,
      );
    }
  });

  return [...new Set(origins.filter((origin) => origin !== new URL(fallback).origin))];
}

function allowedHosts(fallback: string): string[] {
  const configured = process.env.BETTER_AUTH_ALLOWED_HOSTS?.trim();
  const entries = (configured || "localhost:*,127.0.0.1:*,creeper.localhost:*")
    .split(",")
    .map((entry) => entry.trim());
  entries.push(new URL(fallback).host);

  return [...new Set(entries.map(normalizeAllowedHost))];
}

function baseURLProtocol(fallback: string): "http" | "https" | "auto" {
  const configured = process.env.BETTER_AUTH_PROTOCOL?.trim();
  if (configured) {
    if (configured === "http" || configured === "https" || configured === "auto") {
      return configured;
    }
    throw new Error('BETTER_AUTH_PROTOCOL must be "http", "https", or "auto".');
  }

  // In a production-mode local build, Better Auth's "auto" setting creates
  // Secure cookies. Deriving from the explicit fallback keeps HTTP local/LAN
  // testing usable while HTTPS deployments remain secure by default.
  return new URL(fallback).protocol === "https:" ? "https" : "http";
}

function normalizeAllowedHost(candidate: string): string {
  if (!candidate || candidate.includes("://") || /[/?#@]/.test(candidate)) {
    throw new Error(`BETTER_AUTH_ALLOWED_HOSTS contains an invalid host: ${candidate || "<empty>"}`);
  }

  const portWildcard = candidate.endsWith(":*");
  const hostValue = portWildcard ? candidate.slice(0, -2) : candidate;
  if (hostValue.includes("*")) {
    throw new Error(`BETTER_AUTH_ALLOWED_HOSTS contains an unsupported wildcard: ${candidate}`);
  }

  try {
    const url = new URL(`http://${hostValue}`);
    if (!url.hostname || url.username || url.password || url.pathname !== "/") {
      throw new Error("invalid host");
    }

    if (!portWildcard && url.port) {
      const port = Number(url.port);
      if (!Number.isInteger(port) || port < 1 || port > 65_535) throw new Error("invalid port");
    }

    return portWildcard ? `${url.hostname.toLowerCase()}:*` : url.host.toLowerCase();
  } catch {
    throw new Error(`BETTER_AUTH_ALLOWED_HOSTS contains an invalid host: ${candidate}`);
  }
}

function cookiePrefix(): string {
  const value = process.env.AUTH_COOKIE_PREFIX?.trim() || "creeper_next";
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(value)) {
    throw new Error(
      "AUTH_COOKIE_PREFIX must be 1-32 characters using only letters, numbers, underscores, or hyphens.",
    );
  }
  return value;
}

function isUnassuredAllowedPath(path: string): boolean {
  return UNASSURED_ALLOWED_PATHS.has(path)
    || path.startsWith("/callback/")
    || path.startsWith("/reset-password/");
}
