import { request, type FullConfig } from "@playwright/test";
import { OWNER } from "./helpers";

export const OWNER_STATE = "e2e/.auth/owner.json";

/** Signs the owner in once per run and saves the session, so tests don't each hit the login rate limit. */
export default async function globalSetup(config: FullConfig) {
  const baseURL = config.projects[0].use.baseURL!;
  const ctx = await request.newContext({ baseURL });
  const res = await ctx.post("/api/auth/login", { data: OWNER });
  if (!res.ok()) throw new Error(`Owner sign-in failed: ${res.status()} ${await res.text()}`);
  await ctx.storageState({ path: OWNER_STATE });
  await ctx.dispose();
}
