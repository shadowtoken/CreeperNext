import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: developmentOrigins(),
  poweredByHeader: false,
  async headers() {
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
