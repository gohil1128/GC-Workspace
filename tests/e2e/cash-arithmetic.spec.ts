import { test, expect } from "@playwright/test";

/*
  The cash close is the screen this product exists for, and its arithmetic is
  the thing a customer will trust with real money. These walk the flows that
  were each verified by hand against SQL when they were built.
*/

const money = (s: string) => Number(s.replace(/[^0-9.\-]/g, ""));

async function openPayoutsTab(page: import("@playwright/test").Page, date: string) {
  await page.goto(`/cash/new?date=${date}`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("tab", { name: /Payouts/ }).click();
  await page.waitForTimeout(400);
}

/*
  The derived paid-out total, read off the Overview tab's read-only box.

  That box is the right anchor because it renders even at zero — the balancing
  panel's "Paid out" row is conditional on there being one, so a test that read
  it could not tell "no payouts" from "element missing".
*/
async function paidOutTotal(page: import("@playwright/test").Page): Promise<number> {
  await page.getByRole("tab", { name: "Overview" }).click();
  await page.waitForTimeout(300);
  return money(await page.getByTestId("paid-out-total").innerText());
}

test.describe("payouts move the till arithmetic", () => {
  const DATE = "2026-09-03";
  // Unique per run, and cleaned up either side. A previous failed run left a
  // payout behind and the next run matched two rows by the same name.
  const TAG = `e2e-${Date.now()}`;

  /** Remove any payout this suite created, however a previous run ended. */
  async function clearOurPayouts(page: import("@playwright/test").Page) {
    await page.getByRole("tab", { name: /Payouts/ }).click();
    await page.waitForTimeout(300);
    for (let i = 0; i < 10; i++) {
      const btn = page.getByRole("button", { name: /^Edit payout: e2e-/ }).first();
      if ((await btn.count()) === 0) break;
      const row = page.locator("tr").filter({ has: btn });
      await row.getByRole("button", { name: /Delete payout/ }).click();
      await page.waitForTimeout(1800);
    }
  }

  test("adding, editing and removing a payout each move paid-out by the exact amount", async ({ page }) => {
    await openPayoutsTab(page, DATE);
    await clearOurPayouts(page);

    const before = await paidOutTotal(page);

    // paidOutTotal() reads the Overview tab, so come back before touching the form.
    await page.getByRole("tab", { name: /Payouts/ }).click();
    await page.waitForTimeout(300);

    // Add $18.40
    await page.fill("#po-amt", "18.40");
    await page.fill("#po-reason", TAG);
    await page.getByRole("button", { name: "Add payout" }).click();
    await page.waitForTimeout(2500);
    expect(await paidOutTotal(page), "adding a payout should raise paid-out by its amount")
      .toBeCloseTo(before + 18.4, 2);

    // Correct it to $25.00 -- the delta, not a replacement.
    await page.getByRole("tab", { name: /Payouts/ }).click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: `Edit payout: ${TAG}` }).click();
    await page.waitForTimeout(600);
    await page.fill("#po-edit-amt", "25.00");
    await page.getByRole("button", { name: /Save changes|Saving/ }).click();
    await page.waitForTimeout(2500);
    expect(await paidOutTotal(page), "editing should move paid-out by the difference")
      .toBeCloseTo(before + 25, 2);

    // Cancel must change nothing.
    await page.getByRole("tab", { name: /Payouts/ }).click();
    await page.waitForTimeout(300);
    await page.getByRole("button", { name: `Edit payout: ${TAG}` }).click();
    await page.waitForTimeout(500);
    await page.fill("#po-edit-amt", "999");
    await page.getByRole("button", { name: "Cancel" }).click();
    await page.waitForTimeout(800);
    expect(await paidOutTotal(page), "cancelling an edit changed the total").toBeCloseTo(before + 25, 2);

    // Remove it and land back where we started.
    await page.getByRole("tab", { name: /Payouts/ }).click();
    await page.waitForTimeout(300);
    const row = page.locator("tr", { hasText: TAG });
    await row.getByRole("button", { name: /Delete payout/ }).click();
    await page.waitForTimeout(2500);
    expect(await paidOutTotal(page), "deleting should unwind the payout exactly").toBeCloseTo(before, 2);
  });

  test("a payout requires a reason, so cash cannot leave the till unexplained", async ({ page }) => {
    await openPayoutsTab(page, DATE);
    await page.fill("#po-amt", "5.00");
    await page.fill("#po-reason", "   ");
    await page.getByRole("button", { name: "Add payout" }).click();
    await page.waitForTimeout(900);
    await expect(page.locator("body")).toContainText(/Say what the money was for/);
  });
});

test.describe("the business day follows the business", () => {
  test("a new close defaults to today where the business trades", async ({ page }) => {
    await page.goto("/settings");
    await page.waitForLoadState("networkidle");
    const tz = await page.locator("#biz-tz").inputValue();

    await page.goto("/cash/new");
    await page.waitForLoadState("networkidle");
    const shown = (await page.locator("body").innerText()).match(/·\s+(\w{3} \d+, \d{4})/);
    expect(shown, "the new-close page should name its date").not.toBeNull();

    const expected = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, month: "short", day: "numeric", year: "numeric",
    }).format(new Date());
    // Was the SERVER's UTC date, so an evening market filed under tomorrow.
    expect(shown![1]).toBe(expected);
  });
});
