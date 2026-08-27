const RESERVED_PREFIXES = ["/api/auth", "/login", "/register", "/two-factor"];

export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account";
  }

  let url: URL;
  try {
    url = new URL(value, "https://creeper-next.local");
  } catch {
    return "/account";
  }

  if (
    url.origin !== "https://creeper-next.local" ||
    RESERVED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  ) {
    return "/account";
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
