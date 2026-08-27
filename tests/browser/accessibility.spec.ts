import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { authenticate } from "./support/assertions";

const routes = ["/", "/login", "/register"] as const;
const semanticPairs = [
  ["canvas / primary", "--color-bg-canvas", "--color-text-primary"],
  ["canvas / secondary", "--color-bg-canvas", "--color-text-secondary"],
  ["canvas / link", "--color-bg-canvas", "--color-text-link"],
  ["inverse / inverse", "--color-bg-inverse", "--color-text-inverse"],
  ["inverse / muted", "--color-bg-inverse", "--color-text-inverse-muted"],
  ["primary / on-primary", "--color-action-primary", "--color-text-on-primary"],
  ["accent / on-accent", "--color-action-accent", "--color-text-on-accent"],
  ["danger / on-danger", "--color-status-danger", "--color-text-on-danger"],
] as const;

for (const route of routes) {
  test(`${route} has no automated WCAG A/AA violations`, async ({ page }, testInfo) => {
    test.skip(
      !["mobile-390", "compact-1280x800"].includes(testInfo.project.name),
      "Axe covers one narrow and one compact-desktop composition.",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  });
}

test("the authenticated surface has no automated WCAG A/AA violations", async ({ page }, testInfo) => {
  test.skip(
    !["mobile-390", "compact-1280x800"].includes(testInfo.project.name),
    "Axe covers one narrow and one compact-desktop composition.",
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  await authenticate(page);
  await page.goto("/account");
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(results.violations).toEqual([]);
});

test("the runtime dark theme keeps its semantic contrast", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "compact-1280x800", "One stable desktop layout covers theme aliases.");

  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => document.documentElement.setAttribute("data-theme", "dark"));
  for (const route of ["/", "/login"] as const) {
    await page.goto(route);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(results.violations).toEqual([]);
  }
});

test("semantic foreground and surface token pairs meet 4.5:1", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "compact-1280x800", "Token contrast is independent of viewport size.");

  await page.goto("/");
  for (const theme of ["light", "dark"] as const) {
    await page.locator("html").evaluate((element, currentTheme) => {
      if (currentTheme === "dark") element.setAttribute("data-theme", "dark");
      else element.removeAttribute("data-theme");
    }, theme);
    const failures = await contrastFailures(page);
    expect(failures, `${theme} semantic token contrast`).toEqual([]);
  }
});

async function contrastFailures(page: Page) {
  return page.evaluate((pairs) => {
    const parse = (value: string) => {
      const channels = value.match(/[\d.]+/g)?.slice(0, 3).map(Number) ?? [];
      if (channels.length !== 3) throw new Error(`Cannot parse computed color: ${value}`);
      return channels.map((channel) => {
        const normalized = channel / 255;
        return normalized <= 0.04045
          ? normalized / 12.92
          : ((normalized + 0.055) / 1.055) ** 2.4;
      });
    };
    const luminance = (value: string) => {
      const [red, green, blue] = parse(value);
      return (0.2126 * red) + (0.7152 * green) + (0.0722 * blue);
    };
    const ratio = (foreground: string, background: string) => {
      const light = Math.max(luminance(foreground), luminance(background));
      const dark = Math.min(luminance(foreground), luminance(background));
      return (light + 0.05) / (dark + 0.05);
    };

    const probe = document.createElement("span");
    probe.textContent = "Aa";
    document.body.append(probe);
    const failures: string[] = [];
    for (const [name, backgroundToken, foregroundToken] of pairs) {
      probe.style.backgroundColor = `var(${backgroundToken})`;
      probe.style.color = `var(${foregroundToken})`;
      const style = getComputedStyle(probe);
      const contrast = ratio(style.color, style.backgroundColor);
      if (contrast < 4.5) failures.push(`${name}: ${contrast.toFixed(2)}:1`);
    }
    probe.remove();
    return failures;
  }, semanticPairs);
}
