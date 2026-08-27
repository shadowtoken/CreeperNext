import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { safeReturnPath } from "../lib/auth-paths";
import { auth } from "./auth-config";

export const getSession = cache(async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export async function requireSession(returnTo = "/account") {
  const session = await getSession();
  if (!session) {
    redirect(`/login?returnTo=${encodeURIComponent(safeReturnPath(returnTo))}`);
  }
  return session;
}
