import { spawn } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

const cwd = process.cwd();
const port = process.env.CREEPER_E2E_PORT ?? "3211";
const temporaryDirectory = mkdtempSync(path.join(tmpdir(), "creeper-browser-"));
const databasePath = path.join(temporaryDirectory, "auth.sqlite");
const environment = { ...process.env, AUTH_DB_PATH: databasePath };
const authCli = path.join(cwd, "node_modules/auth/dist/index.mjs");
const nextCli = path.join(cwd, "node_modules/next/dist/bin/next");

let activeChild;
let cleaned = false;
let stopping = false;

function cleanup() {
  if (cleaned) return;
  cleaned = true;
  rmSync(temporaryDirectory, { force: true, recursive: true });
}

function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  if (activeChild?.exitCode === null) activeChild.kill(signal);
}

function runChild(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      cwd,
      env: environment,
      stdio: "inherit",
    });
    activeChild = child;
    child.once("error", (error) => {
      if (activeChild === child) activeChild = undefined;
      reject(error);
    });
    child.once("close", (code, signal) => {
      if (activeChild === child) activeChild = undefined;
      resolve({ code, signal });
    });
  });
}

process.on("SIGINT", () => stop("SIGINT"));
process.on("SIGTERM", () => stop("SIGTERM"));
process.on("exit", cleanup);

let exitCode = 0;
try {
  const migration = await runChild([
    authCli,
    "migrate",
    "--config",
    "server/auth-config.ts",
    "--yes",
  ]);
  if (!stopping && migration.code !== 0) {
    throw new Error(`Auth migration failed (${migration.code ?? migration.signal ?? "unknown"}).`);
  }

  if (!stopping) {
    const build = await runChild([nextCli, "build"]);
    if (!stopping && build.code !== 0) {
      throw new Error(`Next build failed (${build.code ?? build.signal ?? "unknown"}).`);
    }
  }

  if (!stopping) {
    const server = await runChild([
      nextCli,
      "start",
      "--hostname",
      "127.0.0.1",
      "--port",
      port,
    ]);
    if (!stopping) exitCode = server.code ?? 1;
  }
} catch (error) {
  if (!stopping) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    exitCode = 1;
  }
} finally {
  cleanup();
}

process.exitCode = stopping ? 0 : exitCode;
