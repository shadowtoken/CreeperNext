/** Server/CLI configuration. The architecture check forbids browser imports. */
export function getSiteUrl(): URL {
  const value = process.env.SITE_URL?.trim();
  if (!value && process.env.NODE_ENV === "production") {
    throw new Error("SITE_URL is required in production.");
  }
  try {
    const url = new URL(value || "http://localhost:3000");
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password
      || url.pathname !== "/" || url.search || url.hash) throw new Error("invalid origin");
    return url;
  } catch {
    throw new Error("SITE_URL must be an http(s) origin without credentials, path, query, or hash.");
  }
}

export function developmentOrigins(): string[] {
  const value = process.env.NEXT_ALLOWED_DEV_ORIGINS?.trim();
  const entries = value ? value.split(",").map((entry) => entry.trim()) : ["127.0.0.1", "creeper.localhost"];
  return [...new Set(entries.map((candidate) => {
    try {
      const url = new URL(`http://${candidate}`);
      if (!candidate || candidate.includes("://") || candidate.includes("*") || !url.hostname
        || url.username || url.password || url.port || url.pathname !== "/" || url.search || url.hash) {
        throw new Error("invalid hostname");
      }
      return url.hostname.toLowerCase();
    } catch {
      throw new Error("NEXT_ALLOWED_DEV_ORIGINS must contain explicit hostnames without ports, paths or wildcards.");
    }
  }))];
}
