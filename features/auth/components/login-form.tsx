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

export function LoginForm({
  registered = false,
  returnTo,
}: {
  registered?: boolean;
  returnTo: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    try {
      const result = await authClient.signIn.email({ email, password });

      if (result.error) {
        setError("邮箱或密码不正确，请重新检查。");
        setPending(false);
        return;
      }

      if (result.data && "twoFactorRedirect" in result.data && result.data.twoFactorRedirect) {
        router.replace(`${AUTH_PATHS.twoFactor}?returnTo=${encodeURIComponent(returnTo)}`);
        router.refresh();
        return;
      }

      // A successful password sign-in still passes through the server-owned
      // enrollment gate. Enrolled users are forwarded immediately; new users
      // must bind and verify an authenticator first.
      router.replace(`${AUTH_PATHS.twoFactorSetup}?returnTo=${encodeURIComponent(returnTo)}`);
      router.refresh();
    } catch {
      setError("网络暂时不可用，请稍后重试。");
      setPending(false);
    }
  }

  const descriptionIds = [
    registered ? "login-notice" : null,
    error ? "login-error" : null,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <form className={cn(styles.form, "@container/form")} onSubmit={handleSubmit}>
      {registered && (
        <p className={styles.success} id="login-notice" role="status">
          账户已创建；登录后继续绑定身份验证器。
        </p>
      )}
      <div className={styles.field}>
        <label htmlFor="login-email">邮箱</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          placeholder="you@example.com"
          aria-describedby={descriptionIds}
          aria-invalid={error ? true : undefined}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="login-password">密码</label>
        <AuthPasswordInput
          id="login-password"
          name="password"
          autoComplete="current-password"
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          placeholder={`至少 ${PASSWORD_MIN_LENGTH} 位`}
          aria-describedby={descriptionIds}
          aria-invalid={error ? true : undefined}
          required
        />
      </div>
      {error && <p className={styles.error} id="login-error" role="alert">{error}</p>}
      <Button className={cn(styles.submit, "min-h-[3.25rem] rounded-[0.8125rem]")} disabled={pending} type="submit">
        {pending ? "正在登录…" : "登录"}
      </Button>
    </form>
  );
}
