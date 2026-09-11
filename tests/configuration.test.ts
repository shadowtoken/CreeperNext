import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { configurationIssues } from "../config/validation";

const root = fileURLToPath(new URL("../", import.meta.url));
const valid: Record<string, string> & { NODE_ENV: "production" | "development" | "test" } = {
  NODE_ENV: "production",
  BETTER_AUTH_SECRET: "configuration-test-only-not-a-real-secret",
  BETTER_AUTH_URL: "https://example.com",
  SITE_URL: "https://example.com",
  AUTH_COOKIE_PREFIX: "configuration_test",
  DATABASE_URL: "postgresql://test:unused@127.0.0.1:1/config_test",
  DATABASE_DIRECT_URL: "",
  DATABASE_POOL_MAX: "5",
  BETTER_AUTH_ALLOWED_HOSTS: "example.com",
  BETTER_AUTH_TRUSTED_ORIGINS: "",
  BETTER_AUTH_PROTOCOL: "https",
  NEXT_ALLOWED_DEV_ORIGINS: "127.0.0.1",
};

function issuesWith(overrides: Partial<typeof valid>) {
  const before = { ...process.env };
  Object.assign(process.env, valid, overrides);
  try { return configurationIssues(); }
  finally {
    for (const key of Object.keys(valid)) {
      if (before[key] === undefined) delete process.env[key];
      else process.env[key] = before[key];
    }
  }
}

test("configuration validates offline and aggregates independent missing values", () => {
  assert.deepEqual(issuesWith({}), []);
  const issues = issuesWith({ BETTER_AUTH_SECRET: "", BETTER_AUTH_URL: "", SITE_URL: "", AUTH_COOKIE_PREFIX: "", DATABASE_URL: "" }).join("\n");
  for (const name of ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "SITE_URL", "AUTH_COOKIE_PREFIX", "DATABASE_URL"]) assert.match(issues, new RegExp(name));
  assert.deepEqual(issuesWith({ NODE_ENV: "development", SITE_URL: "", AUTH_COOKIE_PREFIX: "" }), []);
});

test("origin allowlists reject paths and redact invalid configuration values", () => {
  for (const field of ["SITE_URL", "BETTER_AUTH_URL", "BETTER_AUTH_TRUSTED_ORIGINS", "BETTER_AUTH_ALLOWED_HOSTS", "NEXT_ALLOWED_DEV_ORIGINS", "DATABASE_URL"] as const) {
    const issues = issuesWith({ [field]: "https://user:never-print-me@example.com/path?token=private-value" }).join("\n");
    assert.match(issues, new RegExp(field));
    assert.doesNotMatch(issues, /never-print-me|private-value/);
  }
  for (const value of ["https://example.com/path", "https://example.com?q=x", "https://example.com#hash", "https://*.example.com", "https://a.example,,https://b.example"]) {
    assert.match(issuesWith({ BETTER_AUTH_TRUSTED_ORIGINS: value }).join("\n"), /BETTER_AUTH_TRUSTED_ORIGINS/);
  }
  assert.deepEqual(issuesWith({ BETTER_AUTH_TRUSTED_ORIGINS: "https://client.example", BETTER_AUTH_ALLOWED_HOSTS: "localhost:*,example.com" }), []);
});

test("setup creates private unique configuration, respects port, and never overwrites", () => {
  const directories = [mkdtempSync(path.join(tmpdir(), "creeper-setup-")), mkdtempSync(path.join(tmpdir(), "creeper-setup-"))];
  try {
    const run = (cwd: string, args: string[] = []) => spawnSync(process.execPath, [path.join(root, "scripts/setup.mjs"), ...args], { cwd, encoding: "utf8" });
    const first = run(directories[0], ["--port", "3100"]);
    assert.equal(first.status, 0);
    const file = path.join(directories[0], ".env.local");
    const content = readFileSync(file, "utf8");
    assert.match(content, /^SITE_URL=http:\/\/localhost:3100$/m);
    assert.match(content, /^BETTER_AUTH_URL=http:\/\/localhost:3100$/m);
    const secret = /^BETTER_AUTH_SECRET=(.+)$/m.exec(content)![1];
    assert.equal(Buffer.from(secret, "base64").length, 32);
    assert.ok(!first.stdout.includes(secret));
    if (process.platform !== "win32") assert.equal(statSync(file).mode & 0o777, 0o600);
    assert.equal(run(directories[0], ["--port", "3111"]).status, 0);
    assert.ok(readFileSync(file, "utf8") === content, "existing config must be byte-identical");
    assert.equal(run(directories[1]).status, 0);
    const second = readFileSync(path.join(directories[1], ".env.local"), "utf8");
    assert.ok(/^AUTH_COOKIE_PREFIX=(.+)$/m.exec(content)![1] !== /^AUTH_COOKIE_PREFIX=(.+)$/m.exec(second)![1]);
    assert.ok(!second.includes(secret));
    assert.equal(run(directories[0], ["--port", "not-a-port"]).status, 1);
  } finally { for (const dir of directories) rmSync(dir, { recursive: true, force: true }); }
});

test("setup does not follow an existing env symlink", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "creeper-setup-link-"));
  try {
    const target = path.join(dir, "keep.env");
    writeFileSync(target, "keep-me");
    symlinkSync(target, path.join(dir, ".env.local"));
    const result = spawnSync(process.execPath, [path.join(root, "scripts/setup.mjs")], { cwd: dir, encoding: "utf8" });
    assert.equal(result.status, 0);
    assert.equal(readFileSync(target, "utf8"), "keep-me");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test("doctor respects Next mode/precedence and is offline unless explicitly requested", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "creeper-doctor-"));
  const run = (args: string[], overrides: Record<string, string | undefined> = {}) => spawnSync(process.execPath,
    ["--import", import.meta.resolve("tsx"), path.join(root, "scripts/doctor.ts"), ...args],
    { cwd: dir, encoding: "utf8", timeout: 15000, env: { ...process.env, ...valid, ...overrides } });
  try {
    const offline = run([]);
    assert.equal(offline.status, 0, offline.stderr);
    assert.match(offline.stdout, /Database not contacted/);
    assert.doesNotMatch(offline.stdout, /configuration-test-only|postgresql:/);
    const failed = run(["--database"]);
    assert.equal(failed.status, 1);
    assert.match(failed.stderr, /Database check failed/);
    assert.doesNotMatch(failed.stderr, /postgresql:|unused/);
    writeFileSync(path.join(dir, ".env.production.local"), "SITE_URL=https://production.example\n");
    writeFileSync(path.join(dir, ".env.development.local"), "SITE_URL=not-an-origin\n");
    assert.equal(run(["--production"], { SITE_URL: undefined }).status, 0);
    assert.equal(run([], { SITE_URL: undefined }).status, 1);
    assert.equal(run([]).status, 0, "process env must win over local files");
    assert.equal(run(["--unknown"]).status, 1);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
