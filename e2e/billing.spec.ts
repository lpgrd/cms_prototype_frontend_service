import { expect, test } from "@playwright/test";
import { signIn, uniqueMobile } from "./helpers";

test("typing part of a number suggests customers and picking one fills in their details", async ({ page }) => {
  await signIn(page);
  const mobile = uniqueMobile();
  const oldNumber = `55${mobile.slice(-8)}`;
  const res = await page.request.post("/api/customers", {
    data: { mobile, name: "Suggest Me", city: "Kochi", contacts: [{ type: "PHONE", value: oldNumber, label: "Old", isOutdated: true }] },
  });
  expect(res.status()).toBe(201);

  await page.goto("/billing");
  const field = page.getByRole("combobox", { name: /^Mobile number/ });
  await field.fill(mobile.slice(-6));
  const option = page.getByRole("option", { name: /Suggest Me/ });
  await expect(option).toBeVisible();
  await expect(option).toContainText("Kochi");

  await field.press("ArrowDown");
  await expect(option).toHaveAttribute("aria-selected", "true");
  await field.press("Enter");
  await expect(field).toHaveValue(mobile);
  await expect(page.getByRole("listbox", { name: "Matching customers" })).toHaveCount(0);
  await expect(page.getByText("Suggest Me", { exact: true })).toBeVisible();
  await expect(page.getByText("New customer. Add their details below.")).toHaveCount(0);

  // An old number finds the customer too, and picking it bills against their current mobile.
  await field.fill(oldNumber);
  const viaOld = page.getByRole("option", { name: /Suggest Me/ });
  await expect(viaOld).toContainText("Old number");
  await viaOld.click();
  await expect(field).toHaveValue(mobile);
});

test("a bill can be split between cash and UPI and must add up before saving", async ({ page }) => {
  await signIn(page);
  await page.goto("/billing");
  await page.getByRole("combobox", { name: /^Mobile number/ }).fill(uniqueMobile());
  await page.getByRole("textbox", { name: /^Name/ }).fill("Split Payer");
  await page.getByPlaceholder("e.g. Temple necklace").fill("Silver anklet");
  await page.getByRole("combobox", { name: "Metal" }).click();
  await page.getByRole("option", { name: "Silver" }).click();
  await page.getByRole("spinbutton", { name: /^Net wt/ }).fill("30");
  await page.getByRole("spinbutton", { name: /^Rate/ }).fill("95");
  await page.getByRole("spinbutton", { name: "Making (₹)" }).fill("600");
  await expect(page.locator("#bill-summary").getByText("₹3,554.00")).toBeVisible();

  await page.getByRole("button", { name: "Split between methods" }).click();
  await page.getByRole("combobox", { name: "Payment 1 method" }).click();
  await page.getByRole("option", { name: "Cash", exact: true }).click();
  await page.getByRole("spinbutton", { name: "Payment 1 amount" }).fill("2000");
  await expect(page.getByText("₹1,554.00 left to collect")).toBeVisible();
  await expect(page.getByRole("button", { name: "Save bill" })).toBeDisabled();

  await page.getByRole("combobox", { name: "Payment 2 method" }).click();
  await page.getByRole("option", { name: "UPI", exact: true }).click();
  await page.getByRole("button", { name: /Add the rest/ }).click();
  await expect(page.getByRole("spinbutton", { name: "Payment 2 amount" })).toHaveValue("1554");
  await page.getByRole("textbox", { name: "Payment 2 reference" }).fill("UTR998877");
  await expect(page.getByText("Fully paid")).toBeVisible();
  await page.getByRole("button", { name: "Save bill" }).click();

  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);
  await expect(page.getByText("Paid by Cash")).toBeVisible();
  await expect(page.getByText("UPI (UTR998877)")).toBeVisible();
});
