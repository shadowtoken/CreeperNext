import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { rm } from "node:fs/promises";
import path from "node:path";
import test, { after, before } from "node:test";

const port = 3200 + (process.pid % 400);
const origin = `http://127.0.0.1:${port}`;
const databasePath = path.join(process.cwd(), `.foundation-test-${process.pid}.sqlite`);
const environment = {
  ...process.env,
  AUTH_DB_PATH: databasePath,
  BETTER_AUTH_SECRET: "foundation-test-secret-at-least-thirty-two-characters",
  BETTER_AUTH_URL: origin,
  NEXT_PUBLIC_SITE_URL: origin,
};

let server;

before(async () => {
  const migration = spawnSync(
    path.join(process.cwd(), "node_modules/.bin/auth"),
    ["migrate", "--config", "server/auth-config.ts", "--yes"],
    { cwd: process.cwd(), env: environment, encoding: "utf8" },
  );
  assert.equal(migration.status, 0, migration.stderr || migration.stdout);

  server = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start", "-p", String(port)],
    { cwd: process.cwd(), env: environment, stdio: ["ignore", "pipe", "pipe"] },
  );

  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(origin);
      if (response.ok) return;
    } catch {
      // The production server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  throw new Error("Next.js production server did not start in time.");
});

after(async () => {
  if (server && !server.killed) server.kill("SIGTERM");
  await Promise.all([
    rm(databasePath, { force: true }),
    rm(`${databasePath}-shm`, { force: true }),
    rm(`${databasePath}-wal`, { force: true }),
  ]);
});

test("renders the static Foundation landing and metadata", async () => {
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /从一个好地基/);
  assert.match(html, /轻量，但不简陋/);
  assert.match(html, /property="og:image"/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|vinext/i);
});

test("renders login and registration without accepting an external return URL", async () => {
  const [login, register] = await Promise.all([
    fetch(`${origin}/login?returnTo=https://evil.example/steal`),
    fetch(`${origin}/register`),
  ]);
  assert.equal(login.status, 200);
  assert.equal(register.status, 200);

  const [loginHtml, registerHtml] = await Promise.all([login.text(), register.text()]);
  assert.match(loginHtml, /邮箱和密码/);
  assert.match(loginHtml, /\\"returnTo\\":\\"\/account\\"/);
  assert.match(registerHtml, /创建账户/);
});

test("protects Account and completes the real registration and login flow", async () => {
  const anonymous = await fetch(`${origin}/account`, { redirect: "manual" });
  assert.ok([302, 303, 307, 308].includes(anonymous.status));
  assert.equal(anonymous.headers.get("location"), "/login?returnTo=%2Faccount");

  const email = `builder-${process.pid}@example.com`;
  const signUp = await fetch(`${origin}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      name: "测试构建者",
      email,
      password: "foundation-test-password",
    }),
  });
  assert.equal(signUp.status, 200, await signUp.text());

  const duplicateSignUp = await fetch(`${origin}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      name: "测试构建者",
      email,
      password: "foundation-test-password",
    }),
  });
  assert.equal(duplicateSignUp.status, 200, await duplicateSignUp.text());

  const signIn = await fetch(`${origin}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email, password: "foundation-test-password" }),
  });
  assert.equal(signIn.status, 200, await signIn.text());

  const cookie = signIn.headers.get("set-cookie");
  assert.ok(cookie);
  const account = await fetch(`${origin}/account`, {
    headers: { cookie },
  });
  assert.equal(account.status, 200);
  const html = await account.text();
  assert.match(html, /测试构建者/);
  assert.match(html, new RegExp(email.replace(".", "\\.")));
  assert.match(html, /会话有效/);
});

test("rejects cross-origin authentication mutations", async () => {
  const response = await fetch(`${origin}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    body: JSON.stringify({
      name: "外部请求",
      email: `external-${process.pid}@example.com`,
      password: "foundation-test-password",
    }),
  });
  assert.equal(response.status, 403);
});

test("renders the branded not-found boundary and security headers", async () => {
  const response = await fetch(`${origin}/missing-page`);
  assert.equal(response.status, 404);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.match(await response.text(), /这里还没有盖房子/);
});

test("publishes only the public landing in robots and sitemap", async () => {
  const [robots, sitemap] = await Promise.all([
    fetch(`${origin}/robots.txt`),
    fetch(`${origin}/sitemap.xml`),
  ]);
  assert.equal(robots.status, 200);
  assert.equal(sitemap.status, 200);
  const [robotsText, sitemapText] = await Promise.all([robots.text(), sitemap.text()]);
  assert.match(robotsText, /Disallow: \/account/);
  assert.match(robotsText, /Disallow: \/api\//);
  assert.equal([...sitemapText.matchAll(/<loc>https?:\/\/[^<]+<\/loc>/g)].length, 1);
  assert.doesNotMatch(sitemapText, /login|register|account/);
});
