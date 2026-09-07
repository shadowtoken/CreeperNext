import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const trackedFiles = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .trim()
  .split("\n")
  .filter((file) => file && existsSync(file));
const sourceRoots = /^(app|components|config|core|features|lib|server|services)\//;
const sourceFile = /\.(?:[cm]?[jt]sx?|css)$/;
const allowedEnvReaders = new Set([
  "config/env.ts",
  "config/database.ts",
  "config/auth.ts",
  "next.config.ts",
]);
const failures = [];

for (const file of trackedFiles) {
  if (/^components\/[^/]+\.(?:tsx?|css)$/.test(file)) {
    failures.push(`${file}: components root may contain only ui/ and shared/ directories`);
  }

  if (!sourceRoots.test(file) || !sourceFile.test(file)) continue;
  const content = readFileSync(file, "utf8");

  if (content.includes("NEXT_PUBLIC_")) {
    failures.push(`${file}: public environment variables require an explicit browser use case`);
  }
  if (content.includes("process.env") && !allowedEnvReaders.has(file)) {
    failures.push(`${file}: read environment variables through the config boundary`);
  }
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("Architecture and environment boundaries are clean.\n");
}
