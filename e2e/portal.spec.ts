import { expect, test } from "@playwright/test";
import { FULL_BILLING } from "../src/lib/features";
import { signIn, uniqueMobile } from "./helpers";

test.describe("signed out", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("redirects signed-out visitors to sign in", async ({ page }) => {
    await page.goto("/customers");
    await expect(page).toHaveURL(/\/login\?next=%2Fcustomers/);
  });

  test("forgot-password never reveals whether an account exists", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByText(/If an account exists/)).toBeVisible();
  });
});

test("owner bills a new customer and sees the invoice", async ({ page }) => {
  test.skip(!FULL_BILLING, "Itemised billing is switched off in src/lib/features.ts");
  await signIn(page);
  await page.getByRole("link", { name: "New bill" }).click();

  await page.getByRole("combobox", { name: /^Mobile number/ }).fill(uniqueMobile());
  await page.getByRole("textbox", { name: "Name" }).fill("E2E Customer");
  await page.getByPlaceholder("e.g. Temple necklace").fill("Silver anklet");
  await page.getByRole("combobox", { name: "Metal" }).click();
  await page.getByRole("option", { name: "Silver" }).click();
  await page.getByRole("spinbutton", { name: "Net wt (g)" }).fill("30");
  await page.getByRole("spinbutton", { name: "Rate / g (₹)" }).fill("95");
  await page.getByRole("spinbutton", { name: "Making (₹)" }).fill("600");

  // 30 g × ₹95 + ₹600 = ₹3,450; 3% GST = ₹103.50 → ₹3,553.50 → rounded ₹3,554.
  await expect(page.locator("#bill-summary").getByText("₹3,554.00")).toBeVisible();
  await page.getByRole("button", { name: "Save bill" }).click();

  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);
  await expect(page.getByRole("heading", { name: /INV\/\d{4}-\d{2}\/\d{5}/ })).toBeVisible();
  await expect(page.getByRole("link", { name: "E2E Customer" })).toBeVisible();
});

test("hallmarked gold cannot be billed without a HUID", async ({ page }) => {
  test.skip(!FULL_BILLING, "Itemised billing is switched off in src/lib/features.ts");
  await signIn(page);
  await page.goto("/billing");
  await page.getByRole("combobox", { name: /^Mobile number/ }).fill(uniqueMobile());
  await page.getByRole("textbox", { name: "Name" }).fill("E2E Gold");
  await page.getByPlaceholder("e.g. Temple necklace").fill("Gold chain");
  await page.getByRole("spinbutton", { name: "Net wt (g)" }).fill("5");
  await page.getByRole("spinbutton", { name: "Rate / g (₹)" }).fill("7000");
  await page.getByRole("spinbutton", { name: "Making (₹)" }).fill("3000");

  await expect(page.getByText(/HUID is required/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Save bill" })).toBeDisabled();

  await page.getByPlaceholder("AB12CD").fill(`E${String(Date.now()).slice(-5)}`);
  await expect(page.getByText(/HUID is required/)).toBeHidden();
  await expect(page.getByRole("button", { name: "Save bill" })).toBeEnabled();
});

test("owner can open reports and the audit log", async ({ page }) => {
  await signIn(page);
  await page.getByRole("link", { name: "Reports" }).click();
  await expect(page.getByRole("heading", { name: "Reports" })).toBeVisible();
  await page.getByRole("link", { name: "Audit log" }).click();
  await expect(page.getByText("auth.login").first()).toBeVisible();
});

