import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell, LoginForm } from "@/features/auth";
import { AUTH_PATHS, safeReturnPath } from "@/core/auth/paths";
import { siteConfig } from "@/config/site";
import { getSession } from "@/server/auth";

export const metadata: Metadata = {
  title: "登录",
  description: `登录 ${siteConfig.name}，继续你的工作。`,
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reauth?: string; registered?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnPath(params.returnTo);
  const session = await getSession();
  if (session) {
    if (!session.user.twoFactorEnabled) {
      redirect(`${AUTH_PATHS.twoFactorSetup}?returnTo=${encodeURIComponent(returnTo)}`);
    }
    if (session.session.mfaVerifiedAt) redirect(returnTo);
  }

  const reauth = params.reauth === "1" || Boolean(session);

  return (
    <AuthShell
      eyebrow="CREEPER ACCOUNT"
      title={
        params.registered === "1"
          ? "继续安全设置"
          : reauth
            ? "重新验证账户"
            : "欢迎回来"
      }
      description={
        params.registered === "1"
          ? "账户创建完成。登录后绑定身份验证器，才能进入应用。"
          : reauth
            ? "当前会话没有通过双因素验证，请重新输入密码继续。"
            : "使用邮箱和密码登录；随后使用身份验证器确认。"
      }
      footer={<>还没有账户？<Link href={AUTH_PATHS.register}>免费创建</Link></>}
    >
      <LoginForm registered={params.registered === "1"} returnTo={returnTo} />
    </AuthShell>
  );
}
