import type { ReactNode } from "react";
import { requireSession } from "../../server/auth";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  await requireSession("/account");
  return children;
}
