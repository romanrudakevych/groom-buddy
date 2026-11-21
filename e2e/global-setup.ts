import { chromium, type FullConfig } from "@playwright/test";
import { seed, type TestRole } from "../tests/support/seed";
import { authFile, signIn } from "./support";

/** Seeds the local database and saves a signed-in browser state per role. */
export default async function globalSetup(config: FullConfig) {
  await seed();
  const baseURL = config.projects[0]?.use.baseURL ?? "http://localhost:5174";
  const browser = await chromium.launch();
  for (const role of ["owner", "admin", "groomer"] as TestRole[]) {
    const page = await browser.newPage({ baseURL });
    await signIn(page, role);
    await page.context().storageState({ path: authFile(role) });
    await page.close();
  }
  await browser.close();
}
