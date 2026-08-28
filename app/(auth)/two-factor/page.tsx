import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "../../../components/auth-shell";
import { TwoFactorChallengeForm } from "../../../features/auth";
import { safeReturnPath } from "../../../lib/auth-paths";
import { getSession } from "../../../server/auth";

export const metadata: Metadata = {
  title: "双因素验证",
  description: "使用身份验证器完成安全登录。",
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
      title="再确认一次是你"
      description="打开身份验证器并输入当前 6 位代码。"
      footer={<>验证请求有问题？<Link href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>重新登录</Link></>}
    >
      <TwoFactorChallengeForm returnTo={returnTo} />
    </AuthShell>
  );
}
