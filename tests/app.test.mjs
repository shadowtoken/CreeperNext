import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import test, { after, before } from "node:test";

const port = 3200 + (process.pid % 400);
const origin = `http://127.0.0.1:${port}`;
const localhostOrigin = `http://localhost:${port}`;
const trustedClientOrigin = "https://trusted-client.example";
const authCookiePrefix = `creeper_test_${process.pid}`;
const databasePath = path.join(process.cwd(), `.creeper-next-test-${process.pid}.sqlite`);
const environment = {
  ...process.env,
  AUTH_DB_PATH: databasePath,
  BETTER_AUTH_SECRET: "creeper-next-test-secret-at-least-thirty-two-characters",
  BETTER_AUTH_URL: origin,
  BETTER_AUTH_ALLOWED_HOSTS: "localhost:*,127.0.0.1:*",
  BETTER_AUTH_TRUSTED_ORIGINS: `${trustedClientOrigin}/frontend?source=test`,
  AUTH_COOKIE_PREFIX: authCookiePrefix,
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

test("renders the static CreeperNext landing and metadata", async () => {
  const response = await fetch(origin);
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /从一个好地基/);
  assert.match(html, /轻量，但不简陋/);
  assert.match(html, /property="og:image"/);
  assert.doesNotMatch(html, /codex-preview|SkeletonPreview|vinext/i);
});

test("renders auth entry points without accepting an external return URL", async () => {
  const [login, register, twoFactor] = await Promise.all([
    fetch(`${origin}/login?returnTo=https://evil.example/steal`),
    fetch(`${origin}/register`),
    fetch(`${origin}/two-factor?returnTo=https://evil.example/steal`),
  ]);
  assert.equal(login.status, 200);
  assert.equal(register.status, 200);
  assert.equal(twoFactor.status, 200);

  const [loginHtml, registerHtml, twoFactorHtml] = await Promise.all([
    login.text(),
    register.text(),
    twoFactor.text(),
  ]);
  assert.match(loginHtml, /欢迎回来/);
  assert.match(loginHtml, /\\"returnTo\\":\\"\/account\\"/);
  assert.match(registerHtml, /创建账户/);
  assert.match(twoFactorHtml, /再确认一次是你/);
  assert.match(twoFactorHtml, /\\"returnTo\\":\\"\/account\\"/);

  const setup = await fetch(`${origin}/two-factor/setup?returnTo=https://evil.example/steal`, {
    redirect: "manual",
  });
  assert.ok([302, 303, 307, 308].includes(setup.status));
  assert.equal(setup.headers.get("location"), "/login?returnTo=%2Faccount");
});

test("protects Account and gates a new password session behind MFA enrollment", async () => {
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
      password: "creeper-next-test-password",
    }),
  });
  assert.equal(signUp.status, 200, await signUp.text());

  const duplicateSignUp = await fetch(`${origin}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({
      name: "测试构建者",
      email,
      password: "creeper-next-test-password",
    }),
  });
  assert.equal(duplicateSignUp.status, 200, await duplicateSignUp.text());

  const signIn = await fetch(`${origin}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ email, password: "creeper-next-test-password" }),
  });
  assert.equal(signIn.status, 200, await signIn.text());

  const cookie = signIn.headers.get("set-cookie");
  assert.ok(cookie);
  const account = await fetch(`${origin}/account`, {
    headers: { cookie },
    redirect: "manual",
  });
  assert.ok([302, 303, 307, 308].includes(account.status));
  assert.equal(account.headers.get("location"), "/two-factor/setup?returnTo=%2Faccount");

  const setup = await fetch(`${origin}/two-factor/setup`, {
    headers: { cookie },
  });
  assert.equal(setup.status, 200);
  const setupHtml = await setup.text();
  assert.match(setupHtml, /设置账户安全/);

  const bootstrapSession = await fetch(`${origin}/api/auth/get-session`, {
    headers: { cookie },
  });
  assert.equal(bootstrapSession.status, 200);
  const bootstrapBody = await bootstrapSession.json();
  assert.equal(bootstrapBody.user.twoFactorEnabled, false);
  assert.equal(bootstrapBody.session.mfaVerifiedAt, null);
});

