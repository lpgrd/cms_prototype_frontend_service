import { expect, test } from "@playwright/test";
import { signIn, uniqueMobile } from "./helpers";

test("Back returns to the page you came from, or to the parent list", async ({ page }) => {
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
