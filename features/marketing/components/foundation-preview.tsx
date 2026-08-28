import { cn } from "@/lib/cn";
import styles from "./foundation-preview.module.css";

export function FoundationPreview() {
  return (
    <div className={cn(styles.container, "@container/preview")}>
      <figure className={styles.card}>
        <figcaption className="sr-only">脚手架包含 Landing、认证、设计系统和业务扩展层。</figcaption>
        <div className={styles.topbar}>
          <div className={styles.dots} aria-hidden="true"><span /><span /><span /></div>
          <span className={styles.path} data-responsive-overflow-ok>foundation / src</span>
          <span className={styles.badge}>READY</span>
        </div>
        <div className={styles.list}>
          <PreviewRow index="01" title="Marketing" detail="Landing 与品牌表达" active />
          <PreviewRow index="02" title="Authentication" detail="登录、注册与会话" />
          <PreviewRow index="03" title="Design System" detail="Token、组件与主题" />
          <PreviewRow index="+" title="Your product" detail="只添加真正需要的能力" muted state="下一步" />
        </div>
        <div className={styles.footer}>
          <span>CORE</span>
          <div className={styles.progress} aria-hidden="true"><span /></div>
          <span>LIGHTWEIGHT</span>
        </div>
      </figure>
    </div>
  );
}

function PreviewRow({
  index,
  title,
  detail,
  active = false,
  muted = false,
  state = "已就绪",
}: {
  index: string;
  title: string;
  detail: string;
  active?: boolean;
  muted?: boolean;
  state?: string;
}) {
  return (
    <div className={cn(styles.row, active && styles.active, muted && styles.muted)}>
      <span className={styles.index}>{index}</span>
      <div><strong>{title}</strong><small>{detail}</small></div>
      <span className={styles.state}>{state}</span>
    </div>
  );
}