test("rejects cross-origin authentication mutations", async () => {
  const response = await fetch(`${origin}/api/auth/sign-up/email`, {
    method: "POST",
    headers: { "content-type": "application/json", origin: "https://evil.example" },
    body: JSON.stringify({
      name: "外部请求",
      email: `external-${process.pid}@example.com`,
      password: "creeper-next-test-password",
    }),
  });
  assert.equal(response.status, 403);
});

test("enforces session-level TOTP, recovery replay protection, and mandatory policy", async () => {
  const email = `builder-${process.pid}@example.com`;
  const password = "creeper-next-test-password";

  const firstSignIn = await authMutation(
    "/api/auth/sign-in/email",
    { email, password },
    "",
    localhostOrigin,
  );
  assert.equal(firstSignIn.status, 200, await firstSignIn.text());
  const firstSession = cookieHeader(firstSignIn);
  assert.ok(firstSession.includes(`${authCookiePrefix}.session_token=`));

  const parallelSignIn = await signInWithRateLimitRetry({ email, password });
  assert.equal(parallelSignIn.status, 200, await parallelSignIn.text());
  const parallelSession = cookieHeader(parallelSignIn);
  assert.ok(parallelSession.includes(`${authCookiePrefix}.session_token=`));

  const gatedAccount = await fetch(`${origin}/account`, {
    headers: { cookie: firstSession },
    redirect: "manual",
  });
  assert.ok([302, 303, 307, 308].includes(gatedAccount.status));
  assert.equal(gatedAccount.headers.get("location"), "/two-factor/setup?returnTo=%2Faccount");

  const enable = await authMutation(
    "/api/auth/two-factor/enable",
    { password, method: "totp" },
    firstSession,
    trustedClientOrigin,
  );
  assert.equal(enable.status, 200);
  const enrollment = await enable.json();
  assert.equal(enrollment.method, "totp");
  assert.match(enrollment.totpURI, /^otpauth:\/\/totp\//);
  assert.equal(enrollment.backupCodes.length, 10);

  const secret = new URL(enrollment.totpURI).searchParams.get("secret");
  assert.ok(secret);
  const confirm = await authMutation(
    "/api/auth/two-factor/verify-totp",
    { code: currentTotp(secret) },
    firstSession,
  );
  assert.equal(confirm.status, 200, await confirm.text());
  const enabledSession = mergeCookieHeaders(firstSession, cookieHeader(confirm));

  const enabledAccount = await fetch(`${origin}/account`, {
    headers: { cookie: enabledSession },
  });
  assert.equal(enabledAccount.status, 200);
  const enabledHtml = await enabledAccount.text();
  assert.match(enabledHtml, /账户与安全/);
  assert.match(enabledHtml, /已完成双因素验证/);

  const fullyVerifiedSession = await fetch(`${origin}/api/auth/get-session`, {
    headers: { cookie: enabledSession },
  });
  const fullyVerifiedBody = await fullyVerifiedSession.json();
  assert.equal(fullyVerifiedBody.user.twoFactorEnabled, true);
  assert.ok(fullyVerifiedBody.session.mfaVerifiedAt);

  const staleAccount = await fetch(`${origin}/account`, {
    headers: { cookie: parallelSession },
    redirect: "manual",
  });
  assert.ok([302, 303, 307, 308].includes(staleAccount.status));
  assert.equal(staleAccount.headers.get("location"), "/login?reauth=1&returnTo=%2Faccount");

  const staleDirectVerification = await authMutation(
    "/api/auth/two-factor/verify-totp",
    { code: currentTotp(secret) },
    parallelSession,
  );
  const staleDirectVerificationText = await staleDirectVerification.text();
  assert.equal(staleDirectVerification.status, 403, staleDirectVerificationText);
  assert.equal(JSON.parse(staleDirectVerificationText).code, "MFA_REAUTH_REQUIRED");

  const staleRecoveryRotation = await authMutation(
    "/api/auth/two-factor/generate-backup-codes",
    { password },
    parallelSession,
  );
  const staleRecoveryText = await staleRecoveryRotation.text();
  assert.equal(staleRecoveryRotation.status, 403, staleRecoveryText);
  assert.equal(JSON.parse(staleRecoveryText).code, "MFA_REQUIRED");

  const staleSecretRead = await authMutation(
    "/api/auth/two-factor/get-totp-uri",
    { password },
    parallelSession,
  );
  assert.equal(staleSecretRead.status, 404, await staleSecretRead.text());

  const staleReEnrollment = await authMutation(
    "/api/auth/two-factor/enable",
    { password, method: "totp" },
    parallelSession,
  );
  const staleReEnrollmentText = await staleReEnrollment.text();
  assert.equal(staleReEnrollment.status, 403, staleReEnrollmentText);
  assert.equal(JSON.parse(staleReEnrollmentText).code, "TWO_FACTOR_ALREADY_ENABLED");

  const staleSessionList = await fetch(`${origin}/api/auth/list-sessions`, {
    headers: { cookie: parallelSession, origin },
  });
  const staleSessionListText = await staleSessionList.text();
  assert.equal(staleSessionList.status, 403, staleSessionListText);
  assert.equal(JSON.parse(staleSessionListText).code, "MFA_REQUIRED");

  const rotateRecoveryCodes = await authMutation(
    "/api/auth/two-factor/generate-backup-codes",
    { password },
    enabledSession,
  );
  const rotateRecoveryText = await rotateRecoveryCodes.text();
  assert.equal(rotateRecoveryCodes.status, 200, rotateRecoveryText);
  const rotatedCodes = JSON.parse(rotateRecoveryText).backupCodes;
  assert.equal(rotatedCodes.length, 10);

  const signOut = await authMutation("/api/auth/sign-out", {}, enabledSession);
  assert.equal(signOut.status, 200, await signOut.text());

  const challengedSignIn = await signInWithRateLimitRetry({ email, password });
  assert.equal(challengedSignIn.status, 200);
  const challengeBody = await challengedSignIn.json();
  assert.equal(challengeBody.twoFactorRedirect, true);
  assert.deepEqual(challengeBody.twoFactorMethods, ["totp"]);
  const challengeCookie = cookieHeader(challengedSignIn);
  assert.ok(challengeCookie.includes(`${authCookiePrefix}.two_factor=`));

  const rejectedTrustBypass = await authMutation(
    "/api/auth/two-factor/verify-totp",
    { code: currentTotp(secret), trustDevice: true },
    challengeCookie,
  );
  const rejectedTrustText = await rejectedTrustBypass.text();
  assert.equal(rejectedTrustBypass.status, 400, rejectedTrustText);
  assert.equal(JSON.parse(rejectedTrustText).code, "TRUST_DEVICE_DISABLED");

  const finishSignIn = await authMutation(
    "/api/auth/two-factor/verify-totp",
    { code: currentTotp(secret) },
    challengeCookie,
  );
  assert.equal(finishSignIn.status, 200, await finishSignIn.text());
  const secondSession = cookieHeader(finishSignIn);
  assert.ok(secondSession.includes(`${authCookiePrefix}.session_token=`));
  assert.ok(!secondSession.includes(`${authCookiePrefix}.trust_device=`));

  const secondSignOut = await authMutation("/api/auth/sign-out", {}, secondSession);
  assert.equal(secondSignOut.status, 200, await secondSignOut.text());

  const recoveryChallenge = await signInWithRateLimitRetry({ email, password });
  assert.equal(recoveryChallenge.status, 200);
  assert.equal((await recoveryChallenge.clone().json()).twoFactorRedirect, true);
  const recoveryCookie = cookieHeader(recoveryChallenge);
  const recover = await authMutation(
    "/api/auth/two-factor/verify-backup-code",
    { code: rotatedCodes[0], disableSession: false },
    recoveryCookie,
  );
  assert.equal(recover.status, 200, await recover.text());
  const recoveredSession = cookieHeader(recover);
  assert.ok(recoveredSession.includes("session_token"));

  const recoveredSessionResponse = await fetch(`${origin}/api/auth/get-session`, {
    headers: { cookie: recoveredSession },
  });
  assert.equal(recoveredSessionResponse.status, 200);
  assert.ok((await recoveredSessionResponse.json()).session.mfaVerifiedAt);
  const recoveredAccount = await fetch(`${origin}/account`, {
    headers: { cookie: recoveredSession },
  });
  assert.equal(recoveredAccount.status, 200);

  const recoveredSignOut = await authMutation("/api/auth/sign-out", {}, recoveredSession);
  assert.equal(recoveredSignOut.status, 200, await recoveredSignOut.text());
  const replayChallenge = await signInWithRateLimitRetry({ email, password });
  assert.equal(replayChallenge.status, 200);
  const replayCookie = cookieHeader(replayChallenge);
  const replayedCode = await authMutation(
    "/api/auth/two-factor/verify-backup-code",
    { code: rotatedCodes[0], disableSession: false },
    replayCookie,
  );
  assert.ok([400, 401].includes(replayedCode.status), await replayedCode.text());
  const secondRecovery = await authMutation(
    "/api/auth/two-factor/verify-backup-code",
    { code: rotatedCodes[1], disableSession: false },
    replayCookie,
  );
  assert.equal(secondRecovery.status, 200, await secondRecovery.text());
  const secondRecoveredSession = cookieHeader(secondRecovery);

  const disable = await authMutation(
    "/api/auth/two-factor/disable",
    { password },
    secondRecoveredSession,
  );
  assert.equal(disable.status, 404, await disable.text());

  const finalSignOut = await authMutation("/api/auth/sign-out", {}, secondRecoveredSession);
  assert.equal(finalSignOut.status, 200, await finalSignOut.text());
  const mandatoryChallenge = await signInWithRateLimitRetry({ email, password });
  assert.equal(mandatoryChallenge.status, 200);
  assert.equal((await mandatoryChallenge.json()).twoFactorRedirect, true);
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
  assert.doesNotMatch(sitemapText, /login|register|two-factor|account/);
});

function authMutation(pathname, body, cookie = "", requestOrigin = origin) {
  return fetch(`${origin}${pathname}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: requestOrigin,
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify(body),
  });
}

async function signInWithRateLimitRetry(body, cookie = "") {
  let response = await authMutation("/api/auth/sign-in/email", body, cookie);
  if (response.status !== 429) return response;
  const retryAfter = Number(response.headers.get("x-retry-after") ?? "10");
  await new Promise((resolve) => setTimeout(resolve, (retryAfter + 0.1) * 1_000));
  response = await authMutation("/api/auth/sign-in/email", body, cookie);
  return response;
}

function cookieHeader(response) {
  return response.headers.getSetCookie()
    .map((value) => value.slice(0, value.indexOf(";")))
    .join("; ");
}

function mergeCookieHeaders(...headers) {
  const cookies = new Map();
  for (const header of headers) {
    for (const pair of header.split("; ")) {
      if (!pair) continue;
      const separator = pair.indexOf("=");
      cookies.set(pair.slice(0, separator), pair.slice(separator + 1));
    }
  }
  return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
}

function currentTotp(encodedSecret) {
  const secret = decodeBase32(encodedSecret);
  const counter = Math.floor(Date.now() / 30_000);
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", secret).update(message).digest();
  const offset = digest.at(-1) & 0x0f;
  const value = digest.readUInt32BE(offset) & 0x7fffffff;
  return String(value % 1_000_000).padStart(6, "0");
}

function decodeBase32(value) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const character of value.replaceAll("=", "").toUpperCase()) {
    const index = alphabet.indexOf(character);
    assert.notEqual(index, -1, `Invalid base32 character: ${character}`);
    bits += index.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let index = 0; index + 8 <= bits.length; index += 8) {
    bytes.push(Number.parseInt(bits.slice(index, index + 8), 2));
  }
  return Buffer.from(bytes);
}
