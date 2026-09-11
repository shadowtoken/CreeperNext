import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { authenticate, expectResponsiveLayout, expectTouchTargets } from "./support/assertions";
import { currentTotp } from "./support/totp";

for (const scenario of [
  { path: "/login", endpoint: "sign-in/email", values: { email: "pending@example.com", password: "pending-password" } },
  { path: "/register", endpoint: "sign-up/email", values: { name: "测试", email: "pending@example.com", password: "pending-password", confirmation: "pending-password" } },
  { path: "/two-factor", endpoint: "two-factor/verify-totp", values: { code: "123456" } },
]) {
  test(`${scenario.path} keeps submitted inputs read-only until the request finishes`, async ({ page }) => {
    let release!: () => void;
    const held = new Promise<void>((resolve) => { release = resolve; });
    let requests = 0;
    await page.route(`**/api/auth/${scenario.endpoint}`, async (route) => {
      requests += 1;
      await held;
      await route.fulfill({ status: 503, json: { code: "SERVICE_UNAVAILABLE" } });
    });
    await page.goto(scenario.path);
    for (const [name, value] of Object.entries(scenario.values)) {
      await page.locator(`input[name="${name}"]`).fill(value);
    }
    try {
      await page.locator('button[type="submit"]').click();
      await expect.poll(() => requests).toBe(1);
      for (const [name, value] of Object.entries(scenario.values)) {
        const input = page.locator(`input[name="${name}"]`);
        await expect(input).toHaveJSProperty("readOnly", true);
        await expect(input).toBeEnabled();
        await input.focus();
        await page.keyboard.type("changed");
        await expect(input).toHaveValue(value);
      }
      // Enter cannot create a second write while the first request is pending.
      await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
      expect(requests).toBe(1);
    } finally { release(); }
    await expect(page.locator('button[type="submit"]')).toBeEnabled();
    for (const [name, value] of Object.entries(scenario.values)) {
      const input = page.locator(`input[name="${name}"]`);
      await expect(input).toBeEditable();
      await expect(input).toHaveValue(value);
    }
  });
}

test("password visibility controls identify their fields and support keyboard activation", async ({ page }) => {
  await page.goto("/register");
  const password = page.getByLabel("密码", { exact: true });
  const confirmation = page.getByLabel("确认密码", { exact: true });
  await password.fill("visibility-password");
  await confirmation.fill("visibility-password");
  const toggle = page.getByRole("button", { name: "显示确认密码", exact: true });
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(confirmation).toHaveAttribute("type", "text");
  await expect(password).toHaveAttribute("type", "password");
  await expect(confirmation).toHaveAttribute("spellcheck", "false");
  await expect(confirmation).toHaveAttribute("autocapitalize", "none");
  await expect(page.getByRole("button", { name: "隐藏确认密码", exact: true })).toBeFocused();
  await page.keyboard.press("Space");
  await expect(confirmation).toHaveAttribute("type", "password");
  await expect(confirmation).toHaveValue("visibility-password");
});

test("local validation focuses only the failing field before any request", async ({ page }) => {
  let requests = 0;
  page.on("request", (request) => { if (request.url().endsWith("/api/auth/sign-up/email")) requests += 1; });
  await page.goto("/register");
  await page.getByLabel("称呼").fill("   ");
  await page.getByLabel("邮箱").fill("validation@example.com");
  await page.getByLabel("密码", { exact: true }).fill("validation-password");
  await page.getByLabel("确认密码", { exact: true }).fill("different-password");
  await page.getByRole("button", { name: "创建账户" }).click();
  await expect(page.locator("#register-name")).toBeFocused();
  await expect(page.locator("input[aria-invalid='true']")).toHaveCount(1);
  await expect(page.locator("#register-error")).toHaveText("请输入称呼，不能只包含空格。");
  await page.getByLabel("称呼").fill("测试");
  await page.getByRole("button", { name: "创建账户" }).click();
  await expect(page.locator("#register-confirmation")).toBeFocused();
  await expect(page.locator("input[aria-invalid='true']")).toHaveCount(1);
  await expect(page.locator("#register-error")).toHaveText("两次输入的密码不一致。");
  expect(requests).toBe(0);
});

