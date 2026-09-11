import { Button } from "@/components/ui/button";
import { ButtonLink } from "@/components/ui/button-link";
import { AUTH_PATHS, safeReturnPath } from "@/core/auth/paths";
import type { AuthFailure } from "../lib/auth-failure";

export function AuthRecoveryAction({ recovery, returnTo, onRefresh }: {
  recovery: AuthFailure["recovery"];
  returnTo: string;
  onRefresh: () => void;
}) {
  if (recovery === "login") {
    return <ButtonLink href={`${AUTH_PATHS.login}?returnTo=${encodeURIComponent(safeReturnPath(returnTo))}`} variant="secondary">返回登录</ButtonLink>;
  }
  if (recovery === "refresh") {
    return <Button onClick={onRefresh} variant="secondary">刷新状态</Button>;
  }
  return null;
}
