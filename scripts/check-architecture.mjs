import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import ts from "typescript";
import { analyzeArchitecture, sourcePattern } from "./lib/architecture.mjs";

const trackedFiles = execFileSync(
  "git",
  ["ls-files", "-z", "--cached", "--others", "--exclude-standard"],
  { encoding: "utf8" },
)
  .split("\0")
  .filter((file) => file && existsSync(file));
const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
if (config.error) {
  throw new Error(ts.flattenDiagnosticMessageText(config.error.messageText, " "));
}
const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
const sources = new Map(trackedFiles
  .filter((file) => sourcePattern.test(file) || file === "next.config.ts")
  .map((file) => [file, readFileSync(file, "utf8")]));
const failures = analyzeArchitecture({ sources, rootDir: process.cwd(), compilerOptions: parsed.options })
  .map(({ file, line, rule, message }) => `${file}:${line} [${rule}] ${message}`);
for (const file of trackedFiles.filter((file) => /^components\/(?!ui\/|shared\/).*\.css$/.test(file))) {
  failures.push(`${file}: Component styles belong in components/ui or components/shared.`);
}

if (failures.length > 0) {
  process.stderr.write(`${failures.join("\n")}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Architecture, browser/server and environment boundaries are clean (${sources.size} modules).\n`);
}
