import Link from "next/link";
import { Brand } from "../components/brand";
import { ButtonLink } from "../components/ui/button-link";
import { Kicker } from "../components/ui/kicker";
import styles from "./status.module.css";

export default function NotFound() {
  return (
    <main className={styles.page} id="main-content" tabIndex={-1}>
      <Link className={styles.brand} href="/" aria-label="Foundation 首页"><Brand /></Link>
      <div className={styles.copy}>
        <Kicker>404 / NOT FOUND</Kicker>
        <h1>这里还没有盖房子。</h1>
        <p>这个地址不存在，或者它已经被移动到新的位置。</p>
        <ButtonLink href="/">返回首页 <span aria-hidden="true">→</span></ButtonLink>
      </div>
    </main>
  );
}
