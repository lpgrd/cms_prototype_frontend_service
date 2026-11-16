import { expect, test } from "@playwright/test";
import { signIn, uniqueMobile } from "./helpers";

test("adds an outdated phone with a remark and finds the customer by it", async ({ page }) => {
  await signIn(page);
  const mobile = uniqueMobile();
  const old = `67${mobile.slice(-8)}67`; // 12 digits, like an old/foreign number
  const created = await page.request.post("/api/customers", { data: { mobile, name: `Contacts ${mobile.slice(-4)}` } });
  expect(created.status()).toBe(201);
  const { id, name } = await created.json();

  await page.goto(`/customers/${id}`);
  await page.getByRole("button", { name: "Add" }).click();
  await page.getByRole("menuitem", { name: "Phone number" }).click();

  const dialog = page.getByRole("dialog", { name: "Add phone number" });
  await dialog.getByRole("textbox", { name: /^Number/ }).fill(old);
  await dialog.getByRole("combobox").click();
  await page.getByRole("option", { name: "Old", exact: true }).click();
  await dialog.getByRole("textbox", { name: /^Remark/ }).fill("outdated contact");
  await dialog.getByRole("checkbox", { name: /Outdated/ }).click();
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("outdated contact")).toBeVisible();
  await expect(page.getByText("Outdated", { exact: true })).toBeVisible();

  await page.goto("/customers");
  await page.getByPlaceholder("Name, mobile or email").fill(old.slice(2, 10));
  await expect(page.getByRole("link", { name })).toBeVisible();
});

test("removing a contact asks for confirmation first", async ({ page }) => {
  await signIn(page);
  const mobile = uniqueMobile();
  const created = await page.request.post("/api/customers", {
    data: { mobile, name: `Remove ${mobile.slice(-4)}`, contacts: [{ type: "PHONE", value: "02212345678", label: "Landline" }] },
  });
  const { id } = await created.json();
  await page.goto(`/customers/${id}`);

  await page.getByRole("button", { name: "Actions for 02212345678" }).click();
  await page.getByRole("menuitem", { name: "Remove" }).click();
  const confirm = page.getByRole("dialog", { name: "Remove this number?" });
  await confirm.getByRole("button", { name: "Keep it" }).click();
  await expect(page.getByText("Landline")).toBeVisible();

  await page.getByRole("button", { name: "Actions for 02212345678" }).click();
  await page.getByRole("menuitem", { name: "Remove" }).click();
  await confirm.getByRole("button", { name: "Remove contact" }).click();
  await expect(page.getByText("Contact removed")).toBeVisible();
  await expect(page.getByText("Landline")).toHaveCount(0);
});
