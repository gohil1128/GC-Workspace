import { prisma } from "@/lib/prisma";
import { safeDivide } from "@/lib/money";

export type FinanceSummary = {
  range: { from: Date; to: Date; label: string };
  netSalesCents: number;
  cogsCents: number;
  laborCostCents: number;
  operatingExpensesCents: number;
  marketingCents: number;
  ebitdaCents: number;
  ebitdaMarginPct: number;
  valuationCents: number;
  valuationBasis: "ebitda" | "revenue" | "none";
  guestCount: number;
  marketingPerGuestCents: number; // CAC proxy
  expenseByCategory: { category: string; amountCents: number }[];
};

/**
 * Compute the year-to-date / event-scoped financial summary used by the
 * dashboard's financial tiles.
 *
 * EBITDA = Net Sales − COGS (food) − Labor − Operating Expenses
 * Valuation = EBITDA × ebitdaMultiplier when EBITDA > 0
 *             else Net Sales × revenueMultiplier
 * CAC proxy = Marketing spend / Guest count (cost per acquired guest visit)
 */
export async function getFinanceSummary(params: {
  businessId: string;
  locationId: string;
  eventId?: string | null;
  eventRange?: { start: Date; end: Date } | null;
}): Promise<FinanceSummary> {
  const now = new Date();
  // YTD by default; event range overrides if provided
  const ytdStart = new Date(now.getFullYear(), 0, 1);
  const from = params.eventRange?.start ?? ytdStart;
  const to = params.eventRange?.end ?? now;
  const label = params.eventRange ? "event range" : `YTD ${now.getFullYear()}`;
  const eventFilter = params.eventId ? { eventId: params.eventId } : {};

  const [business, sales, shifts, usage, expenses] = await Promise.all([
    prisma.business.findUnique({
      where: { id: params.businessId },
      select: { ebitdaMultiplier: true, revenueMultiplier: true },
    }),
    prisma.dailySales.findMany({
      where: { locationId: params.locationId, businessDate: { gte: from, lte: to }, ...eventFilter },
    }),
    prisma.shift.findMany({
      where: { locationId: params.locationId, start: { gte: from, lte: to } },
      include: { employee: true, timeEntry: true },
    }),
    prisma.inventoryMovement.findMany({
      where: { locationId: params.locationId, occurredAt: { gte: from, lte: to }, type: "USAGE" },
      include: { ingredient: { select: { avgCostCents: true } } },
    }),
    prisma.expense.findMany({
      where: { locationId: params.locationId, businessDate: { gte: from, lte: to }, ...eventFilter },
    }),
  ]);

  const netSalesCents = sales.reduce((a, s) => a + s.netSalesCents, 0);
  const guestCount = sales.reduce((a, s) => a + s.guestCount, 0);

  const cogsCents = usage.reduce(
    (a, m) => a + Math.round(Math.abs(m.qty) * m.ingredient.avgCostCents),
    0
  );

  const laborCostCents = shifts.reduce((a, s) => {
    const minutes = s.timeEntry?.actualMinutes ?? s.scheduledMinutes;
    return a + Math.round((minutes / 60) * s.employee.hourlyRateCents);
  }, 0);

  const operatingExpensesCents = expenses.reduce((a, e) => a + e.amountCents, 0);
  const marketingCents = expenses
    .filter((e) => e.category === "MARKETING")
    .reduce((a, e) => a + e.amountCents, 0);

  const ebitdaCents = netSalesCents - cogsCents - laborCostCents - operatingExpensesCents;
  const ebitdaMarginPct = safeDivide(ebitdaCents, netSalesCents) * 100;

  const ebitdaMult = business?.ebitdaMultiplier ?? 4;
  const revenueMult = business?.revenueMultiplier ?? 1.5;

  let valuationCents = 0;
  let valuationBasis: "ebitda" | "revenue" | "none" = "none";
  if (ebitdaCents > 0) {
    valuationCents = Math.round(ebitdaCents * ebitdaMult);
    valuationBasis = "ebitda";
  } else if (netSalesCents > 0) {
    valuationCents = Math.round(netSalesCents * revenueMult);
    valuationBasis = "revenue";
  }

  const marketingPerGuestCents = guestCount > 0 ? Math.round(marketingCents / guestCount) : 0;

  // Group expenses by category for a small breakdown
  const byCategory = new Map<string, number>();
  for (const e of expenses) {
    byCategory.set(e.category, (byCategory.get(e.category) ?? 0) + e.amountCents);
  }
  const expenseByCategory = Array.from(byCategory.entries())
    .map(([category, amountCents]) => ({ category, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);

  return {
    range: { from, to, label },
    netSalesCents,
    cogsCents,
    laborCostCents,
    operatingExpensesCents,
    marketingCents,
    ebitdaCents,
    ebitdaMarginPct,
    valuationCents,
    valuationBasis,
    guestCount,
    marketingPerGuestCents,
    expenseByCategory,
  };
}
