import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_PATHS, safeReturnPath } from "@/core/auth/paths";
import { auth } from "./auth-config";

export const getSession = cache(async function getSession() {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export async function requireSession(returnTo: string = AUTH_PATHS.account) {
  const session = await getSession();
  if (!session) {
    redirect(`${AUTH_PATHS.login}?returnTo=${encodeURIComponent(safeReturnPath(returnTo))}`);
  }
  return session;
}

/**
 * Product routes require more than a valid password session: every account
 * must finish authenticator enrollment before it can enter the protected app.
 * Keep this check on the server so a client-side redirect cannot be bypassed.
 */
export async function requireTwoFactorSession(returnTo: string = AUTH_PATHS.account) {
  const safeReturnTo = safeReturnPath(returnTo);
  const session = await requireSession(safeReturnTo);

  if (!session.user.twoFactorEnabled) {
    redirect(`${AUTH_PATHS.twoFactorSetup}?returnTo=${encodeURIComponent(safeReturnTo)}`);
  }

  if (!session.session.mfaVerifiedAt) {
    redirect(`${AUTH_PATHS.login}?reauth=1&returnTo=${encodeURIComponent(safeReturnTo)}`);
  }

  return session;
}
