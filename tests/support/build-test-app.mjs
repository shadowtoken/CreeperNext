import { spawn } from "node:child_process";
import { testEnvironment } from "./database.mjs";

// A build must not migrate or query any database. Port 1 is deliberately unused.
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", "build"], {
  cwd: process.cwd(),
  env: testEnvironment(
    "postgresql://build:unused@127.0.0.1:1/creeper_build",
    "http://127.0.0.1:3200",
    "creeper_build_test",
  ),
  stdio: "inherit",
});
process.on("SIGINT", () => child.kill("SIGINT"));
process.on("SIGTERM", () => child.kill("SIGTERM"));
child.once("error", () => { process.exitCode = 1; });
child.once("close", (code) => { process.exitCode = code ?? 1; });
