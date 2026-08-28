import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "../../../components/brand";
import { SignOutButton } from "../../../components/sign-out-button";
import { TwoFactorSettings } from "../../../components/two-factor-settings";
import { ChangePasswordForm } from "../../../components/change-password-form";
import { Kicker } from "../../../components/ui/kicker";
import { siteConfig } from "../../../config/site";
import { requireTwoFactorSession } from "../../../server/auth";
import styles from "./account.module.css";

export const metadata: Metadata = {
  title: "账户与安全",
  description: `管理 ${siteConfig.name} 的身份资料和登录安全。`,
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await requireTwoFactorSession("/account");
  const { user } = session;
  const initials = (user.name || user.email).slice(0, 1).toUpperCase();

  return (
    <div className={styles.page}>
      <header className={styles.siteHeader}>
        <Link className={styles.brand} href="/" aria-label={`${siteConfig.name} 首页`}>
          <Brand />
        </Link>
        <SignOutButton />
      </header>

      <main className={styles.content} id="main-content" tabIndex={-1}>
        <header className={styles.pageHeading}>
          <Kicker>ACCOUNT SETTINGS</Kicker>
          <h1>账户与安全</h1>
          <p>管理身份资料、登录保护和账户恢复方式。</p>
        </header>

        <div className={styles.stack}>
          <section className={styles.profileCard} aria-labelledby="profile-heading">
            <div className={styles.sectionHeading}>
              <div>
                <span className={styles.sectionLabel}>PROFILE</span>
                <h2 id="profile-heading">身份资料</h2>
              </div>
              <span className={styles.sessionBadge}><i aria-hidden="true" /> 安全会话</span>
            </div>

            <div className={styles.profileBody}>
              <div className={styles.identity}>
                <div className={styles.avatar} aria-hidden="true">{initials}</div>
                <div className={styles.identityCopy}>
                  <strong>{user.name || "构建者"}</strong>
                  <span>{user.email}</span>
                </div>
              </div>

              <dl className={styles.details}>
                <div>
                  <dt>登录方式</dt>
                  <dd>邮箱与密码</dd>
                </div>
                <div>
                  <dt>当前会话</dt>
                  <dd>已完成双因素验证</dd>
                </div>
              </dl>
            </div>
          </section>

      <TwoFactorSettings initiallyEnabled={Boolean(user.twoFactorEnabled)} />
      <section><h2>修改密码</h2><p>定期更新密码，保护你的登录凭据。</p><ChangePasswordForm /></section>
        </div>

        <footer className={styles.pageFooter}>
          <Link href="/">返回首页</Link>
          <span>你的安全设置仅对当前账户生效。</span>
        </footer>
      </main>
    </div>
  );
}
