"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/services/api/auth/client";
import { cn } from "@/lib/cn";
import { AuthPasswordInput } from "./auth-password-input";
import { Button } from "@/components/ui/button";
import { AUTH_PATHS } from "@/core/auth/paths";
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH } from "@/core/auth/policy";
import styles from "./auth-form.module.css";
import { Feedback } from "@/components/ui/feedback";
import { useSubmission } from "../lib/use-submission";
import { authFailure, type AuthFailure } from "../lib/auth-failure";
import { focusField } from "../lib/focus-field";

export function RegisterForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const error = failure?.message;
  const { pending, start, finish } = useSubmission();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setFailure(null);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (!name) {
      setFailure({ message: "请输入称呼，不能只包含空格。", field: "name" });
      focusField(event.currentTarget, "name");
      return;
    }
    if (password !== confirmation) {
      setFailure({ message: "两次输入的密码不一致。", field: "confirmation" });
      focusField(event.currentTarget, "confirmation");
      return;
    }

    if (!start()) return;
    try {
      const result = await authClient.signUp.email({ name, email, password });

      if (result.error) {
        setFailure(authFailure(result.error, "register"));
        finish();
        return;
      }

      router.replace(`${AUTH_PATHS.login}?registered=1&returnTo=${encodeURIComponent(returnTo)}`);
      router.refresh();
    } catch {
      setFailure(authFailure({ status: 0 }, "register"));
      finish();
    }
  }

  return (
    <form className={cn(styles.form, "@container/form")} onSubmit={handleSubmit}>
      <div className={styles.field}>
        <label htmlFor="register-name">称呼</label>
        <input
          id="register-name"
          name="name"
          type="text"
          autoComplete="name"
          readOnly={pending}
          maxLength={80}
          placeholder="你的名字"
          aria-invalid={failure?.field === "name" || undefined}
          aria-describedby={error ? "register-error" : undefined}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="register-email">邮箱</label>
        <input
          id="register-email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          readOnly={pending}
          inputMode="email"
          placeholder="you@example.com"
          aria-describedby={error ? "register-error" : undefined}
          required
        />
      </div>
      <div className={styles.fieldGrid}>
        <div className={styles.field}>
          <div className={styles.labelRow}>
            <label htmlFor="register-password">密码</label>
            <span className={styles.hint} id="register-password-hint">至少 {PASSWORD_MIN_LENGTH} 位字符</span>
          </div>
          <AuthPasswordInput
            id="register-password"
            name="password"
            autoComplete="new-password"
            readOnly={pending}
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            placeholder={`至少 ${PASSWORD_MIN_LENGTH} 位`}
            aria-invalid={failure?.field === "password" || undefined}
            aria-describedby={error ? "register-password-hint register-error" : "register-password-hint"}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="register-confirmation">确认密码</label>
          <AuthPasswordInput
            id="register-confirmation"
            name="confirmation"
            visibilityLabel="确认密码"
            autoComplete="new-password"
            enterKeyHint="done"
            readOnly={pending}
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            placeholder="再次输入"
            aria-describedby={error ? "register-error" : undefined}
            aria-invalid={failure?.field === "confirmation" || undefined}
            required
          />
        </div>
      </div>
      <Feedback error={error} errorId="register-error" />
      <Button className={cn(styles.submit, "min-h-control-comfortable")} pending={pending} pendingLabel="正在创建…" type="submit">
        创建账户
      </Button>
    </form>
  );
}
