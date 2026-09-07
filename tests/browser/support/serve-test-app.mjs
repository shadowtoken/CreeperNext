import { spawn } from "node:child_process";
import { createTestDatabase, testEnvironment } from "../../support/database.mjs";

const port = process.env.CREEPER_E2E_PORT ?? "3211";
let child;
let stopping = false;

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    stopping = true;
    child?.kill(signal);
  });
}

const database = await createTestDatabase();
const environment = testEnvironment(database.url, `http://127.0.0.1:${port}`, "creeper_browser_test");

function run(args) {
  return new Promise((resolve, reject) => {
    child = spawn(process.execPath, ["node_modules/next/dist/bin/next", ...args], {
      cwd: process.cwd(), env: environment, stdio: "inherit",
    });
    child.once("error", reject);
    child.once("close", (code) => resolve(code ?? 1));
  });
}

try {
  const buildCode = stopping ? 1 : await run(["build"]);
  if (!stopping && buildCode !== 0) throw new Error("Browser test build failed.");
  if (!stopping) {
    process.exitCode = await run(["start", "--hostname", "127.0.0.1", "--port", port]);
  }
} finally {
  await database.dispose();
  if (stopping) process.exitCode = 0;
}
