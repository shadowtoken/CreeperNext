"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/core/auth/policy";
import { authClient } from "@/services/api/auth/client";
import { AuthPasswordInput } from "./auth-password-input";
import styles from "./change-password-form.module.css";
import { Feedback } from "@/components/ui/feedback";
import { useSubmission } from "../lib/use-submission";
import { authFailure, type AuthFailure } from "../lib/auth-failure";
import { focusField } from "../lib/focus-field";
import { AuthRecoveryAction } from "./auth-recovery-action";
import { AUTH_PATHS } from "@/core/auth/paths";

export function ChangePasswordForm() {
  const router = useRouter();
  const { pending, start, finish } = useSubmission();
  const [message, setMessage] = useState<string | null>(null);
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const error = failure?.message;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || failure?.recovery) return;
    const formElement = event.currentTarget;
    setMessage(null);
    setFailure(null);

    const data = new FormData(formElement);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setFailure({ message: `新密码至少需要 ${PASSWORD_MIN_LENGTH} 位字符。`, field: "newPassword" });
      focusField(formElement, "newPassword");
      return;
    }
    if (newPassword !== confirmation) {
      setFailure({ message: "两次输入的新密码不一致。", field: "confirmation" });
      focusField(formElement, "confirmation");
      return;
    }

    if (!start()) return;
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        setFailure(authFailure(result.error, "change-password"));
        return;
      }

      formElement.reset();
      setMessage("密码已修改，其他设备上的会话已经退出。");
    } catch {
      setFailure(authFailure({ status: 0 }, "change-password"));
    } finally {
      finish();
    }
  }

  const describedBy = error ? "change-password-error" : undefined;

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="current-password">当前密码</label>
        <AuthPasswordInput
          id="current-password"
          name="currentPassword"
          visibilityLabel="当前密码"
          autoComplete="current-password"
          readOnly={pending}
          maxLength={PASSWORD_MAX_LENGTH}
          aria-describedby={describedBy}
          aria-invalid={failure?.field === "currentPassword" || undefined}
          required
        />
      </div>

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="new-password">新密码</label>
          <AuthPasswordInput
            id="new-password"
            name="newPassword"
            visibilityLabel="新密码"
            autoComplete="new-password"
            readOnly={pending}
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            aria-describedby={describedBy}
            aria-invalid={failure?.field === "newPassword" || undefined}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="confirm-password">确认新密码</label>
          <AuthPasswordInput
            id="confirm-password"
            name="confirmation"
            visibilityLabel="确认新密码"
            autoComplete="new-password"
            enterKeyHint="done"
            readOnly={pending}
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            aria-describedby={describedBy}
            aria-invalid={failure?.field === "confirmation" || undefined}
            required
          />
        </div>
      </div>

      <Feedback error={error} errorId="change-password-error" success={message} />

      <AuthRecoveryAction recovery={failure?.recovery} returnTo={AUTH_PATHS.account} onRefresh={() => router.refresh()} />
      <Button className={styles.submit} disabled={Boolean(failure?.recovery)} pending={pending} pendingLabel="正在保存…" type="submit">
        修改密码
      </Button>
    </form>
  );
}
