// Authentication environment parsing, shared with the schema-generation command.
export function requiredSecret(): string {
  const value = process.env.BETTER_AUTH_SECRET?.trim();
  if (!value || value.length < 32) {
    throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.");
  }
  return value;
}

export function requiredUrl(name: "BETTER_AUTH_URL"): string {
  const value = process.env[name]?.trim();
  try {
    const url = new URL(value ?? "");
    if (
      (url.protocol === "http:" || url.protocol === "https:")
      && !url.username
      && !url.password
      && url.pathname === "/"
      && !url.search
      && !url.hash
    ) {
      return url.origin;
    }
  } catch {
    // Fall through to one actionable configuration error.
  }
  throw new Error(`${name} must be an http(s) origin without credentials, path, query, or hash.`);
}

export function additionalTrustedOrigins(fallback: string): string[] {
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
        url.pathname !== "/" || url.search || url.hash ||
        url.origin === "null"
      ) {
        throw new Error("invalid origin");
      }
      return url.origin;
    } catch {
      throw new Error(
        "BETTER_AUTH_TRUSTED_ORIGINS must contain exact http(s) origins without credentials, paths, query, hash or wildcards.",
      );
    }
  });

  return [...new Set(origins.filter((origin) => origin !== new URL(fallback).origin))];
}

export function allowedHosts(fallback: string): string[] {
  const configured = process.env.BETTER_AUTH_ALLOWED_HOSTS?.trim();
  const developmentDefaults = "localhost:*,127.0.0.1:*,creeper.localhost:*";
  const entries = (configured || (process.env.NODE_ENV === "production" ? "" : developmentDefaults))
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
  entries.push(new URL(fallback).host);

  return [...new Set(entries.map(normalizeAllowedHost))];
}

export function baseURLProtocol(fallback: string): "http" | "https" | "auto" {
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
    throw new Error("BETTER_AUTH_ALLOWED_HOSTS must contain hosts without schemes, credentials or paths.");
  }

  const portWildcard = candidate.endsWith(":*");
  const hostValue = portWildcard ? candidate.slice(0, -2) : candidate;
  if (hostValue.includes("*")) {
    throw new Error("BETTER_AUTH_ALLOWED_HOSTS only supports a port wildcard (:*), not host wildcards.");
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
    throw new Error("BETTER_AUTH_ALLOWED_HOSTS contains an invalid host or port.");
  }
}

export function cookiePrefix(): string {
  const configured = process.env.AUTH_COOKIE_PREFIX?.trim();
  if (!configured && process.env.NODE_ENV === "production") {
    throw new Error("AUTH_COOKIE_PREFIX is required in production.");
  }
  const value = configured || "creeper_next";
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(value)) {
    throw new Error(
      "AUTH_COOKIE_PREFIX must be 1-32 characters using only letters, numbers, underscores, or hyphens.",
    );
  }
  return value;
}
