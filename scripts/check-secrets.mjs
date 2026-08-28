import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bgh[pousr]_[A-Za-z0-9]{30,}\b/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{32,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/,
];

const files = execFileSync(
  "git",
  ["ls-files", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
).trim().split("\n").filter((file) => file && existsSync(file));

const findings = [];
for (const file of files) {
  if (/\.(?:png|jpe?g|gif|webp|ico|woff2?|sqlite)$/.test(file)) continue;
  const content = readFileSync(file, "utf8");
  if (patterns.some((pattern) => pattern.test(content))) findings.push(`${file}: possible secret`);
}

const history = execFileSync(
  "git",
  ["log", "-p", "--all", "--no-ext-diff", "--format=medium"],
  { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
);
if (patterns.some((pattern) => pattern.test(history))) {
  findings.push("Git history: possible secret");
}

if (findings.length > 0) {
  process.stderr.write(`${findings.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write("No common secret patterns found in files or Git history.\n");
}
