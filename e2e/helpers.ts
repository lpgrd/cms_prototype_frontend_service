import { expect, type Page } from "@playwright/test";

export const OWNER = {
  email: process.env.SEED_OWNER_EMAIL ?? process.env.E2E_OWNER_EMAIL ?? "owner@example.com",
  password: process.env.SEED_OWNER_PASSWORD ?? process.env.E2E_OWNER_PASSWORD ?? "ChangeMe@123",
};

/** Opens the portal with the owner's saved session (see global-setup). */
export async function signIn(page: Page) {
  await page.goto("/dashboard");
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Signs in through the login form — only for tests that exercise sign-in itself. */
export async function signInWithForm(page: Page, creds = OWNER) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel(/^Password/).fill(creds.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

/** A mobile number that is unique per run, so tests don't collide with earlier data. */
export const uniqueMobile = () => `9${String(Date.now()).slice(-9)}`;
