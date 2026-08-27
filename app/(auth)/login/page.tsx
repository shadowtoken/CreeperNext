import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "../../../components/auth-shell";
import { LoginForm } from "../../../components/login-form";
import { safeReturnPath } from "../../../lib/auth-paths";
import { getSession } from "../../../server/auth";

export const metadata: Metadata = {
  title: "登录",
  description: "登录 CreeperNext，继续你的工作。",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ registered?: string; returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnPath(params.returnTo);
  const session = await getSession();
  if (session) redirect(returnTo);

  return (
    <AuthShell
      eyebrow="CREEPER ACCOUNT"
      title="欢迎回来"
      description="使用邮箱和密码登录 CreeperNext，继续你的工作。"
      footer={<>还没有账户？<Link href="/register">免费创建</Link></>}
    >
      <LoginForm registered={params.registered === "1"} returnTo={returnTo} />
    </AuthShell>
  );
}
