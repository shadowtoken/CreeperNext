"use client";
import Link from "next/link";
import styles from "./two-factor-settings.module.css";
export function TwoFactorSettings({ initiallyEnabled }: { initiallyEnabled: boolean }) {
 return <section className={styles.card} aria-labelledby="security-heading"><header className={styles.heading}><div><span className={styles.eyebrow}>SIGN-IN SECURITY</span><h2 id="security-heading">登录安全</h2><p>每次密码登录后，使用身份验证器完成二次验证。</p></div><span className={styles.status}><i aria-hidden="true" />{initiallyEnabled ? "已启用" : "待设置"}</span></header>{!initiallyEnabled ? <div className={styles.requiredSetup}><p>进入应用前需要完成身份验证器绑定。</p><Link href="/two-factor/setup?returnTo=%2Faccount">继续安全设置</Link></div> : <div className={styles.rows}><div className={styles.row}><span className={styles.rowIcon} aria-hidden="true">⌁</span><div className={styles.rowCopy}><h3>身份验证器</h3><p>已绑定标准 TOTP 应用；动态代码每 30 秒更新。</p></div><span className={styles.rowState}>已连接</span></div></div>}<footer className={styles.policy}><span>强制安全策略</span><p>不允许关闭双因素认证，也不会用“信任此设备”跳过验证。</p></footer></section>;
}
