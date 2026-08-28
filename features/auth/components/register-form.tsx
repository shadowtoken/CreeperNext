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

export function RegisterForm({ returnTo }: { returnTo: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirmation = String(form.get("confirmation") ?? "");

    if (password !== confirmation) {
      setError("两次输入的密码不一致。");
      return;
    }

    setPending(true);
    try {
      const result = await authClient.signUp.email({ name, email, password });

      if (result.error) {
        setError("暂时无法创建账户，请检查信息后重试。");
        setPending(false);
        return;
      }

      router.replace(`${AUTH_PATHS.login}?registered=1&returnTo=${encodeURIComponent(returnTo)}`);
      router.refresh();
    } catch {
      setError("网络暂时不可用，请稍后重试。");
      setPending(false);
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
          maxLength={80}
          placeholder="你的名字"
          aria-describedby={error ? "register-error" : undefined}
          aria-invalid={error ? true : undefined}
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
          inputMode="email"
          placeholder="you@example.com"
          aria-describedby={error ? "register-error" : undefined}
          aria-invalid={error ? true : undefined}
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
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            placeholder={`至少 ${PASSWORD_MIN_LENGTH} 位`}
            aria-describedby={error ? "register-password-hint register-error" : "register-password-hint"}
            aria-invalid={error ? true : undefined}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="register-confirmation">确认密码</label>
          <AuthPasswordInput
            id="register-confirmation"
            name="confirmation"
            autoComplete="new-password"
            minLength={PASSWORD_MIN_LENGTH}
            maxLength={PASSWORD_MAX_LENGTH}
            placeholder="再次输入"
            aria-describedby={error ? "register-error" : undefined}
            aria-invalid={error ? true : undefined}
            required
          />
        </div>
      </div>
      {error && <p className={styles.error} id="register-error" role="alert">{error}</p>}
      <Button className={cn(styles.submit, "min-h-[3.25rem] rounded-[0.8125rem]")} disabled={pending} type="submit">
        {pending ? "正在创建…" : "创建账户"}
      </Button>
    </form>
  );
}
