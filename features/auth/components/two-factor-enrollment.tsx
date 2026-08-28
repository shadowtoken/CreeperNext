"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { authClient } from "@/services/api/auth/client";
import { AuthPasswordInput } from "./auth-password-input";
import { Button } from "@/components/ui/button";
import {
  AUTHENTICATOR_CODE_LENGTH,
  PASSWORD_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
  isAuthenticatorCode,
} from "@/core/auth/policy";
import styles from "./two-factor-enrollment.module.css";

type Stage = "password" | "scan";

type Enrollment = {
  totpURI: string;
  secret: string;
};

export function TwoFactorEnrollment({
  returnTo,
}: {
  returnTo: string;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<Stage>("password");
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function beginEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    resetMessages();
    setPending(true);
    const form = new FormData(formElement);
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
      });
      setStage("scan");
      formElement.reset();
    } catch {
      setError("暂时无法生成安全密钥，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  async function completeEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment) return;
    resetMessages();
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").replaceAll(" ", "").trim();
    if (!isAuthenticatorCode(code)) {
      setError(`请输入身份验证器显示的 ${AUTHENTICATOR_CODE_LENGTH} 位数字。`);
      return;
    }

    setPending(true);
    try {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        setError("动态代码无效。等待身份验证器生成新代码后再试一次。");
        return;
      }

      router.replace(returnTo);
      router.refresh();
    } catch {
      setError("暂时无法完成验证，请稍后重试。");
    } finally {
      setPending(false);
    }
  }

  async function copySetupSecret() {
    if (!enrollment) return;
    resetMessages();
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setNotice("设置密钥已复制。");
    } catch {
      setError("浏览器没有允许复制，请手动选择设置密钥。");
    }
  }

  function restartEnrollment() {
    setEnrollment(null);
    setStage("password");
    resetMessages();
  }

  function resetMessages() {
    setError(null);
    setNotice(null);
  }

  return (
    <div className={styles.flow}>
      <h1 className="sr-only">设置账户安全</h1>

      <div className={styles.messageRegion} aria-live="polite">
        {notice && <p className={styles.notice} role="status">{notice}</p>}
        {error && <p className={styles.error} id="enrollment-error" role="alert">{error}</p>}
      </div>

      {stage === "password" && (
        <div className={styles.passwordStage}>
          <div className={styles.assurance}>
            <span className={styles.shield} aria-hidden="true">
              <ShieldIcon />
            </span>
            <div>
              <strong>密码泄露时，第二因素仍能保护账户。</strong>
              <p>支持任意标准 TOTP 应用，例如 1Password、Bitwarden、Google Authenticator 或 Microsoft Authenticator。</p>
            </div>
          </div>

          <form className={styles.form} onSubmit={beginEnrollment}>
            <div className={styles.field}>
              <label htmlFor="enrollment-password">确认当前密码</label>
              <AuthPasswordInput
                id="enrollment-password"
                name="password"
                autoComplete="current-password"
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                aria-describedby={error ? "enrollment-error" : undefined}
                aria-invalid={error ? true : undefined}
                required
              />
            </div>
            <Button
              className={styles.primaryAction}
              disabled={pending}
              type="submit"
            >
              {pending ? "正在生成安全密钥…" : "继续设置"}
            </Button>
          </form>
        </div>
      )}

      {stage === "scan" && enrollment && (
        <div className={styles.scanStage}>
          <div className={styles.qrPanel}>
            <div className={styles.qr} aria-label="身份验证器设置二维码">
              <QRCode size={196} title="身份验证器设置二维码" value={enrollment.totpURI} />
            </div>
            <p>使用身份验证器扫描二维码</p>
          </div>

          <div className={styles.scanInstructions}>
            <div className={styles.instruction}>
              <span>1</span>
              <div>
                <strong>添加新账户</strong>
                <p>在身份验证器中选择“扫描二维码”。</p>
              </div>
            </div>

            <div className={styles.manualKey}>
              <div>
                <span>无法扫描？手动输入密钥</span>
                <button onClick={copySetupSecret} type="button">复制</button>
              </div>
              <code data-enrollment-secret>{enrollment.secret}</code>
            </div>

            <form className={styles.form} onSubmit={completeEnrollment}>
              <div className={styles.field}>
                <label htmlFor="enrollment-code">输入身份验证器当前的 {AUTHENTICATOR_CODE_LENGTH} 位代码</label>
                <input className={styles.codeInput} id="enrollment-code" name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern={`[0-9]{${AUTHENTICATOR_CODE_LENGTH}}`} minLength={AUTHENTICATOR_CODE_LENGTH} maxLength={AUTHENTICATOR_CODE_LENGTH} placeholder="000000" aria-describedby={error ? "enrollment-error" : undefined} aria-invalid={error ? true : undefined} required />
              </div>
              <Button className={styles.primaryAction} disabled={pending} type="submit">{pending ? "正在验证…" : "验证并启用"}</Button>
              <Button onClick={restartEnrollment} type="button" variant="ghost">重新生成二维码</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function managementErrorMessage(error: { code?: string } | null) {
  if (error?.code === "INVALID_PASSWORD") return "当前密码不正确。";
  if (error?.code === "TWO_FACTOR_ALREADY_ENABLED") return "身份验证器已经启用，正在刷新账户状态。";
  return "无法开始设置，请检查密码后重试。";
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.2 19 6v5.4c0 4.4-2.8 7.7-7 9.4-4.2-1.7-7-5-7-9.4V6l7-2.8Z" />
      <path d="m9.4 12 1.7 1.7 3.8-4" />
    </svg>
  );
}
