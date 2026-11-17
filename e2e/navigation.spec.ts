import { expect, test } from "@playwright/test";
import { FULL_BILLING } from "../src/lib/features";
import { signIn, uniqueMobile } from "./helpers";

test("Back returns to the page you came from, or to the parent list", async ({ page }) => {
  test.skip(!FULL_BILLING, "Itemised billing is switched off in src/lib/features.ts");
  await signIn(page);

  // A customer with one bill.
  const mobile = uniqueMobile();
  const name = `Nav ${mobile.slice(-4)}`;
  const bill = await page.request.post("/api/transactions", {
    data: {
      customer: { mobile, name },
      items: [{ description: "Silver ring", metalType: "SILVER", grossWeight: 5, netWeight: 5, ratePerGram: 100, makingCharges: 200 }],
      paymentMode: "UPI",
    },
  });
  expect(bill.status()).toBe(201);
  const { id: billId, invoiceNumber, customerId } = await bill.json();

  // Customers → customer → bill, then Back twice.
  await page.getByRole("link", { name: "Customers" }).click();
  await page.goto(`/customers/${customerId}`);
  await page.getByRole("link", { name: invoiceNumber }).click();
  await expect(page).toHaveURL(new RegExp(`/transactions/${billId}$`));
  await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toContainText("Bills/Details");

  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(new RegExp(`/customers/${customerId}$`));
  await expect(page.getByRole("heading", { name })).toBeVisible();

  // Opened directly (no in-app history): Back goes to the parent list.
  const fresh = await page.context().newPage();
  await fresh.goto(`/transactions/${billId}`);
  await fresh.getByRole("button", { name: "Back" }).click();
  await expect(fresh).toHaveURL(/\/transactions$/);
  await fresh.close();
});

test("Back from a customer returns to the list, or to it when opened directly", async ({ page }) => {
  await signIn(page);
  const mobile = uniqueMobile();
  const name = `Nav ${mobile.slice(-4)}`;
  const created = await page.request.post("/api/customers", { data: { mobile, name } });
  expect(created.status()).toBe(201);
  const { id } = await created.json();

  await page.goto(`/customers?q=${encodeURIComponent(name)}`);
  await page.getByRole("link", { name }).click();
  await expect(page).toHaveURL(new RegExp(`/customers/${id}$`));
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page).toHaveURL(/\/customers\?q=/);

  const fresh = await page.context().newPage();
  await fresh.goto(`/customers/${id}`);
  await fresh.getByRole("button", { name: "Back" }).click();
  await expect(fresh).toHaveURL(/\/customers$/);
  await fresh.close();
});
