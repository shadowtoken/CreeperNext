import { ContentState } from "@/components/shared/content-state";
import styles from "./account.module.css";

// This boundary is below the protected layout: it never bypasses its auth gate.
export default function AccountLoading() {
  return (
    <main className={styles.page} id="main-content" tabIndex={-1}>
      <ContentState kind="loading" headingLevel={1} title="正在加载账户…" description="请稍候，安全设置即将显示。" />
    </main>
  );
}
