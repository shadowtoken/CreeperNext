import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/cn";

export type ButtonVisualProps = {
  children: ReactNode;
  size?: "default" | "small";
  variant?: "primary" | "secondary" | "ghost" | "inverse";
};

const baseClassName = [
  "inline-flex items-center justify-center gap-4 rounded-full border px-[1.375rem]",
  "text-sm font-semibold shadow-button transition-[translate,color,background-color,border-color]",
  "duration-fast ease-standard not-disabled:hover:-translate-y-0.5 not-disabled:active:translate-y-0",
  "disabled:cursor-wait disabled:translate-y-0 disabled:opacity-60",
].join(" ");

const sizeClassNames: Record<NonNullable<ButtonVisualProps["size"]>, string> = {
  default: "min-h-[3.125rem]",
  small: "min-h-target px-[1.0625rem]",
};

const variantClassNames: Record<NonNullable<ButtonVisualProps["variant"]>, string> = {
  primary: "border-transparent bg-primary text-primary-foreground not-disabled:hover:bg-primary-hover",
  secondary: "border-strong-border bg-transparent text-foreground shadow-none not-disabled:hover:bg-primary not-disabled:hover:text-primary-foreground",
  ghost: "border-transparent bg-transparent text-foreground shadow-none not-disabled:hover:bg-muted",
  inverse: "border-inverse-border bg-transparent text-inverse-foreground shadow-none not-disabled:hover:bg-accent not-disabled:hover:text-on-accent",
};

export function buttonClassName({
  className,
  size = "default",
  variant = "primary",
}: Pick<ButtonHTMLAttributes<HTMLButtonElement>, "className"> & Omit<ButtonVisualProps, "children">) {
  return cn(baseClassName, sizeClassNames[size], variantClassNames[variant], className);
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
