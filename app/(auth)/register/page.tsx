import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "../../../components/auth-shell";
import { RegisterForm } from "../../../components/register-form";
import { safeReturnPath } from "../../../lib/auth-paths";
import { getSession } from "../../../server/auth";

export const metadata: Metadata = {
  title: "创建账户",
  description: "创建 CreeperNext 账户，开始搭建你的产品。",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const returnTo = safeReturnPath((await searchParams).returnTo);
  const session = await getSession();
  if (session) {
    if (!session.user.twoFactorEnabled) {
      redirect(`/two-factor/setup?returnTo=${encodeURIComponent(returnTo)}`);
    }
    redirect(
      session.session.mfaVerifiedAt
        ? returnTo
        : `/login?reauth=1&returnTo=${encodeURIComponent(returnTo)}`,
    );
  }

  return (
    <AuthShell
      eyebrow="CREATE ACCOUNT"
      title="创建账户"
      description="先创建凭据；首次登录时必须绑定身份验证器，才能进入应用。"
      footer={<>已经有账户？<Link href="/login">直接登录</Link></>}
    >
      <RegisterForm returnTo={returnTo} />
    </AuthShell>
  );
}
