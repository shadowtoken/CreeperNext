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
import { Feedback } from "@/components/ui/feedback";
import { useSubmission } from "../lib/use-submission";
import { authFailure, type AuthFailure } from "../lib/auth-failure";
import { focusField } from "../lib/focus-field";
import { AuthRecoveryAction } from "./auth-recovery-action";

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
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const error = failure?.message;
  const [notice, setNotice] = useState<string | null>(null);
  const { pending, start, finish } = useSubmission();

  async function beginEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || failure?.recovery) return;
    const formElement = event.currentTarget;
    resetMessages();
    if (!start()) return;
    const form = new FormData(formElement);
    const password = String(form.get("password") ?? "");

    try {
      const result = await authClient.twoFactor.enable({ password, method: "totp" });
      if (result.error) {
        setFailure(authFailure(result.error, "enroll"));
        return;
      }
      if (!result.data || result.data.method !== "totp") {
        setFailure(authFailure({}, "enroll"));
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
      setFailure(authFailure({}, "enroll"));
    } finally {
      finish();
    }
  }

  async function completeEnrollment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!enrollment || pending || failure?.recovery) return;
    resetMessages();
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").replaceAll(" ", "").trim();
    if (!isAuthenticatorCode(code)) {
      setFailure({ message: `请输入身份验证器显示的 ${AUTHENTICATOR_CODE_LENGTH} 位数字。`, field: "code" });
      focusField(event.currentTarget, "code");
      return;
    }

    if (!start()) return;
    try {
      const result = await authClient.twoFactor.verifyTotp({ code });
      if (result.error) {
        setFailure(authFailure(result.error, "verify"));
        finish();
        return;
      }

      router.replace(returnTo);
      router.refresh();
    } catch {
      setFailure(authFailure({ status: 0 }, "verify"));
      finish();
    }
  }

  async function copySetupSecret() {
    if (!enrollment || pending || failure?.recovery) return;
    resetMessages();
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setNotice("设置密钥已复制。");
    } catch {
      setFailure({ message: "浏览器没有允许复制，请手动选择设置密钥。" });
    }
  }

  function restartEnrollment() {
    setEnrollment(null);
    setStage("password");
    resetMessages();
  }

  function resetMessages() {
    setFailure(null);
    setNotice(null);
  }

  return (
    <div className={styles.flow}>
      <h1 className="sr-only">设置账户安全</h1>

      <div className={styles.messageRegion}>
        <Feedback error={error} errorId="enrollment-error" success={notice} />
        <AuthRecoveryAction recovery={failure?.recovery} returnTo={returnTo} onRefresh={() => router.refresh()} />
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
                visibilityLabel="当前密码"
                enterKeyHint="done"
                readOnly={pending}
                minLength={PASSWORD_MIN_LENGTH}
                maxLength={PASSWORD_MAX_LENGTH}
                aria-describedby={error ? "enrollment-error" : undefined}
                aria-invalid={failure?.field === "password" || undefined}
                required
              />
            </div>
            <Button
              className={styles.primaryAction}
              pending={pending}
              disabled={Boolean(failure?.recovery)}
              pendingLabel="正在生成安全密钥…"
              type="submit"
            >
              继续设置
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
                <button disabled={pending || Boolean(failure?.recovery)} onClick={copySetupSecret} type="button">复制</button>
              </div>
              <code data-enrollment-secret>{enrollment.secret}</code>
            </div>

            <form className={styles.form} onSubmit={completeEnrollment}>
              <div className={styles.field}>
                <label htmlFor="enrollment-code">输入身份验证器当前的 {AUTHENTICATOR_CODE_LENGTH} 位代码</label>
                <input className={styles.codeInput} id="enrollment-code" name="code" type="text" inputMode="numeric" enterKeyHint="done" readOnly={pending} autoComplete="one-time-code" pattern={`[0-9]{${AUTHENTICATOR_CODE_LENGTH}}`} minLength={AUTHENTICATOR_CODE_LENGTH} maxLength={AUTHENTICATOR_CODE_LENGTH} placeholder="000000" aria-describedby={error ? "enrollment-error" : undefined} aria-invalid={failure?.field === "code" || undefined} required />
              </div>
              <Button className={styles.primaryAction} disabled={Boolean(failure?.recovery)} pending={pending} pendingLabel="正在验证…" type="submit">验证并启用</Button>
              <Button disabled={pending || Boolean(failure?.recovery)} onClick={restartEnrollment} type="button" variant="ghost">重新生成二维码</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ShieldIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 3.2 19 6v5.4c0 4.4-2.8 7.7-7 9.4-4.2-1.7-7-5-7-9.4V6l7-2.8Z" />
      <path d="m9.4 12 1.7 1.7 3.8-4" />
    </svg>
  );
}