test("password errors distinguish fields, outages and expired sessions", async ({ page }) => {
  await authenticate(page);
  await page.goto("/account");
  let status = 400;
  let code = "INVALID_PASSWORD";
  let requests = 0;
  await page.route("**/api/auth/change-password", (route) => {
    requests += 1;
    return route.fulfill({ status, json: { code, message: "private detail" } });
  });
  await page.getByLabel("当前密码", { exact: true }).fill("current-password");
  await page.getByLabel("新密码", { exact: true }).fill("new-password-one");
  await page.getByLabel("确认新密码", { exact: true }).fill("new-password-two");
  await page.getByRole("button", { name: "修改密码" }).click();
  await expect(page.locator("#confirm-password")).toBeFocused();
  await expect(page.locator("input[aria-invalid='true']")).toHaveCount(1);
  expect(requests).toBe(0);
  await page.getByLabel("确认新密码", { exact: true }).fill("new-password-one");
  await page.getByRole("button", { name: "修改密码" }).click();
  await expect(page.locator("#change-password-error")).toHaveText("当前密码不正确。");
  await expect(page.locator("input[aria-invalid='true']")).toHaveAttribute("id", "current-password");
  status = 503;
  await page.getByRole("button", { name: "修改密码" }).click();
  await expect(page.locator("#change-password-error")).toHaveText("服务暂时不可用，请稍后重试。");
  await expect(page.locator("input[aria-invalid='true']")).toHaveCount(0);
  await expect(page.getByLabel("新密码", { exact: true })).toHaveValue("new-password-one");
  status = 401;
  code = "SESSION_EXPIRED";
  await page.getByRole("button", { name: "修改密码" }).click();
  await expect(page.getByRole("link", { name: "返回登录", exact: true })).toHaveAttribute("href", "/login?returnTo=%2Faccount");
  await expect(page.getByRole("button", { name: "修改密码" })).toBeDisabled();
  await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
  expect(requests).toBe(3);
  await expectResponsiveLayout(page);
  await expectTouchTargets(page);
});

test("TOTP errors identify invalid codes, limiting, outages and expired challenges", async ({ page }, testInfo) => {
  const cases = [
    { status: 401, code: "INVALID_CODE", message: "代码无效或已经使用，请检查身份验证器中的当前代码。", invalid: true },
    { status: 429, code: "RATE_LIMIT", message: "操作过于频繁，请稍后重试。", invalid: false },
    { status: 429, code: "ACCOUNT_TEMPORARILY_LOCKED", message: "验证失败次数过多，此账户已暂时锁定。请稍后再试。", invalid: false },
    { status: 503, code: "INVALID_CODE", message: "服务暂时不可用，请稍后重试。", invalid: false },
    { status: 401, code: "INVALID_TWO_FACTOR_COOKIE", message: "当前验证已失效，请重新登录后继续。", invalid: false },
  ];
  for (const item of cases) {
    await page.unroute("**/api/auth/two-factor/verify-totp");
    let requests = 0;
    await page.route("**/api/auth/two-factor/verify-totp", (route) => {
      requests += 1;
      return route.fulfill({ status: item.status, json: { code: item.code, message: "private detail" } });
    });
    await page.goto("/two-factor?returnTo=%2Faccount");
    await page.getByLabel("身份验证器 6 位代码").fill("123456");
    await page.getByRole("button", { name: "验证并登录" }).click();
    await expect(page.locator("#two-factor-error")).toHaveText(item.message);
    await expect(page.locator("input[aria-invalid='true']")).toHaveCount(item.invalid ? 1 : 0);
    await expect(page.getByLabel("身份验证器 6 位代码")).toHaveValue("123456");
    if (item.code === "INVALID_TWO_FACTOR_COOKIE") {
      await expect(page.getByRole("button", { name: "验证并登录" })).toBeDisabled();
      await page.locator("form").evaluate((form: HTMLFormElement) => form.requestSubmit());
      expect(requests).toBe(1);
      await expectResponsiveLayout(page);
      await expectTouchTargets(page);
      await page.screenshot({ path: testInfo.outputPath("expired-challenge.png"), fullPage: true });
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations).toEqual([]);
      await page.getByRole("link", { name: "返回登录", exact: true }).click();
      await expect(page).toHaveURL(/\/login\?returnTo=%2Faccount$/);
    } else {
      await expect(page.getByRole("button", { name: "验证并登录" })).toBeEnabled();
    }
  }
});

