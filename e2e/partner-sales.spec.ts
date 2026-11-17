import { expect, test } from "@playwright/test";
import { FULL_BILLING } from "../src/lib/features";
import { signIn, uniqueMobile } from "./helpers";

test("the counter enters a bill, scans a partner code and records the sale", async ({ page }) => {
  await signIn(page);

  // A partner with a live 10% offer and a 1% reward.
  const mobile = uniqueMobile();
  const partnerName = `Studio ${mobile.slice(-4)}`;
  const partner = await page.request.post("/api/influencers", {
    data: { name: partnerName, type: "BUSINESS", mobile, contactPerson: "Ritu" },
  });
  expect(partner.status()).toBe(201);
  const campaign = await page.request.post("/api/campaigns", {
    data: {
      name: `Sale test ${mobile.slice(-4)}`,
      discountType: "PERCENTAGE",
      discountValue: 10,
      discountBase: "BILL_AMOUNT",
      rewardType: "PERCENTAGE",
      rewardValue: 1,
      rewardBase: "BILL_AMOUNT",
      status: "ACTIVE",
    },
  });
  const campaignId = (await campaign.json()).id;
  const enrolled = await page.request.post(`/api/campaigns/${campaignId}/influencers`, {
    data: { influencerId: (await partner.json()).id },
  });
  const { code } = await enrolled.json();

  await page.getByRole("link", { name: "Partner sale" }).click();
  await expect(page.getByRole("heading", { name: "Partner sale", level: 1 })).toBeVisible();
  await page.getByRole("spinbutton", { name: /^Bill amount/ }).fill("50000");
  const billNo = `E2E/${mobile.slice(-6)}`;
  await page.getByRole("textbox", { name: /^Bill number/ }).fill(billNo);
  // A scanner types the whole QR link; the field keeps only the code.
  const codeField = page.getByPlaceholder("Scan QR or type code");
  await codeField.fill(`http://localhost:3001/r/${code.toLowerCase()}`);
  await expect(codeField).toHaveValue(code);
  const customerMobile = uniqueMobile();
  await page.getByRole("combobox", { name: /^Mobile number/ }).fill(customerMobile);
  await page.getByRole("textbox", { name: /^Name/ }).fill("E2E Sale Customer");

  // The partner and the final amount appear once the code is read.
  const summary = page.locator("#sale-summary");
  await expect(summary.getByText(partnerName, { exact: true })).toBeVisible();
  await expect(summary.getByText("Business")).toBeVisible();
  await expect(summary.getByText("10% off")).toBeVisible();
  await expect(summary.getByText("₹45,000.00")).toBeVisible();
  await expect(summary.getByText(`${partnerName} earns 450 pts`)).toBeVisible();

  // When Settings ask for it (and SMS works), the customer confirms with an OTP; in development its code is shown.
  const sendOtp = page.getByRole("button", { name: "Send OTP" });
  if (await sendOtp.isVisible()) {
    await sendOtp.click();
    const toast = await page.getByText(/Dev mode code: \d{6}/).textContent();
    await page.getByRole("textbox", { name: "6-digit code" }).fill(toast!.match(/\d{6}/)![0]);
  }
  await page.getByRole("button", { name: "Record sale" }).click();
  await expect(page.getByText(/Sale #\d+ recorded/)).toBeVisible();
  // The form is ready for the next sale.
  await expect(page.getByRole("spinbutton", { name: /^Bill amount/ })).toHaveValue("");

  await page.getByRole("link", { name: "Sales", exact: true }).click();
  await page.getByRole("searchbox", { name: "Search" }).fill(billNo);
  const row = page.locator("tbody tr").filter({ hasText: billNo });
  await expect(row).toContainText(partnerName);
  await expect(row).toContainText("₹45,000.00");

  // Cancelling takes the partner's points back.
  await row.getByRole("button", { name: /^Cancel sale/ }).click();
  await page.getByRole("textbox", { name: /^Reason/ }).fill("Wrong code applied");
  await page.getByRole("dialog").getByRole("button", { name: "Cancel sale", exact: true }).click();
  await expect(row).toContainText("Cancelled");
});

test("itemised billing is out of the menu and its pages are closed", async ({ page }) => {
  test.skip(FULL_BILLING, "Itemised billing is switched on in src/lib/features.ts");
  await signIn(page);
  await expect(page.getByRole("link", { name: "New bill" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Bills", exact: true })).toHaveCount(0);
  await page.goto("/billing");
  await expect(page.getByText("Itemised billing is switched off")).toBeVisible();
  await expect(page.getByPlaceholder("e.g. Temple necklace")).toHaveCount(0);
});
