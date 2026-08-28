import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { AUTH_PATHS } from "@/core/auth/paths";
import { cn } from "@/lib/cn";
import { siteConfig } from "@/config/site";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={cn(styles.footer, "@container/footer")}>
      <div className={styles.main}>
        <Link className={styles.brand} href="/" aria-label={`${siteConfig.name} 首页`}><Brand /></Link>
        <p className={styles.copy}>一个可靠、轻量、可以长期生长的产品地基。</p>
        <nav className={cn(styles.links, "justify-start @min-[52rem]/footer:justify-end")} aria-label="页脚导航">
          <Link href="/#principles">原则</Link>
          <Link href="/#structure">结构</Link>
          <Link href={AUTH_PATHS.login}>登录</Link>
          <Link href={AUTH_PATHS.account}>Account</Link>
        </nav>
      </div>
      <div className={styles.meta}>
        <span>{siteConfig.name.toUpperCase()} / {new Date().getFullYear()}</span>
        <span>BUILT FOR THE LONG RUN</span>
      </div>
    </footer>
  );
}
