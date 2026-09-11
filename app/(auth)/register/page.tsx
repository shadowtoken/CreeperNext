import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell, RegisterForm } from "@/features/auth/register";
import { AUTH_PATHS, safeReturnPath } from "@/core/auth/paths";
import { siteConfig } from "@/config/site";
import { getSession } from "@/server/auth";

export const metadata: Metadata = {
  title: "创建账户",
  description: `创建 ${siteConfig.name} 账户，开始搭建你的产品。`,
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
      redirect(`${AUTH_PATHS.twoFactorSetup}?returnTo=${encodeURIComponent(returnTo)}`);
    }
    redirect(
      session.session.mfaVerifiedAt
        ? returnTo
        : `${AUTH_PATHS.login}?reauth=1&returnTo=${encodeURIComponent(returnTo)}`,
    );
  }

  return (
    <AuthShell
      title="创建账户"
      description="注册后需登录并绑定身份验证器。"
      footer={<>已经有账户？<Link href={AUTH_PATHS.login}>直接登录</Link></>}
    >
      <RegisterForm returnTo={returnTo} />
    </AuthShell>
  );
}
