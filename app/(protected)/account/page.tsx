import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { Kicker } from "@/components/ui/kicker";
import { AUTH_PATHS } from "@/core/auth/paths";
import { ChangePasswordForm, SignOutButton, TwoFactorSettings } from "@/features/auth";
import { siteConfig } from "@/config/site";
import { requireTwoFactorSession } from "@/server/auth";
import styles from "./account.module.css";

export const metadata: Metadata = {
  title: "账户与安全",
  description: `管理 ${siteConfig.name} 的身份资料和登录安全。`,
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await requireTwoFactorSession(AUTH_PATHS.account);
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
          <p>管理身份资料、登录保护和密码。</p>
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

          <section className={styles.settingsCard} aria-labelledby="password-heading">
            <header className={styles.settingsHeading}>
              <span className={styles.sectionLabel}>PASSWORD</span>
              <h2 id="password-heading">修改密码</h2>
              <p>保存后会退出其他设备上的会话，当前设备保持登录。</p>
            </header>
            <ChangePasswordForm />
          </section>
        </div>

        <footer className={styles.pageFooter}>
          <Link href="/">返回首页</Link>
          <span>你的安全设置仅对当前账户生效。</span>
        </footer>
      </main>
    </div>
  );
}
