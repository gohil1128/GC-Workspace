import { type Page, type APIRequestContext, expect } from "@playwright/test";

/*
  Accounts come from the environment so the suite carries no credentials.
  Set these to seeded users before running; the E2E job in CI seeds them.
*/
export const ACCOUNTS = {
  owner: {
    email: process.env.E2E_OWNER_EMAIL ?? "owner@demo.test",
    password: process.env.E2E_OWNER_PASSWORD ?? "demo1234",
  },
  staff: {
    email: process.env.E2E_STAFF_EMAIL ?? "staff@test.local",
    password: process.env.E2E_STAFF_PASSWORD ?? "StaffTest1234",
  },
};

export async function signIn(page: Page, who: keyof typeof ACCOUNTS) {
  const { email, password } = ACCOUNTS[who];
  await page.goto("/login");
  await page.fill("input[type=email]", email);
  await page.fill("input[type=password]", password);
  await page.click("button[type=submit]");
  // STAFF land on /cash, everyone else on /dashboard.
  await page.waitForURL(/\/(dashboard|cash)/, { timeout: 30_000 });
}

/** The visible text of the whole page, including portalled toasts. */
export async function bodyText(page: Page): Promise<string> {
  return page.locator("body").innerText();
}

/**
 * Assert a page is NOT reachable by this role. The app redirects rather than
 * 404ing, so the check is on where you land, not on a status code.
 */
export async function expectRedirectedAwayFrom(page: Page, path: string) {
  await page.goto(path);
  await page.waitForLoadState("networkidle");
  expect(page.url(), `${path} should not be reachable`).not.toContain(path);
}

export async function statusOf(request: APIRequestContext, path: string): Promise<number> {
  const r = await request.get(path);
  return r.status();
}
