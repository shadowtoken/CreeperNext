"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useState } from "react";
import styles from "./auth-form.module.css";

type AuthPasswordInputProps = Omit<ComponentPropsWithoutRef<"input">, "type"> & {
  id: string;
  visibilityLabel?: string;
};

/** Password field with an accessible visibility toggle. */
export function AuthPasswordInput({ id, visibilityLabel = "密码", ...props }: AuthPasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={styles.passwordControl}>
      <input id={id} autoCapitalize="none" autoCorrect="off" spellCheck={false} {...props} type={visible ? "text" : "password"} />
      <button
        className={styles.passwordToggle}
        type="button"
        aria-controls={id}
        aria-label={`${visible ? "隐藏" : "显示"}${visibilityLabel}`}
        aria-pressed={visible}
        disabled={props.disabled}
        onClick={() => setVisible((current) => !current)}
      >
        <PasswordIcon hidden={visible} />
      </button>
    </div>
  );
}

function PasswordIcon({ hidden }: { hidden: boolean }) {
  return hidden ? (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="m3 3 18 18M10.6 10.7a2 2 0 0 0 2.7 2.7M9.9 4.2A10.5 10.5 0 0 1 12 4c4.9 0 8.2 4.2 9 5.5a1 1 0 0 1 0 1 14.5 14.5 0 0 1-3.1 3.7M6.2 6.2A14.7 14.7 0 0 0 3 9.5a1 1 0 0 0 0 1C3.8 11.8 7.1 16 12 16c.7 0 1.4-.1 2-.3" />
    </svg>
  ) : (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M2.7 9.5C3.5 8.2 6.9 4 12 4s8.5 4.2 9.3 5.5a1 1 0 0 1 0 1C20.5 11.8 17.1 16 12 16S3.5 11.8 2.7 10.5a1 1 0 0 1 0-1Z" />
      <circle cx="12" cy="10" r="2.5" />
    </svg>
  );
}
