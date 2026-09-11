import assert from "node:assert/strict";
import test from "node:test";
import { authFailure } from "../features/auth/lib/auth-failure";

test("network and server failures never blame a field, even with a misleading error code", () => {
  for (const operation of ["login", "register", "change-password", "enroll", "verify", "sign-out"] as const) {
    for (const status of [0, 500, 502, 503]) {
      const failure = authFailure({ status, code: "INVALID_PASSWORD" }, operation);
      assert.equal(failure.field, undefined);
      assert.equal(failure.recovery, undefined);
      assert.match(failure.message, status === 0 ? /网络/ : /服务/);
    }
  }
});

test("rate limiting is distinct from an explicit account lock", () => {
  assert.deepEqual(authFailure({ status: 429 }, "verify"), { message: "操作过于频繁，请稍后重试。" });
  const locked = authFailure({ status: 429, code: "ACCOUNT_TEMPORARILY_LOCKED" }, "verify");
  assert.match(locked.message, /账户已暂时锁定/);
  assert.equal(locked.field, undefined);
});

test("known validation codes target only the relevant fields", () => {
  assert.equal(authFailure({ code: "INVALID_EMAIL_OR_PASSWORD" }, "login").field, "credentials");
  assert.equal(authFailure({ code: "INVALID_PASSWORD" }, "change-password").field, "currentPassword");
  assert.equal(authFailure({ code: "INVALID_PASSWORD" }, "enroll").field, "password");
  assert.equal(authFailure({ code: "INVALID_CODE", status: 401 }, "verify").field, "code");
  for (const code of ["PASSWORD_TOO_SHORT", "PASSWORD_TOO_LONG"]) {
    assert.equal(authFailure({ code }, "register").field, "password");
    assert.equal(authFailure({ code }, "change-password").field, "newPassword");
  }
});

test("expired authentication offers recovery rather than another code attempt", () => {
  for (const code of ["INVALID_TWO_FACTOR_COOKIE", "SESSION_EXPIRED", "UNAUTHORIZED", "MFA_REAUTH_REQUIRED", "MFA_REQUIRED", "TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE", "TOTP_NOT_ENABLED"]) {
    const failure = authFailure({ code }, "verify");
    assert.equal(failure.recovery, "login");
    assert.equal(failure.field, undefined);
  }
  assert.equal(authFailure({ code: "TWO_FACTOR_ALREADY_ENABLED" }, "enroll").recovery, "refresh");
});

test("unknown and out-of-context codes stay generic and never expose server text", () => {
  const error = { status: 400, code: "PRIVATE_DATABASE_DETAIL", message: "private-user-and-secret", statusText: "private-host" };
  const failure = authFailure(error, "register");
  assert.doesNotMatch(JSON.stringify(failure), /PRIVATE_DATABASE_DETAIL|private-user|private-host/);
  assert.equal(failure.field, undefined);
  assert.equal(authFailure({ code: "INVALID_CODE" }, "register").field, undefined);
  assert.equal(authFailure({ code: "INVALID_PASSWORD" }, "sign-out").field, undefined);
  assert.equal(authFailure({ code: "INVALID_TWO_FACTOR_COOKIE" }, "login").recovery, undefined);
});
