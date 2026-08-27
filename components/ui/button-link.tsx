import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { buttonClassName, type ButtonVisualProps } from "./button";

type ButtonLinkProps = ComponentProps<typeof Link> & {
  children: ReactNode;
} & Omit<ButtonVisualProps, "children">;

export function ButtonLink({
  children,
  className,
  size = "default",
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={buttonClassName({ className, size, variant })}
      {...props}
    >
      {children}
    </Link>
  );
}
