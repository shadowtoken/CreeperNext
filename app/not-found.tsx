import Link from "next/link";
import { Brand } from "@/components/shared/brand";
import { ButtonLink } from "../components/ui/button-link";
import { ContentState } from "@/components/shared/content-state";
import { siteConfig } from "../config/site";
import styles from "./status.module.css";

export default function NotFound() {
  return (
    <main className={styles.page} id="main-content" tabIndex={-1}>
      <Link className={styles.brand} href="/" aria-label={`${siteConfig.name} 首页`}><Brand /></Link>
      <ContentState kind="empty" headingLevel={1} title="页面不存在" description="这个地址不存在，或者它已经被移动到新的位置。" action={<ButtonLink href="/">返回首页</ButtonLink>} />
    </main>
  );
}
