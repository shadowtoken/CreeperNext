import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { getSiteUrl, siteConfig } from "../config/site";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: getSiteUrl(),
  title: { default: siteConfig.name, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  openGraph: {
    type: "website",
    title: "Foundation — 可靠的产品起点",
    description: "从一个好地基，开始下一款产品。",
    images: [{ url: siteConfig.ogImage, width: 1733, height: 908, alt: "Foundation 产品脚手架" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Foundation — 可靠的产品起点",
    description: "从一个好地基，开始下一款产品。",
    images: [siteConfig.ogImage],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className={`${geistSans.variable} ${geistMono.variable}`}>
        <a className="skip-link" href="#main-content" data-responsive-overflow-ok>跳到主要内容</a>
        {children}
      </body>
    </html>
  );
}
