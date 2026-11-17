import { expect, test } from "@playwright/test";
import { signIn, uniqueMobile } from "./helpers";

test("partners sign in on their own page and staff on theirs", async ({ page, browser }) => {
  // The owner creates a partner with a login.
  await signIn(page);
  const mobile = uniqueMobile();
  const partner = await page.request.post("/api/influencers", { data: { name: `Partner ${mobile.slice(-4)}`, mobile } });
  expect(partner.status()).toBe(201);
  const creds = { email: `partner-${mobile}@e2e.test`, password: "Partner-Passw0rd!" };
  const login = await page.request.post(`/api/influencers/${(await partner.json()).id}/login`, { data: creds });
  expect(login.status()).toBe(201);

  const visitor = await (await browser.newContext({ storageState: { cookies: [], origins: [] } })).newPage();
  // Next.js keeps the previous page mounted but hidden after client navigation, so fields are matched only when visible.

  // Signed out, the partner area leads to the partner sign-in.
  await visitor.goto("/partner");
  await expect(visitor).toHaveURL(/\/partner\/login/);
  await expect(visitor.getByRole("heading", { name: "Partner sign-in" })).toBeVisible();

  // A partner on the staff page is pointed to their own page, without being signed in.
  await visitor.goto("/login");
  await expect(visitor.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await visitor.getByLabel("Email").filter({ visible: true }).fill(creds.email);
  await visitor
    .getByLabel(/^Password/)
    .filter({ visible: true })
    .fill(creds.password);
  await visitor.getByRole("button", { name: "Sign in" }).click();
  await expect(visitor.getByText("Partners sign in on the partner page")).toBeVisible();
  await visitor.getByRole("link", { name: "Go to the partner sign-in" }).click();
  await expect(visitor).toHaveURL(/\/partner\/login$/);

  await visitor.getByLabel("Email").filter({ visible: true }).fill(creds.email);
  await visitor
    .getByLabel(/^Password/)
    .filter({ visible: true })
    .fill(creds.password);
  await visitor.getByRole("button", { name: "Sign in" }).click();
  await expect(visitor).toHaveURL(/\/partner$/);

  // Signing out returns a partner to the partner sign-in.
  await visitor.getByRole("button", { name: "Sign out" }).click();
  await expect(visitor).toHaveURL(/\/partner\/login$/);
});
