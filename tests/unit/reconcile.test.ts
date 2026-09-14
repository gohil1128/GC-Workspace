import { describe, it, expect } from "vitest";
import { overShortCentsFor } from "@/modules/cash/reconcile";

/*
  Till reconciliation. This one function decides whether a day is declared
  balanced or short, which is the number that gets a staff member questioned.

  The identity it encodes:
    counted (cash + credit) + banked + paid out − paid in − opening − expected
*/

const base = {
  cashCents: 0, creditCents: 0, depositCents: 0,
  paidOutCents: 0, paidInCents: 0, openingCents: 0, expectedCents: 0,
};

describe("overShortCentsFor", () => {
  it("is zero when a day balances exactly", () => {
    // $300 float in, $500 cash and $200 card taken, $500 expected in sales.
    expect(overShortCentsFor({
      ...base, openingCents: 30000, cashCents: 50000, creditCents: 20000, expectedCents: 40000,
    })).toBe(0);
  });

  it("reports a shortage as negative and an overage as positive", () => {
    expect(overShortCentsFor({ ...base, cashCents: 9000, expectedCents: 10000 })).toBe(-1000);
    expect(overShortCentsFor({ ...base, cashCents: 11000, expectedCents: 10000 })).toBe(1000);
  });

  /*
    The regression this function was extracted for. Payouts and paid-ins were
    collected, stored, and left out of the arithmetic — so reimbursing someone
    who bought ice on their own card came back as a shortage of exactly that
    amount, and the only way to balance the day was not to record it.
  */
  it("treats a payout as money accounted for, not money missing", () => {
    const withoutPayout = overShortCentsFor({ ...base, cashCents: 10000, expectedCents: 10000 });
    const withPayout = overShortCentsFor({
      ...base, cashCents: 10000 - 1840, paidOutCents: 1840, expectedCents: 10000,
    });
    expect(withoutPayout).toBe(0);
    expect(withPayout).toBe(0);
  });

  it("treats a paid-in as not a surplus", () => {
    expect(overShortCentsFor({
      ...base, cashCents: 10000 + 2500, paidInCents: 2500, expectedCents: 10000,
    })).toBe(0);
  });

  it("treats banked cash as still accounted for", () => {
    expect(overShortCentsFor({
      ...base, cashCents: 10000 - 7500, depositCents: 7500, expectedCents: 10000,
    })).toBe(0);
  });

  it("does not count the opening float as takings", () => {
    expect(overShortCentsFor({
      ...base, openingCents: 30000, cashCents: 30000, expectedCents: 0,
    })).toBe(0);
  });

  it("moves one-for-one with each term", () => {
    for (const [field, sign] of [
      ["cashCents", 1], ["creditCents", 1], ["depositCents", 1], ["paidOutCents", 1],
      ["paidInCents", -1], ["openingCents", -1], ["expectedCents", -1],
    ] as const) {
      const before = overShortCentsFor(base);
      const after = overShortCentsFor({ ...base, [field]: 1000 });
      expect(after - before, `${field} moved the wrong way`).toBe(1000 * sign);
    }
  });

  it("stays in integer cents for integer input", () => {
    const r = overShortCentsFor({
      ...base, cashCents: 12345, creditCents: 6789, openingCents: 30000, expectedCents: 999,
    });
    expect(Number.isInteger(r)).toBe(true);
  });

  it("is symmetric: negating every input negates the result", () => {
    const args = {
      cashCents: 5000, creditCents: 2500, depositCents: 1000, paidOutCents: 300,
      paidInCents: 200, openingCents: 3000, expectedCents: 4000,
    };
    const negated = Object.fromEntries(Object.entries(args).map(([k, v]) => [k, -v])) as typeof args;
    expect(overShortCentsFor(negated)).toBe(-overShortCentsFor(args));
  });
});
