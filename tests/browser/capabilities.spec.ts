import { expect, test } from "@playwright/test";
import { authenticate, expectResponsiveLayout, expectTouchTargets } from "./support/assertions";

test("reduced motion preserves state with near-zero durations", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "One representative project covers the preference.");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");

  const result = await page.locator("a[href='/register']").first().evaluate(() => ({
    matches: matchMedia("(prefers-reduced-motion: reduce)").matches,
    scrollBehavior: getComputedStyle(document.documentElement).scrollBehavior,
  }));

  const motionOffenders = await page.locator("body *").evaluateAll((elements) => {
    const seconds = (value: string) => Math.max(...value.split(",").map((part) => {
      const duration = part.trim();
      if (duration.endsWith("ms")) return Number.parseFloat(duration) / 1000;
      if (duration.endsWith("s")) return Number.parseFloat(duration);
      return 0;
    }));
    return elements.flatMap((element) => {
      const html = element as HTMLElement;
      const style = getComputedStyle(html);
      const rect = html.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || rect.width === 0 || rect.height === 0) return [];
      const transition = seconds(style.transitionDuration);
      const animation = style.animationName === "none" ? 0 : seconds(style.animationDuration);
      return transition > 0.0001 || animation > 0.0001
        ? [`${html.tagName.toLowerCase()}: transition=${transition}s animation=${animation}s`]
        : [];
    });
  });

  expect(result.matches).toBe(true);
  expect(result.scrollBehavior).toBe("auto");
  expect(motionOffenders).toEqual([]);
  await expect(page.locator("a[href='/register']").first()).toBeVisible();
});

test("registration errors remain reachable on a touch viewport", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "One touch project covers the interaction.");
  await page.goto("/register");
  await page.getByLabel("称呼").fill("测试用户");
  await page.getByLabel("邮箱").fill("responsive-error@example.com");
  await page.getByLabel("密码", { exact: true }).fill("password-one");
  await page.getByLabel("确认密码").fill("password-two");
  await page.getByRole("button", { name: "创建账户" }).tap();
  await expect(page.locator("#register-error")).toBeVisible();
  await expectResponsiveLayout(page);
  await expectTouchTargets(page);
});

test("password visibility is explicit and reversible", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-390", "One touch project covers the composite control.");
  await page.goto("/login");

  const password = page.locator("#login-password");
  const toggle = page.getByRole("button", { name: "显示密码" });
  await expect(password).toHaveAttribute("type", "password");
  await expect(toggle).toHaveAttribute("aria-controls", "login-password");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");

  await toggle.tap();
  await expect(password).toHaveAttribute("type", "text");
  await expect(page.getByRole("button", { name: "隐藏密码" })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "隐藏密码" }).tap();
  await expect(password).toHaveAttribute("type", "password");
});

test("200% text resizing preserves every core surface", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "compact-1280x800", "This is text resizing, not a DPR simulation.");
  for (const route of ["/", "/login", "/register", "/two-factor"] as const) {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await page.evaluate(() => {
      document.documentElement.style.fontSize = "200%";
    });
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    await expectResponsiveLayout(page);
  }

  await authenticate(page);
  const account = await page.goto("/account");
  expect(account?.status()).toBe(200);
  await page.evaluate(() => {
    document.documentElement.style.fontSize = "200%";
  });
  await expect(page.getByRole("heading", { level: 1, name: "账户与安全" })).toBeVisible();
  await expect(page.getByText("响应式测试", { exact: true })).toBeVisible();
  await expectResponsiveLayout(page);
});
