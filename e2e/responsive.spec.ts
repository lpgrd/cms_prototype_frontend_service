import { expect, test, type Page } from "@playwright/test";
import { signIn } from "./helpers";

const PAGES = ["/dashboard", "/billing", "/transactions", "/customers", "/campaigns", "/partners", "/payouts", "/audit", "/settings", "/roles"];

const horizontalOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

for (const [device, width] of [
  ["phone", 375],
  ["tablet", 768],
] as const) {
  test(`no page scrolls sideways on a ${device} (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await signIn(page);
    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      expect(await horizontalOverflow(page), `${path} overflows`).toBeLessThanOrEqual(0);
    }
  });
}

test("on a tablet the menu is a drawer that closes after choosing a page", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 900 });
  await signIn(page);
  const menuLink = page.getByRole("link", { name: "Customers", exact: true });
  await expect(menuLink).toBeHidden();

  await page.getByRole("button", { name: "Toggle Sidebar" }).click();
  await menuLink.click();
  await expect(page).toHaveURL(/\/customers$/);
  await expect(menuLink).toBeHidden();
});

test("on a phone the bill total stays in view and leads to the summary", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await signIn(page);
  await page.goto("/billing");
  const review = page.getByRole("button", { name: "Review and save" });
  await expect(review).toBeInViewport();
  await review.click();
  await expect(page.getByRole("button", { name: "Save bill" })).toBeInViewport();
});
