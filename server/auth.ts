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

/**
 * Product routes require more than a valid password session: every account
 * must finish authenticator enrollment before it can enter the protected app.
 * Keep this check on the server so a client-side redirect cannot be bypassed.
 */
export async function requireTwoFactorSession(returnTo = "/account") {
  const safeReturnTo = safeReturnPath(returnTo);
  const session = await requireSession(safeReturnTo);

  if (!session.user.twoFactorEnabled) {
    redirect(`/two-factor/setup?returnTo=${encodeURIComponent(safeReturnTo)}`);
  }

  if (!session.session.mfaVerifiedAt) {
    redirect(`/login?reauth=1&returnTo=${encodeURIComponent(safeReturnTo)}`);
  }

  return session;
}
