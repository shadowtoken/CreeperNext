import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { AUTH_PATHS } from "@/core/auth/paths";
import { siteConfig } from "@/config/site";
import styles from "./site-footer.module.css";

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <Link className={styles.brand} href="/" aria-label={`${siteConfig.name} 首页`}><Brand /></Link>
      <nav className={styles.links} aria-label="页脚导航">
        <Link href={AUTH_PATHS.login}>登录</Link>
        <Link href={AUTH_PATHS.account}>账户</Link>
      </nav>
    </footer>
  );
}
