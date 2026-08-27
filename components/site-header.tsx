import Link from "next/link";
import { Brand } from "./brand";
import { ButtonLink } from "./ui/button-link";
import { cn } from "../lib/cn";
import styles from "./site-header.module.css";

export function SiteHeader() {
  return (
    <header className={styles.header}>
      <Link className={styles.brand} href="/" aria-label="Foundation 首页">
        <Brand />
      </Link>
      <nav className={styles.nav} aria-label="主导航">
        <Link className={cn(styles.navLink, styles.desktopLink)} href="/#principles">设计原则</Link>
        <Link className={cn(styles.navLink, styles.desktopLink)} href="/#structure">工程结构</Link>
        <Link className={cn(styles.navLink, styles.login)} href="/login">登录</Link>
        <ButtonLink href="/register" size="small">开始搭建</ButtonLink>
      </nav>
    </header>
  );
}
