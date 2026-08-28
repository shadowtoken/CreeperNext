import "server-only";

const DEVELOPMENT_SITE_URL = "http://localhost:3000";

/** Canonical public origin used by metadata, robots and sitemap. */
export function getSiteUrl(): URL {
  const value = process.env.SITE_URL?.trim();

  if (!value) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SITE_URL is required in production.");
    }
    return new URL(DEVELOPMENT_SITE_URL);
  }

  try {
    const url = new URL(value);
    if (
      (url.protocol !== "http:" && url.protocol !== "https:")
      || url.username
      || url.password
      || url.pathname !== "/"
      || url.search
      || url.hash
    ) {
      throw new Error("invalid canonical origin");
    }
    return url;
  } catch {
    throw new Error("SITE_URL must be an http(s) origin without credentials, path, query, or hash.");
  }
}
