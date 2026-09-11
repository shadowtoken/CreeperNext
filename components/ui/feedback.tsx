import styles from "./feedback.module.css";

/** Keep live regions mounted before an async result arrives. Never render raw server errors. */
export function Feedback({ error, success, errorId, successId }: {
  error?: string | null;
  success?: string | null;
  errorId?: string;
  successId?: string;
}) {
  return (
    <>
      <p className={styles.error} id={errorId} role="alert" aria-atomic="true">{error}</p>
      <p className={styles.success} id={successId} role="status" aria-atomic="true">{success}</p>
    </>
  );
}
