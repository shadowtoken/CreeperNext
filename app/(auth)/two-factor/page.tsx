import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "../../../components/auth-shell";
import { TwoFactorChallengeForm } from "../../../components/two-factor-challenge-form";
import { safeReturnPath } from "../../../lib/auth-paths";
import { getSession } from "../../../server/auth";

export const metadata: Metadata = {
  title: "双因素验证",
  description: "使用身份验证器或恢复码完成安全登录。",
  robots: { index: false, follow: false },
};

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const params = await searchParams;
  const returnTo = safeReturnPath(params.returnTo);
  const session = await getSession();
  if (session) redirect(returnTo);

  return (
    <AuthShell
      eyebrow="SECURITY CHECK"
      title="再确认一次是你。"
      description="输入身份验证器生成的动态代码。验证请求十分钟后失效，也可以使用一枚恢复码。"
      footer={<>验证请求有问题？<Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>重新登录</Link></>}
    >
      <TwoFactorChallengeForm returnTo={returnTo} />
    </AuthShell>
  );
}
