export const AUTH_PATHS = {
  account: "/account",
  api: "/api/auth",
  login: "/login",
  register: "/register",
  twoFactor: "/two-factor",
  twoFactorSetup: "/two-factor/setup",
} as const;

const RESERVED_PREFIXES = [
  AUTH_PATHS.api,
  AUTH_PATHS.login,
  AUTH_PATHS.register,
  AUTH_PATHS.twoFactor,
] as const;

export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return AUTH_PATHS.account;
  }

  let url: URL;
  try {
    url = new URL(value, "https://creeper-next.local");
  } catch {
    return AUTH_PATHS.account;
  }

  if (
    url.origin !== "https://creeper-next.local" ||
    RESERVED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  ) {
    return AUTH_PATHS.account;
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
