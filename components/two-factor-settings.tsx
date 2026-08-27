"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { authClient } from "../lib/auth-client";
import { cn } from "../lib/cn";
import { Button } from "./ui/button";
import styles from "./two-factor-settings.module.css";

type Enrollment = {
  totpURI: string;
  secret: string;
  backupCodes: string[];
};

export function TwoFactorSettings({ initiallyEnabled }: { initiallyEnabled: boolean }) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function beginEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setPending(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    try {
      const result = await authClient.twoFactor.enable({ password, method: "totp" });
      if (result.error || !result.data || result.data.method !== "totp") {
        setError(managementErrorMessage(result.error));
        return;
      }

      const uri = new URL(result.data.totpURI);
      setEnrollment({
        totpURI: result.data.totpURI,
        secret: uri.searchParams.get("secret") ?? "",
        backupCodes: result.data.backupCodes,
      });
      setNotice("请先扫描二维码，再输入身份验证器生成的代码完成启用。");
      event.currentTarget.reset();
    } catch {
      setError("暂时无法开始设置，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  async function confirmEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment) return;
    resetMessages();
    setPending(true);
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").replaceAll(" ", "").trim();
    if (!/^\d{6}$/.test(code)) {
      setError("请输入身份验证器显示的 6 位数字。");
      setPending(false);
      return;
    }

    try {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        setError("动态代码无效，请等待新代码后重试。");
        return;
      }

      setEnabled(true);
      setRecoveryCodes(enrollment.backupCodes);
      setEnrollment(null);
      setNotice("双因素认证已启用。请立即保存下面的恢复码。");
      router.refresh();
    } catch {
      setError("暂时无法完成验证，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  async function regenerateCodes(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setPending(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    try {
      const result = await authClient.twoFactor.generateBackupCodes({ password });
      if (result.error || !result.data) {
        setError(managementErrorMessage(result.error));
        return;
      }
      setRecoveryCodes(result.data.backupCodes);
      setNotice("新的恢复码已经生成，旧恢复码已全部失效。");
      event.currentTarget.reset();
    } catch {
      setError("暂时无法生成恢复码，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  async function disableTwoFactor(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    resetMessages();
    setPending(true);
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");

    try {
      const result = await authClient.twoFactor.disable({ password });
      if (result.error) {
        setError(managementErrorMessage(result.error));
        return;
      }
      setEnabled(false);
      setEnrollment(null);
      setRecoveryCodes(null);
      setNotice("双因素认证已关闭，现有验证器和恢复码均已失效。");
      event.currentTarget.reset();
      router.refresh();
    } catch {
      setError("暂时无法关闭双因素认证，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  async function copyRecoveryCodes() {
    if (!recoveryCodes) return;
    try {
      await navigator.clipboard.writeText(recoveryCodes.join("\n"));
      setNotice("恢复码已复制。请存放到密码管理器等安全位置。");
    } catch {
      setError("浏览器未允许复制，请逐枚手动保存恢复码。");
    }
  }

  function resetMessages() {
    setError(null);
    setNotice(null);
  }

  return (
    <article className={styles.card}>
      <div className={styles.heading}>
        <span className={styles.eyebrow}>TWO-FACTOR AUTHENTICATION</span>
        <h2>身份验证器</h2>
        <p>登录密码之外，再使用每 30 秒变化一次的动态代码。</p>
      </div>

      <span className={cn(styles.status, enabled && styles.statusEnabled)}>
        <i aria-hidden="true" />{enabled ? "已启用" : enrollment ? "等待验证" : "未启用"}
      </span>

      {notice && <p className={styles.success} role="status">{notice}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}

      {!enabled && !enrollment && (
        <form className={styles.form} onSubmit={beginEnrollment}>
          <PasswordField id="enable-two-factor-password" label="确认当前密码" />
          <Button disabled={pending} type="submit">{pending ? "正在准备…" : "设置身份验证器"}</Button>
        </form>
      )}

      {enrollment && (
        <div className={styles.enrollment}>
          <div className={styles.qr} aria-label="身份验证器设置二维码">
            <QRCode size={176} title="身份验证器设置二维码" value={enrollment.totpURI} />
          </div>
          <div className={styles.secret}>
            <span>无法扫描？手动输入设置密钥</span>
            <code>{enrollment.secret}</code>
          </div>
          <form className={styles.form} onSubmit={confirmEnrollment}>
            <div className={styles.field}>
              <label htmlFor="confirm-two-factor-code">6 位动态代码</label>
              <input id="confirm-two-factor-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} placeholder="000000" required />
            </div>
            <div className={styles.actions}>
              <Button disabled={pending} type="submit">{pending ? "正在验证…" : "验证并启用"}</Button>
              <Button disabled={pending} onClick={() => { setEnrollment(null); resetMessages(); }} type="button" variant="ghost">取消</Button>
            </div>
          </form>
        </div>
      )}

      {recoveryCodes && (
        <div className={styles.enrollment}>
          <p className={styles.note}>每枚恢复码只能使用一次。它们不会再次自动显示，请离线保存，不要截图上传到云相册。</p>
          <ul className={styles.codes} aria-label="恢复码">
            {recoveryCodes.map((code) => <li key={code}><code>{code}</code></li>)}
          </ul>
          <div className={styles.actions}>
            <Button onClick={copyRecoveryCodes} type="button" variant="secondary">复制恢复码</Button>
            <Button onClick={() => { setRecoveryCodes(null); setNotice("恢复码已隐藏。"); }} type="button" variant="ghost">我已安全保存</Button>
          </div>
        </div>
      )}

      {enabled && !recoveryCodes && (
        <>
          <form className={styles.form} onSubmit={regenerateCodes}>
            <PasswordField id="regenerate-codes-password" label="确认密码后重新生成恢复码" />
            <Button disabled={pending} type="submit" variant="secondary">{pending ? "正在生成…" : "生成新的恢复码"}</Button>
            <p className={styles.note}>生成后，全部旧恢复码会立即失效。</p>
          </form>
          <form className={cn(styles.form, styles.danger)} onSubmit={disableTwoFactor}>
            <PasswordField id="disable-two-factor-password" label="确认密码后关闭双因素认证" />
            <Button disabled={pending} type="submit" variant="ghost">{pending ? "正在关闭…" : "关闭双因素认证"}</Button>
          </form>
        </>
      )}
    </article>
  );
}

function PasswordField({ id, label }: { id: string; label: string }) {
  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input id={id} name="password" type="password" autoComplete="current-password" minLength={8} maxLength={128} required />
    </div>
  );
}

function managementErrorMessage(error: { code?: string } | null): string {
  if (error?.code === "INVALID_PASSWORD") return "当前密码不正确。";
  if (error?.code === "TWO_FACTOR_NOT_ENABLED") return "双因素认证尚未启用，请刷新页面后重试。";
  return "操作未完成，请检查密码后重试。";
}
