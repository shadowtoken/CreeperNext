const RESERVED_PREFIXES = ["/api/auth", "/login", "/register"];

export function safeReturnPath(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/account";
  }

  let url: URL;
  try {
    url = new URL(value, "https://foundation.local");
  } catch {
    return "/account";
  }

  if (
    url.origin !== "https://foundation.local" ||
    RESERVED_PREFIXES.some((prefix) => url.pathname.startsWith(prefix))
  ) {
    return "/account";
  }

  return `${url.pathname}${url.search}${url.hash}`;
}
