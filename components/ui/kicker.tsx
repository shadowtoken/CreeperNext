import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import styles from "./kicker.module.css";

export function Kicker({
  children,
  className,
  inverse = false,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { children: ReactNode; inverse?: boolean }) {
  return (
    <span className={cn(styles.root, inverse && styles.inverse, className)} {...props}>
      {children}
    </span>
  );
}
