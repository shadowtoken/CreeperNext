import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/config/env";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: getSiteUrl().toString(),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}
