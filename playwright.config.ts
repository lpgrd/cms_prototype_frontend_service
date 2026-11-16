import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests against a running portal + API (see .github/workflows/ci.yml).
 * Locally: E2E_BASE_URL=http://localhost:3001 npm run test:e2e
 * Set E2E_CHROMIUM_PATH to use an installed Chromium-based browser instead of Playwright's download.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    // Signed in as the owner by global-setup; tests that exercise sign-in opt out.
    storageState: "e2e/.auth/owner.json",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    timezoneId: "Asia/Kolkata",
    locale: "en-IN",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        launchOptions: process.env.E2E_CHROMIUM_PATH ? { executablePath: process.env.E2E_CHROMIUM_PATH } : {},
      },
    },
  ],
});
