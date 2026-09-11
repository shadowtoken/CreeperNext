import { randomBytes } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const port = args.length === 0 ? "3000" : args.length === 2 && args[0] === "--port" ? args[1] : "";
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
  console.error("Usage: pnpm setup:local [--port 3100] (port 1-65535).");
  process.exitCode = 1;
} else {
  try {
    const template = await readFile(new URL("../.env.example", import.meta.url), "utf8");
    const origin = `http://localhost:${Number(port)}`;
    const values = {
      BETTER_AUTH_SECRET: randomBytes(32).toString("base64"),
      AUTH_COOKIE_PREFIX: `creeper_${randomBytes(6).toString("hex")}`,
      BETTER_AUTH_URL: origin,
      SITE_URL: origin,
    };
    let content = template;
    for (const [key, value] of Object.entries(values)) {
      const pattern = new RegExp(`^${key}=.*$`, "m");
      if (!pattern.test(content)) throw new Error("Template is missing a required key.");
      content = content.replace(pattern, `${key}=${value}`);
    }
    // Exclusive creation: never overwrite an existing file or follow a symlink.
    await writeFile(".env.local", content, { flag: "wx", mode: 0o600 });
    console.log(`Created .env.local with a random secret and unique cookie prefix (not printed).\nNext: pnpm check:env → pnpm db:up → pnpm db:migrate → pnpm check:env --database\nStart: pnpm dev --port ${Number(port)}`);
  } catch (error) {
    if (error?.code === "EEXIST") {
      console.log(".env.local already exists; left unchanged, including secret, cookie prefix and port. Run pnpm check:env.");
    } else {
      console.error("Setup failed. Check .env.example and directory permissions; no existing configuration was overwritten.");
      process.exitCode = 1;
    }
  }
}
