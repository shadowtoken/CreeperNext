"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/core/auth/policy";
import { authClient } from "@/services/api/auth/client";
import { AuthPasswordInput } from "./auth-password-input";
import styles from "./change-password-form.module.css";

export function ChangePasswordForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    setMessage(null);
    setError(null);

    const data = new FormData(formElement);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirmation = String(data.get("confirmation") ?? "");

    if (newPassword.length < PASSWORD_MIN_LENGTH) {
      setError(`新密码至少需要 ${PASSWORD_MIN_LENGTH} 位字符。`);
      return;
    }
    if (newPassword !== confirmation) {
      setError("两次输入的新密码不一致。");
      return;
    }

    setPending(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });

      if (result.error) {
        setError("当前密码不正确，或新密码不可用。");
        return;
      }

      formElement.reset();
      setMessage("密码已修改，其他设备上的会话已经退出。");
    } catch {
      setError("网络暂时不可用，请稍后重试。");
    } finally {
      setPending(false);
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
          autoComplete="current-password"
          maxLength={PASSWORD_MAX_LENGTH}
          aria-describedby={describedBy}
          aria-invalid={error ? true : undefined}
          required
        />
      </div>

      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <label htmlFor="new-password">新密码</label>
          <AuthPasswordInput
            id="new-password"
            name="newPassword"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="confirm-password">确认新密码</label>
          <AuthPasswordInput
            id="confirm-password"
            name="confirmation"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            aria-describedby={describedBy}
            aria-invalid={error ? true : undefined}
            required
          />
        </div>
      </div>

      {error && <p className={styles.error} id="change-password-error" role="alert">{error}</p>}
      {message && <p className={styles.success} role="status">{message}</p>}

      <Button className={styles.submit} disabled={pending} type="submit">
        {pending ? "正在保存…" : "修改密码"}
      </Button>
    </form>
  );
}
