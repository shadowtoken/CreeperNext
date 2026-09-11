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

export function LoginForm({
  registered = false,
  returnTo,
}: {
  registered?: boolean;
  returnTo: string;
}) {
  const router = useRouter();
  const [failure, setFailure] = useState<AuthFailure | null>(null);
  const error = failure?.message;
  const credentialsInvalid = failure?.field === "credentials";
  const { pending, start, finish } = useSubmission();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!start()) return;
    setFailure(null);

    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim();
    const password = String(form.get("password") ?? "");
    try {
      const result = await authClient.signIn.email({ email, password });

      if (result.error) {
        setFailure(authFailure(result.error, "login"));
        finish();
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
      setFailure(authFailure({ status: 0 }, "login"));
      finish();
    }
  }

  const descriptionIds = [
    registered ? "login-notice" : null,
    error ? "login-error" : null,
  ].filter(Boolean).join(" ") || undefined;

  return (
    <form className={cn(styles.form, "@container/form")} onSubmit={handleSubmit}>
      <Feedback success={registered ? "账户已创建；登录后继续绑定身份验证器。" : null} successId="login-notice" />
      <div className={styles.field}>
        <label htmlFor="login-email">邮箱</label>
        <input
          id="login-email"
          name="email"
          type="email"
          autoComplete="email"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          readOnly={pending}
          inputMode="email"
          placeholder="you@example.com"
          aria-describedby={descriptionIds}
          aria-invalid={credentialsInvalid || undefined}
          required
        />
      </div>
      <div className={styles.field}>
        <label htmlFor="login-password">密码</label>
        <AuthPasswordInput
          id="login-password"
          name="password"
          autoComplete="current-password"
          enterKeyHint="done"
          readOnly={pending}
          minLength={PASSWORD_MIN_LENGTH}
          maxLength={PASSWORD_MAX_LENGTH}
          placeholder={`至少 ${PASSWORD_MIN_LENGTH} 位`}
          aria-describedby={descriptionIds}
          aria-invalid={credentialsInvalid || undefined}
          required
        />
      </div>
      <Feedback error={error} errorId="login-error" />
      <Button className={cn(styles.submit, "min-h-control-comfortable")} pending={pending} pendingLabel="正在登录…" type="submit">
        登录
      </Button>
    </form>
  );
}
