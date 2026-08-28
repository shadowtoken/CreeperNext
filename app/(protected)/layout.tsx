import type { ReactNode } from "react";
import { AUTH_PATHS } from "@/core/auth/paths";
import { requireTwoFactorSession } from "@/server/auth";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireTwoFactorSession(AUTH_PATHS.account);
  return children;
}
