import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: developmentOrigins(),
  poweredByHeader: false,
  async headers() {
    const productionHeaders = process.env.NODE_ENV === "production"
      ? [{ key: "Content-Security-Policy", value: contentSecurityPolicy() }]
      : [];
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          ...productionHeaders,
        ],
      },
    ];
  },
};

function developmentOrigins(): string[] {
  const value = process.env.NEXT_ALLOWED_DEV_ORIGINS?.trim();
  const entries = value
    ? value.split(",").map((entry) => entry.trim())
    : ["127.0.0.1", "creeper.localhost"];

  return [...new Set(entries.map(normalizeDevelopmentOrigin))];
}

function contentSecurityPolicy(): string {
  return [
    "default-src 'self'",
    "base-uri 'self'",
    "connect-src 'self'",
    "font-src 'self' data:",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "img-src 'self' data: blob:",
    "object-src 'none'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
  ].join("; ");
}

function normalizeDevelopmentOrigin(candidate: string): string {
  if (!candidate || candidate.includes("://") || candidate.includes("*")) {
    throw new Error(
      `NEXT_ALLOWED_DEV_ORIGINS contains an invalid explicit hostname: ${candidate || "<empty>"}`,
    );
  }

  try {
    const url = new URL(`http://${candidate}`);
    if (
      !url.hostname
      || url.username
      || url.password
      || url.port
      || url.pathname !== "/"
      || url.search
      || url.hash
    ) {
      throw new Error("invalid hostname");
    }

    return url.hostname.toLowerCase();
  } catch {
    throw new Error(`NEXT_ALLOWED_DEV_ORIGINS contains an invalid explicit hostname: ${candidate}`);
  }
}

export default nextConfig;
