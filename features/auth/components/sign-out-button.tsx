"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { authClient } from "@/services/api/auth/client";

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
    <Button disabled={pending} onClick={signOut} size="small" type="button" variant="ghost">
      {pending ? "正在退出…" : "退出登录"}
    </Button>
  );
}
