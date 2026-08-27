export const siteConfig = {
  name: "Foundation",
  description: "一个轻量、现代、可扩展的 Next.js 产品脚手架。",
  ogImage: "/og.png",
} as const;

export function getSiteUrl(): URL {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");
    if (url.protocol === "http:" || url.protocol === "https:") return url;
  } catch {
    // A safe local fallback keeps metadata generation deterministic in development.
  }

  return new URL("http://localhost:3000");
}
