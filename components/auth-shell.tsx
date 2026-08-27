import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "./brand";
import { Kicker } from "./ui/kicker";
import styles from "./auth-shell.module.css";

export function AuthShell({
  eyebrow,
  title,
  description,
  children,
  footer,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label="返回 Foundation 首页"><Brand /></Link>
        <Link className={styles.back} href="/">返回首页 <span aria-hidden="true">↗</span></Link>
      </header>
      <main className={styles.layout} id="main-content" tabIndex={-1}>
        <section className={styles.panel}>
          <div className={styles.card}>
            <Kicker>{eyebrow}</Kicker>
            <h1>{title}</h1>
            <p className={styles.description}>{description}</p>
            <div className={styles.action}>{children}</div>
            <div className={styles.switch}>{footer}</div>
          </div>
        </section>
        <aside className={styles.aside} aria-label="Foundation 认证原则">
          <div>
            <span className={styles.asideIndex}>FOUNDATION / AUTH</span>
            <blockquote>“认证应该是产品的边界，而不是产品的负担。”</blockquote>
          </div>
          <div className={styles.points}>
            <div><span>01</span><p>会话始终在服务端验证。</p></div>
            <div><span>02</span><p>跳转目标限制在当前站点。</p></div>
            <div><span>03</span><p>认证提供方可以独立替换。</p></div>
          </div>
        </aside>
      </main>
    </div>
  );
}
