"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import Link from "next/link";
import { authClient } from "../lib/auth-client";
import { AuthPasswordInput } from "./auth-password-input";
import { Button } from "./ui/button";
import styles from "./two-factor-settings.module.css";

export function TwoFactorSettings({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const [showRecoveryForm, setShowRecoveryForm] = useState(false);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function regenerateCodes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    resetMessages();
    setPending(true);
    const form = new FormData(formElement);
    const password = String(form.get("password") ?? "");

    try {
      const result = await authClient.twoFactor.generateBackupCodes({ password });
      if (result.error || !result.data) {
        setError(managementErrorMessage(result.error));
        return;
      }

      setRecoveryCodes(result.data.backupCodes);
      setNotice("新的恢复码已生成，旧恢复码已经全部失效。");
      setShowRecoveryForm(false);
      formElement.reset();
    } catch {
      setError("暂时无法生成恢复码，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  async function copyRecoveryCodes() {
    if (!recoveryCodes) return;
    resetMessages();
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setNotice("已复制全部恢复码。请存放到密码管理器等安全位置。");
    } catch {
      setError("浏览器没有允许复制，请逐枚手动保存恢复码。");
    }
  }

  function resetMessages() {
    setError(null);
    setNotice(null);
  }

  return (
    <section className={styles.card} aria-labelledby="security-heading">
      <header className={styles.heading}>
        <div>
          <span className={styles.eyebrow}>SIGN-IN SECURITY</span>
          <h2 id="security-heading">登录安全</h2>
          <p>每次密码登录后，必须再使用身份验证器或一枚恢复码。</p>
        </div>
        <span className={styles.status}><i aria-hidden="true" />{initiallyEnabled ? "已启用" : "待设置"}</span>
      </header>

      {notice && <p className={styles.success} role="status">{notice}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      {!initiallyEnabled ? (
        <div className={styles.requiredSetup}>
          <p>进入应用前需要完成身份验证器绑定。</p>
          <Link href="/two-factor/setup?returnTo=%2Faccount">继续安全设置</Link>
        </div>
      ) : (
        <div className={styles.rows}>
          <div className={styles.row}>
            <span className={styles.rowIcon} aria-hidden="true"><KeyIcon /></span>
            <div className={styles.rowCopy}>
              <h3>身份验证器</h3>
              <p>已绑定标准 TOTP 应用；动态代码每 30 秒更新。</p>
            </div>
            <span className={styles.rowState}>已连接</span>
          </div>

          <div className={styles.row}>
            <span className={styles.rowIcon} aria-hidden="true"><RecoveryIcon /></span>
            <div className={styles.rowCopy}>
              <h3>恢复码</h3>
              <p>手机不可用时，用一次性恢复码完成登录。</p>
            </div>
            <Button
              className={styles.rowAction}
              onClick={() => {
                resetMessages();
                setShowRecoveryForm((visible) => !visible);
              }}
              size="small"
              type="button"
              variant="secondary"
            >
              {showRecoveryForm ? "取消" : "重新生成"}
            </Button>
          </div>
        </div>
      )}

      {showRecoveryForm && initiallyEnabled && (
        <form className={styles.reauth} onSubmit={regenerateCodes}>
          <div className={styles.field}>
            <label htmlFor="regenerate-codes-password">确认当前密码</label>
            <AuthPasswordInput
              id="regenerate-codes-password"
              name="password"
              autoComplete="current-password"
              minLength={8}
              maxLength={128}
              required
            />
          </div>
          <p>生成后，全部旧恢复码会立即失效。</p>
          <Button className={styles.confirmAction} disabled={pending} type="submit">
            {pending ? "正在生成…" : "确认并生成新恢复码"}
          </Button>
        </form>
      )}

      {recoveryCodes && (
        <div className={styles.recovery}>
          <p>这些恢复码只显示这一次。每枚只能使用一次，请立即安全保存。</p>
          <ul className={styles.codes} aria-label="新恢复码">
            {recoveryCodes.map((code) => <li key={code}><code>{code}</code></li>)}
          </ul>
          <div className={styles.actions}>
            <Button onClick={copyRecoveryCodes} type="button" variant="secondary">复制全部</Button>
            <Button onClick={() => setRecoveryCodes(null)} type="button" variant="ghost">我已保存</Button>
          </div>
        </div>
      )}

      <footer className={styles.policy}>
        <span>强制安全策略</span>
        <p>不允许关闭双因素认证，也不会用“信任此设备”跳过下一次登录验证。</p>
      </footer>
    </section>
  );
}

function managementErrorMessage(error: { code?: string } | null) {
  if (error?.code === "INVALID_PASSWORD") return "当前密码不正确。";
  if (error?.code === "TWO_FACTOR_NOT_ENABLED") return "身份验证器尚未启用。";
  return "操作未完成，请检查密码后重试。";
}

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <circle cx="8.5" cy="15.5" r="3.5" />
      <path d="m11 13 8-8m-3 3 2 2m-5 1 2 2" />
    </svg>
  );
}

function RecoveryIcon() {
  return (
    <svg viewBox="0 0 24 24">
      <path d="M5 8a8 8 0 1 1-1 7" />
      <path d="M5 3v5h5" />
      <path d="M12 8v4l2.5 1.5" />
    </svg>
  );
}
