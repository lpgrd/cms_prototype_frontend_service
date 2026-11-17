import { expect, test } from "@playwright/test";
import { FULL_BILLING } from "../src/lib/features";
import { signIn, uniqueMobile } from "./helpers";

test("list filters live in the URL, survive a reload and clear in one click", async ({ page }) => {
  await signIn(page);
  await page.goto(FULL_BILLING ? "/transactions" : "/sales");

  await page.getByRole("combobox", { name: "Status" }).click();
  await page.getByRole("option", { name: "Cancelled" }).click();
  await expect(page).toHaveURL(/status=CANCELLED/);

  await page.reload();
  await expect(page.getByRole("combobox", { name: "Status" })).toHaveText(/Cancelled/);
  for (const badge of await page
    .locator("tbody")
    .getByText(/^(Completed|Cancelled)$/)
    .all()) {
    await expect(badge).toHaveText("Cancelled");
  }

  await page.getByRole("button", { name: "Clear filters" }).first().click();
  await expect(page).not.toHaveURL(/status=/);
  await expect(page.getByRole("combobox", { name: "Status" })).toHaveText(/All statuses/);
});

test("pages through results, changes page size and sorts by a column", async ({ page }) => {
  await signIn(page);
  const tag = `Pg${Date.now().toString(36)}`;
  for (let i = 0; i < 12; i++) {
    const res = await page.request.post("/api/customers", {
      data: { mobile: uniqueMobile(), name: `${tag} ${String.fromCharCode(65 + i)}` },
    });
    expect(res.status()).toBe(201);
  }

  await page.goto(`/customers?q=${tag}`);
  await expect(page.getByRole("searchbox", { name: "Search" })).toHaveValue(tag);
  await expect(page.getByText("12 customers")).toBeVisible();

  await page.getByRole("combobox", { name: "Rows per page" }).click();
  await page.getByRole("option", { name: "10", exact: true }).click();
  await expect(page).toHaveURL(/limit=10/);
  await expect(page.getByText(/Showing 1–10 of 12 customers/)).toBeVisible();
  await page.getByRole("button", { name: "Page 2" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page.getByText(/Showing 11–12 of 12 customers/)).toBeVisible();

  // Sorting goes back to page 1 and reorders by name.
  const header = page.getByRole("columnheader", { name: "Customer" });
  await header.getByRole("button").click();
  await expect(header).toHaveAttribute("aria-sort", "ascending");
  await expect(page).not.toHaveURL(/page=2/);
  await expect(page.locator("tbody tr").first()).toContainText(`${tag} A`);
  await header.getByRole("button").click();
  await expect(header).toHaveAttribute("aria-sort", "descending");
  await expect(page.locator("tbody tr").first()).toContainText(`${tag} L`);
});

test("a filter with nothing to show offers to clear it", async ({ page }) => {
  await signIn(page);
  // Old /influencers links still work: they redirect to /partners and keep the query.
  await page.goto("/influencers?q=zz-no-such-partner");
  await expect(page).toHaveURL(/\/partners\?q=zz-no-such-partner/);
  await expect(page.getByText("No partners match these filters")).toBeVisible();
  await page.getByRole("button", { name: "Clear filters" }).last().click();
  await expect(page).not.toHaveURL(/q=/);
});
