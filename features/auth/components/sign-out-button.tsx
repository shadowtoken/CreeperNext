"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Feedback } from "@/components/ui/feedback";
import { authClient } from "@/services/api/auth/client";
import { useSubmission } from "../lib/use-submission";
import { authFailure } from "../lib/auth-failure";

export function SignOutButton() {
  const router = useRouter();
  const { pending, start, finish } = useSubmission();
  const [error, setError] = useState<string | null>(null);

  async function signOut() {
    if (!start()) return;
    setError(null);
    try {
      const result = await authClient.signOut();
      if (result.error) {
        setError(authFailure(result.error, "sign-out").message);
        finish();
        return;
      }
      router.replace("/");
      router.refresh();
    } catch {
      setError(authFailure({ status: 0 }, "sign-out").message);
      finish();
    }
  }

  return (
    <div className="grid min-w-0 max-w-64 gap-2">
      <Button pending={pending} pendingLabel="正在退出…" onClick={signOut} size="small" type="button" variant="ghost" aria-describedby={error ? "sign-out-error" : undefined}>
        退出登录
      </Button>
      <Feedback error={error} errorId="sign-out-error" />
    </div>
  );
}
