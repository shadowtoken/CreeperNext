import "server-only";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { db } from "./db/client";
import * as authSchema from "./db/schema/auth";
import { betterAuth } from "better-auth";
import {
  APIError,
  createAuthMiddleware,
  getAuthoritativeSessionFromCtx,
} from "better-auth/api";
import { nextCookies } from "better-auth/next-js";
import { twoFactor } from "better-auth/plugins";
import { siteConfig } from "../config/site";
import {
  requiredSecret, requiredUrl, additionalTrustedOrigins,
  allowedHosts, baseURLProtocol, cookiePrefix,
} from "../config/auth";
import {
  ACCOUNT_LOCKOUT_ATTEMPTS,
  ACCOUNT_LOCKOUT_SECONDS,
  AUTH_CHALLENGE_TTL_SECONDS,
  AUTHENTICATOR_CODE_LENGTH,
  AUTHENTICATOR_CODE_PERIOD_SECONDS,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/core/auth/policy";

// The schema generator uses the pinned auth generator API under Node's
// react-server condition, preserving the same server-only boundary as Next.js.

const MFA_VERIFICATION_PATHS = new Set([
  "/two-factor/verify-totp",
]);

const HARD_DISABLED_PATHS = new Set([
  "/two-factor/disable",
  "/two-factor/generate-backup-codes",
  "/two-factor/get-totp-uri",
  "/two-factor/verify-backup-code",
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
  "/two-factor/verify-otp",
  "/two-factor/verify-totp",
  "/verify-email",
]);

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
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: authSchema,
    transaction: true,
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    minPasswordLength: PASSWORD_MIN_LENGTH,
    maxPasswordLength: PASSWORD_MAX_LENGTH,
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
        // Re-read the stateful session from PostgreSQL. A cached cookie must never
        // authorize identity management after revocation.
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
      twoFactorCookieMaxAge: AUTH_CHALLENGE_TTL_SECONDS,
      // The starter's default policy requires a fresh second factor after
      // every password sign-in. The request hook also rejects trustDevice.
      trustDeviceMaxAge: 0,
      totpOptions: {
        digits: AUTHENTICATOR_CODE_LENGTH,
        period: AUTHENTICATOR_CODE_PERIOD_SECONDS,
      },
      backupCodeOptions: {
        // Better Auth's TOTP model includes this column, but this product
        // intentionally exposes no recovery-code capability.
        customBackupCodesGenerate: () => [],
        storeBackupCodes: "encrypted",
      },
      accountLockout: {
        enabled: true,
        maxFailedAttempts: ACCOUNT_LOCKOUT_ATTEMPTS,
        durationSeconds: ACCOUNT_LOCKOUT_SECONDS,
      },
    }),
    // Keep this last so cookies written by Better Auth endpoints reach Next.js.
    nextCookies(),
  ],
  advanced: {
    cookiePrefix: cookiePrefix(),
  },
});


function isUnassuredAllowedPath(path: string): boolean {
  return UNASSURED_ALLOWED_PATHS.has(path)
    || path.startsWith("/callback/")
    || path.startsWith("/reset-password/");
}
