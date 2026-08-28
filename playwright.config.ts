import { defineConfig } from "@playwright/test";
import { testOrigin, testPort, viewportMatrix } from "./tests/browser/matrix";

function testsForProject(name: string) {
  return [
    /responsive\.spec\.ts/,
    ...(["mobile-390", "compact-1280x800"].includes(name) ? [/accessibility\.spec\.ts/] : []),
    ...(["mobile-390", "compact-1280x800"].includes(name) ? [/capabilities\.spec\.ts/] : []),
    ...(["mobile-390", "compact-1280x800"].includes(name) ? [/auth-onboarding\.spec\.ts/] : []),
    ...(["regular-1024", "compact-1280x832"].includes(name) ? [/boundaries\.spec\.ts/] : []),
  ];
}

export default defineConfig({
  globalSetup: "./tests/browser/global-setup.ts",
  testDir: "./tests/browser",
  testMatch: "**/*.spec.ts",
  outputDir: "test-results",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  failOnFlakyTests: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 45_000,
  expect: { timeout: 7_500 },
  reporter: [
    ["line"],
    ["html", { outputFolder: "playwright-report", open: "never" }],
  ],
  use: {
    baseURL: testOrigin,
    browserName: "chromium",
    colorScheme: "light",
    locale: "zh-CN",
    deviceScaleFactor: 1,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: viewportMatrix.map(({ name, viewport, ...capabilities }) => ({
    name,
    testMatch: testsForProject(name),
    use: { viewport, ...capabilities },
  })),
  webServer: {
    command: "node tests/browser/support/serve-test-app.mjs",
    url: testOrigin,
    timeout: 240_000,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 10_000 },
    env: {
      CREEPER_E2E_PORT: String(testPort),
      AUTH_COOKIE_PREFIX: "creeper_browser_test",
      BETTER_AUTH_SECRET: "creeper-browser-test-secret-at-least-thirty-two-characters",
      BETTER_AUTH_URL: testOrigin,
      SITE_URL: testOrigin,
    },
  },
});
