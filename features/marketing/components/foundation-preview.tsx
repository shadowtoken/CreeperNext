import styles from "./foundation-preview.module.css";

const directories = [
  ["app/", "路由与布局"],
  ["components/", "基础与共享组件"],
  ["features/", "业务功能"],
  ["core/", "鉴权与领域规则"],
  ["services/", "API 与实时连接"],
  ["server/", "数据库与服务端逻辑"],
];

export function FoundationPreview() {
  return (
    <dl className={styles.directories}>
      {directories.map(([name, description]) => (
        <div className={styles.row} key={name}>
          <dt>{name}</dt>
          <dd>{description}</dd>
        </div>
      ))}
    </dl>
  );
}
