import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/env";
import { AUTH_PATHS } from "@/core/auth/paths";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        AUTH_PATHS.account,
        AUTH_PATHS.login,
        AUTH_PATHS.register,
        AUTH_PATHS.twoFactor,
        "/api/",
      ],
    },
    sitemap: new URL("/sitemap.xml", getSiteUrl()).toString(),
  };
}
