import Image from "next/image";
import { siteConfig } from "@/config/site";
import styles from "./brand.module.css";

export function Brand({
  compact = false,
  size = "default",
  tone = "auto",
}: {
  compact?: boolean;
  size?: "default" | "display";
  tone?: "auto" | "inverse";
}) {
  return (
    <span className={styles.lockup} data-size={size} data-tone={tone}>
      <span className={styles.mark} data-tone={tone} aria-hidden="true">
        <Image
          className={styles.artwork}
          src="/brand/cr-solid.png"
          alt=""
          width={1254}
          height={1254}
          sizes={size === "display" ? "(max-width: 640px) 70vw, 400px" : "45px"}
        />
      </span>
      {!compact && <span className={styles.wordmark}>{siteConfig.name}</span>}
    </span>
  );
}
