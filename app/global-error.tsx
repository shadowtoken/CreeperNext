"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Brand } from "@/components/shared/brand";
import { Button } from "../components/ui/button";
import { ContentState } from "@/components/shared/content-state";
import { siteConfig } from "../config/site";
import "./globals.css";
import styles from "./status.module.css";

export default function GlobalError({
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <html lang="zh-CN">
      <body>
        <main className={styles.page} id="main-content" tabIndex={-1}>
          <Link className={styles.brand} href="/" aria-label={`${siteConfig.name} 首页`}><Brand /></Link>
          <ContentState kind="error" headingLevel={1} title="暂时无法打开页面" description="请重试一次；如果仍然失败，可以稍后再试。" action={
            <Button pending={pending} pendingLabel="正在重试…" onClick={() => startTransition(retry)}>重新尝试</Button>
          } />
        </main>
      </body>
    </html>
  );
}
