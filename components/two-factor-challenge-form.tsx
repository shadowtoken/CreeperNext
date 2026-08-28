"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";
import { cn } from "../lib/cn";
import { Button } from "./ui/button";
import styles from "./auth-form.module.css";

type ChallengeMode = "totp" | "backup";

export function TwoFactorChallengeForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<ChallengeMode>("totp");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") ?? "").replaceAll(" ", "").trim();
    if (mode === "totp" && !/^\d{6}$/.test(code)) {
      setError("请输入身份验证器显示的 6 位数字。");
      return;
    }
    if (mode === "backup" && code.length < 6) {
      setError("请输入一枚完整的恢复码。");
      return;
    }

    setPending(true);
    try {
      const result = mode === "totp"
        ? await authClient.twoFactor.verifyTotp({ code })
        : await authClient.twoFactor.verifyBackupCode({
            code,
            disableSession: false,
          });

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

  function switchMode(nextMode: ChallengeMode) {
    setMode(nextMode);
    setError(null);
  }

  return (
    <form className={cn(styles.form, "@container/form")} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="two-factor-code">
          {mode === "totp" ? "身份验证器代码" : "恢复码"}
        </label>
        <input
          className={mode === "totp" ? styles.otpInput : undefined}
          key={mode}
          id="two-factor-code"
          name="code"
          type="text"
          autoComplete="one-time-code"
          inputMode={mode === "totp" ? "numeric" : "text"}
          pattern={mode === "totp" ? "[0-9]{6}" : undefined}
          minLength={mode === "totp" ? 6 : undefined}
          maxLength={mode === "totp" ? 6 : 32}
          placeholder={mode === "totp" ? "000000" : "输入一枚未使用的恢复码"}
          aria-describedby={error ? "two-factor-error" : undefined}
          aria-invalid={error ? true : undefined}
          required
        />
      </div>

      {error && <p className={styles.error} id="two-factor-error" role="alert">{error}</p>}

      <Button className={cn(styles.submit, "min-h-[3.25rem] rounded-[0.8125rem]")} disabled={pending} type="submit">
        {pending ? "正在验证…" : "验证并登录"}
      </Button>

      <button
        className={styles.modeSwitch}
        disabled={pending}
        onClick={() => switchMode(mode === "totp" ? "backup" : "totp")}
        type="button"
      >
        {mode === "totp" ? "无法使用验证器？改用恢复码" : "返回身份验证器代码"}
      </button>
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
