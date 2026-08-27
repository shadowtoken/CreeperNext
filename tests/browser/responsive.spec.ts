import { expect, test } from "@playwright/test";
import {
  authenticate,
  expectResponsiveLayout,
  expectTouchTargets,
} from "./support/assertions";

const publicRoutes = [
  { path: "/", heading: /从一个好地基/ },
  { path: "/login", heading: /继续你的构建/ },
  { path: "/register", heading: /创建你的起点/ },
  { path: "/missing-page", heading: /这里还没有盖房子/ },
] as const;

for (const route of publicRoutes) {
  test(`${route.path} keeps the responsive invariants`, async ({ page }) => {
    const response = await page.goto(route.path);
    expect(response?.status()).toBe(route.path === "/missing-page" ? 404 : 200);
    await expect(page.getByRole("heading", { level: 1, name: route.heading })).toBeVisible();
    await expectResponsiveLayout(page);
    await expectTouchTargets(page);
  });
}

test("the authenticated surface keeps the same invariants", async ({ page }) => {
  await authenticate(page);
  const response = await page.goto("/account");
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("响应式测试");
  await expectResponsiveLayout(page);
  await expectTouchTargets(page);
});
