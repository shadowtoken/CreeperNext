/** Framework-neutral authentication rules consumed by routes and features. */
export const AUTHENTICATOR_CODE_LENGTH = 6;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;
export const AUTHENTICATOR_CODE_PERIOD_SECONDS = 30;
export const AUTH_CHALLENGE_TTL_SECONDS = 10 * 60;
export const ACCOUNT_LOCKOUT_ATTEMPTS = 5;
export const ACCOUNT_LOCKOUT_SECONDS = 15 * 60;

export function isAuthenticatorCode(value: string) {
  return new RegExp(`^\\d{${AUTHENTICATOR_CODE_LENGTH}}$`).test(
    value.replaceAll(" ", "").trim(),
  );
}
