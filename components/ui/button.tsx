import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";
import styles from "./button.module.css";

export type ButtonVisualProps = {
  children: ReactNode;
  size?: "default" | "small";
  variant?: "primary" | "secondary" | "ghost";
};

export function buttonClassName({
  className,
  size = "default",
  variant = "primary",
}: Pick<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & Omit<ButtonVisualProps, "children">) {
  return cn(styles.root, styles[variant], size === "small" && styles.small, className);
}

export function Button({
  children,
  className,
  size = "default",
  variant = "primary",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & ButtonVisualProps) {
  return (
    <button className={buttonClassName({ className, size, variant })} {...props}>
      {children}
    </button>
  );
}
