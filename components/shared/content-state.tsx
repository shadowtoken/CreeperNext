import type { ReactNode } from "react";
import styles from "./content-state.module.css";

/** In-place status: the surrounding page owns its main landmark and layout. */
export function ContentState({ kind, title, description, action, headingLevel = 2 }: {
  kind: "loading" | "empty" | "error";
  title: string;
  description?: string;
  action?: ReactNode;
  headingLevel?: 1 | 2 | 3;
}) {
  const Heading = `h${headingLevel}` as "h1" | "h2" | "h3";
  return (
    <div className={styles.state} data-state={kind}>
      <Heading className={styles.title}>{title}</Heading>
      {description && <p className={styles.description}>{description}</p>}
      {kind === "loading" && <p className="sr-only" role="status">{title}</p>}
      {action && <div className={styles.actions}>{action}</div>}
    </div>
  );
}
