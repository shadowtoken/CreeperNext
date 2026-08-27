"use client";

import type { FormEvent } from "react";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";
import { Button } from "./ui/button";
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

      router.replace(`/login?registered=1&returnTo=${encodeURIComponent(returnTo)}`);
      router.refresh();
    } catch {
      setError("网络暂时不可用，请稍后重试。");
      setPending(false);
    }
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
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
          <label htmlFor="register-password">密码</label>
          <input
            id="register-password"
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            placeholder="至少 8 位"
            aria-describedby={error ? "register-error" : undefined}
            aria-invalid={error ? true : undefined}
            required
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="register-confirmation">确认密码</label>
          <input
            id="register-confirmation"
            name="confirmation"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={128}
            placeholder="再次输入"
            aria-describedby={error ? "register-error" : undefined}
            aria-invalid={error ? true : undefined}
            required
          />
        </div>
      </div>
      {error && <p className={styles.error} id="register-error" role="alert">{error}</p>}
      <Button className={styles.submit} disabled={pending} type="submit">
        {pending ? "正在创建…" : "创建账户"}
        <span aria-hidden="true">→</span>
      </Button>
    </form>
  );
}
