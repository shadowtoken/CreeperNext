import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";
import styles from "./auth-shell.module.css";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label={`返回 ${siteConfig.name} 首页`}>
          <Brand />
        </Link>
        <Link className={styles.back} href="/">
          返回官网
        </Link>
      </header>
      <main className={styles.main} id="main-content" tabIndex={-1}>
        <div className={styles.composition}>
          <div className={styles.taskPane} data-auth-task-pane>
            <section
              className={cn(styles.card, "@container/auth-card")}
              data-auth-card
              aria-labelledby="auth-title"
            >
              <div className={styles.intro}>
                <h1 id="auth-title">{title}</h1>
                <p className={styles.description}>{description}</p>
              </div>
              <div className={styles.action} data-auth-form-region>{children}</div>
              <div className={styles.switch}>{footer}</div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
