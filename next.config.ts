import type { NextConfig } from "next";
import { developmentOrigins } from "./config/runtime";
import { assertConfiguration } from "./config/validation";

assertConfiguration();

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

export default nextConfig;
