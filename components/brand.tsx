import styles from "./brand.module.css";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className={styles.lockup}>
      <span className={styles.mark} aria-hidden="true">F</span>
      {!compact && <span>Foundation</span>}
    </span>
  );
}