test("enrollment completed elsewhere can refresh into the server-authorized account", async ({ page }, testInfo) => {
  await page.goto("/register");
  const origin = new URL(page.url()).origin;
  const email = `parallel-enrollment-${testInfo.project.name}-${Date.now()}@example.com`;
  const password = "parallel-enrollment-password";
  const headers = { origin };
  // Setup shares the real limiter with earlier UI flows. Retry only explicit
  // pre-execution rate-limit rejections, never uncertain writes or server errors.
  async function prepare(path: string, data: Record<string, unknown>) {
    let response = await page.request.post(path, { headers, data });
    if (response.status() === 429) {
      const seconds = Number(response.headers()["retry-after"] ?? response.headers()["x-retry-after"]);
      expect(Number.isFinite(seconds) && seconds > 0 && seconds <= 10).toBe(true);
      await new Promise((resolve) => setTimeout(resolve, seconds * 1000 + 100));
      response = await page.request.post(path, { headers, data });
    }
    expect(response.status()).toBe(200);
    return response;
  }
  await prepare("/api/auth/sign-up/email", { name: "并行设置测试", email, password });
  await prepare("/api/auth/sign-in/email", { email, password });
  await page.goto("/two-factor/setup");
  const setup = await prepare("/api/auth/two-factor/enable", { password, method: "totp" });
  const secret = new URL((await setup.json()).totpURI).searchParams.get("secret");
  expect(secret).toBeTruthy();
  await prepare("/api/auth/two-factor/verify-totp", { code: currentTotp(secret!) });
  // The page still shows the old password stage; the authoritative session changed.
  await page.getByLabel("确认当前密码").fill(password);
  const attempt = page.waitForResponse((response) => response.url().endsWith("/api/auth/two-factor/enable") && response.request().method() === "POST");
  await page.getByRole("button", { name: "继续设置" }).click();
  const response = await attempt;
  if (response.status() === 429) {
    // The real limiter is shared with earlier tests. Only retry a rejected 429,
    // after its advertised cooldown; never weaken production rate limits.
    const seconds = Number(response.headers()["retry-after"] ?? response.headers()["x-retry-after"]);
    expect(Number.isFinite(seconds) && seconds > 0 && seconds <= 10).toBe(true);
    await new Promise((resolve) => setTimeout(resolve, (seconds * 1000) + 100));
    await page.getByRole("button", { name: "继续设置" }).click();
  }
  await expect(page.locator("#enrollment-error")).toHaveText("身份验证器已经启用，请刷新账户状态。");
  await expect(page.locator("input[aria-invalid='true']")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "继续设置" })).toBeDisabled();
  await page.getByRole("button", { name: "刷新状态" }).click();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { name: "账户与安全", level: 1 })).toBeVisible();
});

