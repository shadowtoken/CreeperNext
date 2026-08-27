"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "../lib/auth-client";
import styles from "./sign-out-button.module.css";

export function SignOutButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function signOut() {
    setPending(true);
    await authClient.signOut();
    router.replace("/");
    router.refresh();
  }

  return (
    <button className={styles.root} disabled={pending} onClick={signOut} type="button">
      {pending ? "正在退出…" : "退出登录"}
    </button>
  );
}
