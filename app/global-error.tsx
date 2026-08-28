"use client";

import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { Button } from "../components/ui/button";
import { Kicker } from "../components/ui/kicker";
import { siteConfig } from "../config/site";
import "./globals.css";
import styles from "./status.module.css";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="zh-CN">
      <body>
        <main className={styles.page}>
          <Link className={styles.brand} href="/" aria-label={`${siteConfig.name} 首页`}><Brand /></Link>
          <div className={styles.copy}>
            <Kicker>SYSTEM / ERROR</Kicker>
            <h1>结构还在，刚才那一步出了问题。</h1>
            <p>你可以重新尝试。如果问题持续存在，请稍后再回来。</p>
            <Button type="button" onClick={reset}>重新尝试 <span aria-hidden="true">↻</span></Button>
          </div>
        </main>
      </body>
    </html>
  );
}
