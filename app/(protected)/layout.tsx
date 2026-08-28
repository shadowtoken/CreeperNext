import type { ReactNode } from "react";
import { requireTwoFactorSession } from "../../server/auth";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireTwoFactorSession("/account");
  return children;
}
