import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { expectResponsiveLayout, expectTouchTargets } from "./support/assertions";
import { currentTotp } from "./support/totp";

test("registration is gated by the complete MFA enrollment flow", async ({ page }, testInfo) => {
  const suffix = `${testInfo.project.name}-${Date.now()}`.replaceAll(/[^a-z0-9-]/gi, "-");
  const email = `onboarding-${suffix}@example.com`;
  const password = "creeper-onboarding-password";

  await page.goto("/register?returnTo=%2Faccount");
  await page.getByLabel("称呼").fill("安全设置测试");
  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码", { exact: true }).fill(password);
  await page.getByLabel("确认密码").fill(password);
  await page.getByRole("button", { name: "创建账户" }).click();
  await expect(page).toHaveURL(/\/login\?registered=1&returnTo=%2Faccount$/);
  await expect(page.getByText("账户已创建；登录后继续绑定身份验证器。")).toBeVisible();

  await page.getByLabel("邮箱").fill(email);
  await page.getByLabel("密码", { exact: true }).fill(password);
  await page.getByRole("button", { name: "登录", exact: true }).click();
  await expect(page).toHaveURL(/\/two-factor\/setup\?returnTo=%2Faccount$/);
  await expect(page.getByRole("heading", { level: 1, name: "设置账户安全" })).toHaveCount(1);
  await expectSetupGeometry(page);
  await expectResponsiveLayout(page);
  await expectTouchTargets(page);
  await expectNoAxeViolations(page);

  await page.getByLabel("确认当前密码").fill(password);
  await page.getByRole("button", { name: "继续设置" }).click();

  await expect(page.locator("[data-enrollment-secret]")).toBeVisible();
  const secret = await page.locator("[data-enrollment-secret]").textContent();
  expect(secret).toBeTruthy();
  await expectSetupGeometry(page);
  await expectResponsiveLayout(page);
  await expectTouchTargets(page);
  await page.getByRole("button", { name: "我已扫描，继续" }).click();

  await expect(page.getByRole("list", { name: "账户恢复码" })).toBeVisible();
  await expect(page.getByRole("list", { name: "账户恢复码" }).getByRole("listitem")).toHaveCount(10);
  await expectSetupGeometry(page);
  await expectResponsiveLayout(page);
  await expectTouchTargets(page);
  await expectNoAxeViolations(page);

  await page.getByText("我已经把恢复码保存到安全位置").click();
  await page.getByLabel("输入身份验证器当前的 6 位代码").fill(currentTotp(secret!));
  await page.getByRole("button", { name: "保存并完成设置" }).click();

  await expect(page).toHaveURL(/\/account$/);
  await expect(page.getByRole("heading", { level: 1, name: "账户与安全" })).toBeVisible();
  const sessionResponse = await page.request.get("/api/auth/get-session");
  const session = await sessionResponse.json();
  expect(session.user.twoFactorEnabled).toBe(true);
  expect(session.session.mfaVerifiedAt).toBeTruthy();
  await expectResponsiveLayout(page);
  await expectTouchTargets(page);
  await expectNoAxeViolations(page);
});

async function expectSetupGeometry(page: import("@playwright/test").Page) {
  const geometry = await page.locator("[data-security-setup]").evaluate((surface) => {
    const rect = surface.getBoundingClientRect();
    const style = getComputedStyle(surface);
    return {
      borderWidth: Number.parseFloat(style.borderTopWidth),
      centerOffset: (rect.left + rect.right) / 2 - document.documentElement.clientWidth / 2,
      left: rect.left,
      width: rect.width,
      viewportWidth: document.documentElement.clientWidth,
    };
  });

  expect(Math.abs(geometry.centerOffset)).toBeLessThanOrEqual(1);
  expect(geometry.width).toBeLessThanOrEqual(768.5);
  if (geometry.viewportWidth === 390) {
    expect(geometry.left).toBeCloseTo(24, 0);
    expect(geometry.borderWidth).toBe(0);
  }
}

async function expectNoAxeViolations(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
}
