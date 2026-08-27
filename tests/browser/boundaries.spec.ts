import { expect, test } from "@playwright/test";
import { expectResponsiveLayout } from "./support/assertions";

test("page ranges stay valid one pixel around their thresholds", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "regular-1024", "Run boundary probes once, not in every matrix project.");

  for (const width of [559, 560, 561, 1023, 1024, 1025]) {
    await page.setViewportSize({ width, height: 800 });
    const landing = await page.goto("/");
    expect(landing?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: /从一个好地基/ })).toBeVisible();
    await expectResponsiveLayout(page);
    const register = await page.goto("/register");
    expect(register?.status()).toBe(200);
    await expect(page.getByRole("heading", { level: 1, name: /创建账户/ })).toBeVisible();
    await expectResponsiveLayout(page);
  }
});

test("compact desktop keeps its composition and reachable actions around 52rem height", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "compact-1280x832", "Run the height boundary probe once.");

  for (const height of [831, 832, 833]) {
    await page.setViewportSize({ width: 1280, height });
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    await expectResponsiveLayout(page);
    await expect(page.getByRole("heading", { level: 1, name: /从一个好地基/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /免费开始/ })).toBeVisible();
    const columns = await page.locator("#top").evaluate((element) => getComputedStyle(element).gridTemplateColumns);
    expect(columns.split(" ")).toHaveLength(2);
  }
});
