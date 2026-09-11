import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SecuritySetupShell, TwoFactorEnrollment } from "@/features/auth/setup";
import { AUTH_PATHS, safeReturnPath } from "@/core/auth/paths";
import { getSession } from "@/server/auth";

export const metadata: Metadata = {
  title: "保护账户",
  description: "绑定身份验证器并完成二次验证。",
  robots: { index: false, follow: false },
};

export default async function TwoFactorSetupPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const returnTo = safeReturnPath((await searchParams).returnTo);
  const session = await getSession();

  if (!session) {
    redirect(`${AUTH_PATHS.login}?returnTo=${encodeURIComponent(returnTo)}`);
  }
  if (session.user.twoFactorEnabled) {
    redirect(
      session.session.mfaVerifiedAt
        ? returnTo
        : `${AUTH_PATHS.login}?reauth=1&returnTo=${encodeURIComponent(returnTo)}`,
    );
  }

  return (
    <SecuritySetupShell>
      <TwoFactorEnrollment returnTo={returnTo} />
    </SecuritySetupShell>
  );
}
