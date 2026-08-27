import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "../../../components/auth-shell";
import { LoginForm } from "../../../components/login-form";
import { safeReturnPath } from "../../../lib/auth-paths";
import { getSession } from "../../../server/auth";

export const metadata: Metadata = {
  title: "登录",
  description: "登录 Foundation，继续构建你的产品。",
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
      eyebrow="WELCOME BACK"
      title="继续你的构建。"
      description="使用邮箱和密码登录。会话只在服务端读取，业务页面不直接依赖认证库。"
      footer={<>第一次来？<Link href="/register">创建账户</Link></>}
    >
      <LoginForm registered={params.registered === "1"} returnTo={returnTo} />
    </AuthShell>
  );
}