test("a slow submission is announced, deduplicated, and can recover without losing input", async ({ page }, testInfo) => {
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  let requests = 0;
  await page.route("**/api/auth/sign-up/email", async (route) => {
    requests += 1;
    await held;
    await route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ code: "SERVICE_UNAVAILABLE", message: "internal detail must not be displayed" }) });
  });
  await page.goto("/register");
  await page.getByLabel("称呼").fill("状态测试");
  await page.getByLabel("邮箱").fill("states@example.com");
  await page.getByLabel("密码", { exact: true }).fill("state-test-password");
  await page.getByLabel("确认密码", { exact: true }).fill("state-test-password");
  try {
    await page.locator("form").evaluate((form: HTMLFormElement) => { form.requestSubmit(); form.requestSubmit(); });
    const button = page.getByRole("button", { name: "正在创建…" });
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("aria-busy", "true");
    await expect(page.getByRole("status").filter({ hasText: "正在创建…" })).toHaveCount(1);
    await expect.poll(() => requests).toBe(1);
  } finally { release(); }
  await expect(page.locator("#register-error")).toHaveText("服务暂时不可用，请稍后重试。");
  await expect(page.getByRole("button", { name: "创建账户" })).toBeEnabled();
  await expect(page.getByLabel("邮箱")).toHaveValue("states@example.com");
  await expect(page.getByLabel("密码", { exact: true })).toHaveValue("state-test-password");
  await expect(page.locator("input[aria-invalid='true']")).toHaveCount(0);
  await expect(page.getByText("internal detail must not be displayed")).toHaveCount(0);
  await expectResponsiveLayout(page);
  await expectTouchTargets(page);
  await page.screenshot({ path: testInfo.outputPath("registration-error.png"), fullPage: true });
  expect((await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"]).analyze()).violations).toEqual([]);

  await page.unroute("**/api/auth/sign-up/email");
  await page.route("**/api/auth/sign-up/email", (route) => route.fulfill({ json: { user: {}, token: null } }));
  await page.getByRole("button", { name: "创建账户" }).click();
  await expect(page).toHaveURL(/\/login\?registered=1/);
  await expect(page.locator("#login-notice")).toBeVisible();
});

test("network failure returns the login form to an actionable state", async ({ page }) => {
  await page.route("**/api/auth/sign-in/email", (route) => route.abort("failed"));
  await page.goto("/login");
  await page.getByLabel("邮箱").fill("states@example.com");
  await page.getByLabel("密码", { exact: true }).fill("state-test-password");
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page.locator("#login-error")).not.toBeEmpty();
  await expect(page.locator("#login-error")).toHaveText("网络暂时不可用，请稍后重试。");
  await expect(page.getByRole("button", { name: "登录", exact: true })).toBeEnabled();
  await expect(page.locator("input[aria-invalid='true']")).toHaveCount(0);
  await expect(page.getByLabel("邮箱")).toHaveValue("states@example.com");
  await expectResponsiveLayout(page);
});

test("failed sign-out stays on the account page and supports retry", async ({ page }) => {
  await authenticate(page);
  await page.goto("/account");
  await page.route("**/api/auth/sign-out", (route) => route.fulfill({ status: 503, json: { message: "unavailable" } }));
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page.locator("#sign-out-error")).toBeVisible();
  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("button", { name: "退出登录" })).toBeEnabled();
  await expectResponsiveLayout(page);
  await expectTouchTargets(page);
  // Keep the shared test session valid; this test owns UI response handling only.
  await page.unroute("**/api/auth/sign-out");
  await page.route("**/api/auth/sign-out", (route) => route.fulfill({ json: { success: true } }));
  await page.getByRole("button", { name: "退出登录" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("404 has a usable recovery action at narrow widths and 200% text", async ({ page }, testInfo) => {
  const response = await page.goto("/missing-page");
  expect(response?.status()).toBe(404);
  await page.evaluate(() => { document.documentElement.style.fontSize = "200%"; });
  await expect(page.getByRole("heading", { level: 1, name: "页面不存在" })).toBeVisible();
  await expectResponsiveLayout(page);
  await expectTouchTargets(page);
  await page.screenshot({ path: testInfo.outputPath("not-found-200pct.png"), fullPage: true });
  await page.getByRole("link", { name: "返回首页", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
});
