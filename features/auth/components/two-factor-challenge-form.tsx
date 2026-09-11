"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/services/api/auth/client";
import { AUTHENTICATOR_CODE_LENGTH, isAuthenticatorCode } from "@/core/auth/policy";
import { cn } from "@/lib/cn";
import styles from "./auth-form.module.css";
import { Feedback } from "@/components/ui/feedback";
import { useSubmission } from "../lib/use-submission";
import { authFailure, type AuthFailure } from "../lib/auth-failure";
import { focusField } from "../lib/focus-field";
import { AuthRecoveryAction } from "./auth-recovery-action";

export function TwoFactorChallengeForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const error = failure?.message;
  const { pending, start, finish } = useSubmission();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || failure?.recovery) return;
    setFailure(null);

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
          enterKeyHint="done"
          readOnly={pending}
          pattern={`[0-9]{${AUTHENTICATOR_CODE_LENGTH}}`}
          minLength={AUTHENTICATOR_CODE_LENGTH}
          maxLength={AUTHENTICATOR_CODE_LENGTH}
          placeholder="000000"
          aria-describedby={error ? "two-factor-error" : undefined}
          aria-invalid={failure?.field === "code" || undefined}
          required
        />
      </div>

      <Feedback error={error} errorId="two-factor-error" />

      <AuthRecoveryAction recovery={failure?.recovery} returnTo={returnTo} onRefresh={() => router.refresh()} />
      <Button className={cn(styles.submit, "min-h-control-comfortable")} disabled={Boolean(failure?.recovery)} pending={pending} pendingLabel="正在验证…" type="submit">
        验证并登录
      </Button>

    </form>
  );
}
