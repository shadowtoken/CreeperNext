import type { ReactNode } from "react";
import Link from "next/link";
import { Brand } from "./brand";
import { SignOutButton } from "./sign-out-button";
import { siteConfig } from "../config/site";
import styles from "./security-setup-shell.module.css";

export function SecuritySetupShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <Link className={styles.brand} href="/" aria-label={`${siteConfig.name} 首页`}>
          <Brand />
        </Link>
        <SignOutButton />
      </header>

      <main className={styles.main} id="main-content" tabIndex={-1}>
        <section className={styles.surface} data-security-setup>
          {children}
        </section>
      </main>
    </div>
  );
}
