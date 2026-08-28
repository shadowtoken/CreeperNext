"use client";

import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { Kicker } from "@/components/ui/kicker";
import { siteConfig } from "@/config/site";
import styles from "./status.module.css";

export default function AppError({ retry }: { retry: () => void }) {
  return (
    <main className={styles.page} id="main-content" tabIndex={-1}>
      <Link className={styles.brand} href="/" aria-label={`${siteConfig.name} 首页`}>
        <Brand />
      </Link>
      <div className={styles.copy}>
        <Kicker>PAGE / ERROR</Kicker>
        <h1>这一步暂时没有完成。</h1>
        <p>页面结构仍然保留。你可以重新请求当前内容，或者返回首页。</p>
        <Button type="button" onClick={retry}>重新尝试 <span aria-hidden="true">↻</span></Button>
      </div>
    </main>
  );
}
