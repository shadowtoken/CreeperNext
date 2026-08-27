import { siteConfig } from "../config/site";
import styles from "./brand.module.css";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={styles.lockup}>
      <span className={styles.mark} aria-hidden="true">
        <span>C</span>
      </span>
      {!compact && <span className={styles.wordmark}>{siteConfig.name}</span>}
    </span>
  );
}
