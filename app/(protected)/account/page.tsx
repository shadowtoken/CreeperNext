import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "../../../components/brand";
import { SignOutButton } from "../../../components/sign-out-button";
import { TwoFactorSettings } from "../../../components/two-factor-settings";
import { ButtonLink } from "../../../components/ui/button-link";
import { Kicker } from "../../../components/ui/kicker";
import { siteConfig } from "../../../config/site";
import { requireSession } from "../../../server/auth";
import styles from "./account.module.css";

export const metadata: Metadata = {
  title: "Account",
  description: `${siteConfig.name} 的最小受保护页面。`,
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await requireSession("/account");
  const { user } = session;
  const initials = (user.name || user.email).slice(0, 1).toUpperCase();

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label={`${siteConfig.name} 首页`}><Brand /></Link>
        <SignOutButton />
      </header>

      <main className={styles.content} id="main-content" tabIndex={-1}>
        <div className={styles.heading}>
          <Kicker>PROTECTED ROUTE / ACCOUNT</Kicker>
          <h1>你好，{user.name || "构建者"}。</h1>
          <p>这是脚手架中唯一的受保护样板页，用来验证注册、登录、数据库会话和服务端路由保护。</p>
        </div>

        <div className={styles.grid}>
          <article className={styles.profileCard}>
            <div className={styles.avatar} aria-hidden="true">{initials}</div>
            <div className={styles.identity}>
              <span className={styles.label}>CURRENT SESSION</span>
              <h2>{user.name}</h2>
              <p>{user.email}</p>
            </div>
            <span className={styles.sessionStatus}><i /> 会话有效</span>
          </article>

          <article className={styles.nextStepCard}>
            <span className={styles.label}>NEXT LAYER</span>
            <h2>从这里开始添加产品。</h2>
            <p>Account 证明地基可用。接下来安装业务模块，而不修改认证和设计系统边界。</p>
            <ButtonLink className={styles.returnLink} href="/" variant="inverse">返回 Landing <span aria-hidden="true">→</span></ButtonLink>
          </article>

          <TwoFactorSettings initiallyEnabled={Boolean(user.twoFactorEnabled)} />
        </div>
      </main>
    </div>
  );
}
