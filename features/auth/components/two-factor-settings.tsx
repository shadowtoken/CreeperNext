import Link from "next/link";
import { AUTH_PATHS } from "@/core/auth/paths";
import { AUTHENTICATOR_CODE_PERIOD_SECONDS } from "@/core/auth/policy";
import styles from "./two-factor-settings.module.css";

/** Read-only summary of the mandatory authenticator policy. */
export function TwoFactorSettings({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  return (
    <section className={styles.card} aria-labelledby="security-heading">
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>SIGN-IN SECURITY</span>
          <h2 id="security-heading">登录安全</h2>
          <p>每次密码登录后，使用身份验证器完成二次验证。</p>
        </div>
        <span className={styles.status}>
          <i aria-hidden="true" />
          {initiallyEnabled ? "已启用" : "待设置"}
        </span>
      </header>

      {!initiallyEnabled ? (
        <div className={styles.requiredSetup}>
          <p>进入应用前需要完成身份验证器绑定。</p>
          <Link href={`${AUTH_PATHS.twoFactorSetup}?returnTo=${encodeURIComponent(AUTH_PATHS.account)}`}>继续安全设置</Link>
        </div>
      ) : (
        <div className={styles.rows}>
          <div className={styles.row}>
            <span className={styles.rowIcon} aria-hidden="true">
              <AuthenticatorIcon />
            </span>
            <div className={styles.rowCopy}>
              <h3>身份验证器</h3>
              <p>已绑定标准 TOTP 应用；动态代码每 {AUTHENTICATOR_CODE_PERIOD_SECONDS} 秒更新。</p>
            </div>
            <span className={styles.rowState}>已连接</span>
          </div>
        </div>
      )}

      <footer className={styles.policy}>
        <span>强制安全策略</span>
        <p>不允许关闭双因素认证，也不会用“信任此设备”跳过验证。</p>
      </footer>
    </section>
  );
}

function AuthenticatorIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="5" y="3" width="14" height="18" rx="3" />
      <path d="M9 8h6M9 12h2M13 12h2M9 16h2M13 16h2" />
    </svg>
  );
}
