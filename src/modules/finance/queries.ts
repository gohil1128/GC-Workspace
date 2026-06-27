import { prisma } from "@/lib/prisma";
import { safeDivide } from "@/lib/money";

export type FinanceSummary = {
  range: { from: Date; to: Date; label: string };
  netSalesCents: number;
  cogsCents: number; // Theoretical food cost from USAGE movements
  invoicePurchaseCents: number; // Actual supplier spend from invoices
  effectiveCogsCents: number; // The one used in EBITDA: USAGE if any, else invoices
  invoiceCount: number;
  untaggedInvoiceCount: number; // Invoices NOT tagged to any event (visibility hint)
  untaggedInvoiceCents: number;
  laborCostCents: number;
  operatingExpensesCents: number;
  eventFeeCents: number;
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
 * EBITDA = Net Sales − COGS − Labor − Operating Expenses
 * COGS prefers theoretical USAGE movements (recipe-driven). If none are
 * recorded — common for an operator who only enters invoices — we fall back
 * to invoice totals so EBITDA isn't artificially inflated.
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
  const label = params.eventId
    ? "event range"
    : params.eventRange
      ? "all events"
      : `YTD ${now.getFullYear()}`;
  const eventFilter = params.eventId ? { eventId: params.eventId } : {};

  // Event fees (booth / vendor / entry) — only included when:
  //   • we're scoped to a specific event → that one event's fee
  //   • we're not event-scoped → fees from events whose date range overlaps
  const eventFeeWhere = params.eventId
    ? { id: params.eventId, businessId: params.businessId }
    : {
        businessId: params.businessId,
        startDate: { lte: to },
        endDate: { gte: from },
      };

  const [business, sales, shifts, usage, expenses, feeEvents, invoices] = await Promise.all([
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
    // Expenses: when an event is active, the eventId tag is the source of
    // truth (an event-scoped expense might be paid before/after the event's
    // calendar window). Date window only applies in the unfiltered/YTD view.
    prisma.expense.findMany({
      where: params.eventId
        ? { locationId: params.locationId, eventId: params.eventId }
        : { locationId: params.locationId, businessDate: { gte: from, lte: to } },
    }),
    prisma.event.findMany({ where: eventFeeWhere, select: { feeCents: true } }),
    // Supplier invoices: same rule — when event-scoped, trust the tag and
    // ignore date (supplies are often bought before the event starts).
    prisma.invoice.findMany({
      where: params.eventId
        ? { locationId: params.locationId, eventId: params.eventId }
        : { locationId: params.locationId, invoiceDate: { gte: from, lte: to } },
      select: { totalCents: true },
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

  const invoicePurchaseCents = invoices.reduce((a, i) => a + i.totalCents, 0);
  const invoiceCount = invoices.length;

  // Always look up how many invoices have NO event tag — surfaces them on the
  // dashboard so the operator can fix the tagging instead of silently missing
  // them when switching to an event-scoped view.
  const untagged = await prisma.invoice.aggregate({
    where: { locationId: params.locationId, eventId: null },
    _count: { _all: true },
    _sum: { totalCents: true },
  });
  const untaggedInvoiceCount = untagged._count._all;
  const untaggedInvoiceCents = untagged._sum.totalCents ?? 0;
  // Prefer recipe-driven USAGE (theoretical food cost). Falls back to invoice
  // totals when there are no USAGE rows — otherwise an operator who only
  // enters invoices would see EBITDA = Net Sales − $0 = inflated.
  const effectiveCogsCents = cogsCents > 0 ? cogsCents : invoicePurchaseCents;

  const eventFeeCents = feeEvents.reduce((a, e) => a + e.feeCents, 0);
  const opexFromExpenses = expenses.reduce((a, e) => a + e.amountCents, 0);
  // Event fees count as operating expenses for EBITDA purposes.
  const operatingExpensesCents = opexFromExpenses + eventFeeCents;
  const marketingCents = expenses
    .filter((e) => e.category === "MARKETING")
    .reduce((a, e) => a + e.amountCents, 0);

  const ebitdaCents = netSalesCents - effectiveCogsCents - laborCostCents - operatingExpensesCents;
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
  if (eventFeeCents > 0) {
    byCategory.set("EVENT_FEES", (byCategory.get("EVENT_FEES") ?? 0) + eventFeeCents);
  }
  if (invoicePurchaseCents > 0) {
    byCategory.set("SUPPLIER_INVOICES", invoicePurchaseCents);
  }
  const expenseByCategory = Array.from(byCategory.entries())
    .map(([category, amountCents]) => ({ category, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents);

  return {
    range: { from, to, label },
    netSalesCents,
    cogsCents,
    invoicePurchaseCents,
    effectiveCogsCents,
    invoiceCount,
    untaggedInvoiceCount,
    untaggedInvoiceCents,
    laborCostCents,
    operatingExpensesCents,
    eventFeeCents,
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
