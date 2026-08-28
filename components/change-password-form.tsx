"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { authClient } from "../lib/auth-client";
import { Button } from "./ui/button";
import styles from "./change-password-form.module.css";

export function ChangePasswordForm() {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setMessage(null); setError(null);
    const data = new FormData(event.currentTarget);
    const currentPassword = String(data.get("currentPassword") ?? "");
    const newPassword = String(data.get("newPassword") ?? "");
    const confirm = String(data.get("confirmPassword") ?? "");
    if (newPassword.length < 8) return setError("新密码至少需要 8 位字符。");
    if (newPassword !== confirm) return setError("两次输入的新密码不一致。");
    setPending(true);
    const result = await authClient.changePassword({ currentPassword, newPassword, revokeOtherSessions: false });
    if (result.error) setError("当前密码不正确，或新密码不可用。");
    else { setMessage("密码已修改。"); event.currentTarget.reset(); }
    setPending(false);
  }

  return <form className={styles.form} onSubmit={submit}>
    <div className={styles.field}><label htmlFor="current-password">当前密码</label><input id="current-password" name="currentPassword" type="password" autoComplete="current-password" required /></div>
    <div className={styles.field}><label htmlFor="new-password">新密码</label><input id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} required /></div>
    <div className={styles.field}><label htmlFor="confirm-password">确认新密码</label><input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required /></div>
    {error && <p role="alert" className={styles.error}>{error}</p>}{message && <p role="status" className={styles.success}>{message}</p>}
    <Button type="submit" disabled={pending}>{pending ? "正在保存…" : "修改密码"}</Button>
  </form>;
}
