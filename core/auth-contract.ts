/** Framework-neutral auth rules consumed by routes and features. */
export const AUTHENTICATOR_CODE_LENGTH = 6;
export const PASSWORD_MIN_LENGTH = 8;

export function isAuthenticatorCode(value: string) {
  return /^\d{6}$/.test(value.replaceAll(" ", "").trim());
}
