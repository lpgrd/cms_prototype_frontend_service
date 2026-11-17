import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test("superadmin shares only the sales widgets with a new role", async ({ page, browser }) => {
  const suffix = Date.now().toString().slice(-6);
  const roleName = `Accounts ${suffix}`;
  const email = `accounts-${suffix}@e2e.test`;

  await signIn(page);
  await page.getByRole("link", { name: "Roles & access" }).click();
  await page.getByRole("button", { name: "New role" }).click();
  await page.getByPlaceholder("e.g. Store Manager").fill(roleName);
  await page.getByRole("checkbox", { name: "Sales widgets (today, month, revenue chart)" }).click();
  await page.getByRole("checkbox", { name: "View and export reports" }).click();
  await page.getByRole("button", { name: "Create role" }).click();
  await expect(page.getByText(roleName)).toBeVisible();

  // Create a user with the role through the API using the superadmin's session.
  const roles = await (await page.request.get("/api/roles")).json();
  const role = roles.find((r: { name: string }) => r.name === roleName);
  const created = await page.request.post("/api/users", {
    data: { email, name: "Accounts User", password: "Passw0rd!x", roleId: role.id },
  });
  expect(created.status()).toBe(201);

  const other = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  const userPage = await other.newPage();
  await userPage.goto("/login");
  await userPage.getByLabel("Email").fill(email);
  await userPage.getByLabel(/^Password/).fill("Passw0rd!x");
  await userPage.getByRole("button", { name: "Sign in" }).click();

  await expect(userPage).toHaveURL(/\/dashboard/);
  await expect(userPage.getByText("Sales this month")).toBeVisible();
  await expect(userPage.getByText("Points owed")).toHaveCount(0);
  await expect(userPage.getByRole("link", { name: "Reports" })).toBeVisible();
  await expect(userPage.getByRole("link", { name: "Customers" })).toHaveCount(0);
  await other.close();
});
