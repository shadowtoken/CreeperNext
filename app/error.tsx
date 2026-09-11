"use client";

import Link from "next/link";
import { useTransition } from "react";
import { Brand } from "@/components/shared/brand";
import { Button } from "@/components/ui/button";
import { ContentState } from "@/components/shared/content-state";
import { ButtonLink } from "@/components/ui/button-link";
import { siteConfig } from "@/config/site";
import styles from "./status.module.css";

export default function AppError({ retry }: { retry: () => void }) {
  const [pending, startTransition] = useTransition();
  return (
    <main className={styles.page} id="main-content" tabIndex={-1}>
      <Link className={styles.brand} href="/" aria-label={`${siteConfig.name} 首页`}>
        <Brand />
      </Link>
      <ContentState kind="error" headingLevel={1} title="页面暂时无法加载" description="请重试一次；如果仍然失败，可以稍后再试。" action={<>
        <Button pending={pending} pendingLabel="正在重试…" onClick={() => startTransition(retry)}>重新尝试</Button>
        <ButtonLink href="/" variant="secondary">返回首页</ButtonLink>
      </>} />
    </main>
  );
}
