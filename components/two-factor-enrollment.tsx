"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import QRCode from "react-qr-code";
import { authClient } from "../lib/auth-client";
import { AuthPasswordInput } from "./auth-password-input";
import { Button } from "./ui/button";
import styles from "./two-factor-enrollment.module.css";

type Stage = "password" | "scan" | "recovery";

type Enrollment = {
  totpURI: string;
  secret: string;
  backupCodes: string[];
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
  const [codesSaved, setCodesSaved] = useState(false);

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
        backupCodes: result.data.backupCodes,
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
    if (!/^\d{6}$/.test(code)) {
      setError("请输入身份验证器显示的 6 位数字。");
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

  async function copyRecoveryCodes() {
    if (!enrollment) return;
    resetMessages();
    try {
      await navigator.clipboard.writeText(enrollment.backupCodes.join("\n"));
      setNotice("已复制全部恢复码。请粘贴到密码管理器等安全位置。");
    } catch {
      setError("浏览器没有允许复制，请逐枚手动保存恢复码。");
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

  function continueToRecovery() {
    setStage("recovery");
    setCodesSaved(false);
    resetMessages();
  }

  function returnToScanner() {
    setStage("scan");
    setCodesSaved(false);
    resetMessages();
  }

  function restartEnrollment() {
    setEnrollment(null);
    setStage("password");
    setCodesSaved(false);
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
                minLength={8}
                maxLength={128}
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

            <div className={styles.form}>
              <Button className={styles.primaryAction} onClick={continueToRecovery} type="button">
                我已扫描，继续
              </Button>
              <Button onClick={restartEnrollment} type="button" variant="ghost">
                重新生成二维码
              </Button>
            </div>
          </div>
        </div>
      )}

      {stage === "recovery" && enrollment && (
        <form className={styles.recoveryStage} onSubmit={completeEnrollment}>
          <div className={styles.recoveryNotice}>
            <span aria-hidden="true">!</span>
            <p>先保存恢复码，再输入动态代码完成绑定。验证成功以前，账户仍不会进入受保护应用。</p>
          </div>

          <ul className={styles.codes} aria-label="账户恢复码">
            {enrollment.backupCodes.map((code) => (
              <li key={code}><code>{code}</code></li>
            ))}
          </ul>

          <Button className={styles.copyAction} onClick={copyRecoveryCodes} type="button" variant="secondary">
            复制全部恢复码
          </Button>

          <label className={styles.confirmation}>
            <input
              checked={codesSaved}
              onChange={(event) => setCodesSaved(event.currentTarget.checked)}
              type="checkbox"
            />
            <span>我已经把恢复码保存到安全位置</span>
          </label>

          <div className={styles.field}>
            <label htmlFor="enrollment-code">输入身份验证器当前的 6 位代码</label>
            <input
              className={styles.codeInput}
              id="enrollment-code"
              name="code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              minLength={6}
              maxLength={6}
              placeholder="000000"
              aria-describedby={error ? "enrollment-error" : undefined}
              aria-invalid={error ? true : undefined}
              required
            />
          </div>

          <Button
            className={styles.primaryAction}
            disabled={!codesSaved || pending}
            type="submit"
          >
            {pending ? "正在验证…" : "保存并完成设置"}
          </Button>
          <Button disabled={pending} onClick={returnToScanner} type="button" variant="ghost">
            返回二维码
          </Button>
        </form>
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
