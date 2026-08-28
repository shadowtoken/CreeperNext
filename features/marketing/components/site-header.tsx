import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { ButtonLink } from "@/components/ui/button-link";
import { AUTH_PATHS } from "@/core/auth/paths";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/cn";

const navLinkClass =
  "min-h-target min-w-target items-center justify-center text-copy-secondary transition-colors duration-fast hover:text-foreground";

export function SiteHeader() {
  return (
    <header className="page-container @container/header flex min-h-[var(--size-site-header-safe)] items-center justify-between border-b border-border pt-[env(safe-area-inset-top)]">
      <Link className="inline-flex min-h-target items-center font-bold tracking-[-0.02em]" href="/" aria-label={`${siteConfig.name} 首页`}>
        <Brand />
      </Link>
      <nav className="flex items-center gap-[clamp(var(--ref-space-2),2cqi,var(--ref-space-5))] text-sm" aria-label="主导航">
        <Link className={cn(navLinkClass, "hidden @min-[60rem]/header:inline-flex")} href="/#principles">设计原则</Link>
        <Link className={cn(navLinkClass, "hidden @min-[60rem]/header:inline-flex")} href="/#structure">工程结构</Link>
        <Link className={cn(navLinkClass, "ml-4 hidden @min-[32rem]/header:inline-flex")} href={AUTH_PATHS.login}>登录</Link>
        <ButtonLink href={AUTH_PATHS.register} size="small">开始搭建</ButtonLink>
      </nav>
    </header>
  );
}
