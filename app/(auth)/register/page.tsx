import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "../../../components/auth-shell";
import { RegisterForm } from "../../../components/register-form";
import { safeReturnPath } from "../../../lib/auth-paths";
import { getSession } from "../../../server/auth";

export const metadata: Metadata = {
  title: "创建账户",
  description: "创建 Foundation 账户，从一个可靠的地基开始。",
};

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const returnTo = safeReturnPath((await searchParams).returnTo);
  const session = await getSession();
  if (session) redirect(returnTo);

  return (
    <AuthShell
      eyebrow="START BUILDING"
      title="创建你的起点。"
      description="基础版提供真实的邮箱注册与数据库会话。未来可以替换为 OAuth、Passkey 或企业 SSO。"
      footer={<>已经有账户？<Link href="/login">直接登录</Link></>}
    >
      <RegisterForm returnTo={returnTo} />
    </AuthShell>
  );
}
