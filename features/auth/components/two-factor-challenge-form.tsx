"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/services/api/auth/client";
import { AUTHENTICATOR_CODE_LENGTH, isAuthenticatorCode } from "@/core/auth/policy";
import { cn } from "@/lib/cn";
import styles from "./auth-form.module.css";

export function TwoFactorChallengeForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

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
        setError(challengeErrorMessage(result.error));
        setPending(false);
        return;
      }

      router.replace(returnTo);
      router.refresh();
    } catch {
      setError("网络暂时不可用，请稍后重试。");
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="two-factor-code">
          身份验证器 {AUTHENTICATOR_CODE_LENGTH} 位代码
        </label>
        <input
          className={styles.otpInput}
          id="two-factor-code"
          name="code"
          type="text"
          autoComplete="one-time-code"
          inputMode="numeric"
          pattern={`[0-9]{${AUTHENTICATOR_CODE_LENGTH}}`}
          minLength={AUTHENTICATOR_CODE_LENGTH}
          maxLength={AUTHENTICATOR_CODE_LENGTH}
          placeholder="000000"
          aria-describedby={error ? "two-factor-error" : undefined}
          aria-invalid={error ? true : undefined}
          required
        />
      </div>

      {error && <p className={styles.error} id="two-factor-error" role="alert">{error}</p>}

      <Button className={cn(styles.submit, "min-h-[3.25rem] rounded-[0.8125rem]")} disabled={pending} type="submit">
        {pending ? "正在验证…" : "验证并登录"}
      </Button>

    </form>
  );
}

function challengeErrorMessage(error: { code?: string; status?: number }): string {
  if (error.code === "ACCOUNT_TEMPORARILY_LOCKED" || error.status === 429) {
    return "验证失败次数过多，此账户已暂时锁定。请稍后再试。";
  }
  if (error.code === "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE") {
    return "本次验证尝试次数已用完，请返回登录页重新登录。";
  }
  if (error.code === "INVALID_TWO_FACTOR_COOKIE") {
    return "验证请求已过期，请返回登录页重新登录。";
  }
  return "代码无效或已经使用，请检查后重试。";
}
