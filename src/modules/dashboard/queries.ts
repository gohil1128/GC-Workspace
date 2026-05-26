import { prisma } from "@/lib/prisma";
import { lastNDays, businessDay, fmtDate } from "@/lib/date";
import { safeDivide } from "@/lib/money";

export type DashboardData = Awaited<ReturnType<typeof getDashboard>>;

export async function getDashboard(params: {
  businessId: string;
  locationId: string;
  days?: number;
  eventId?: string | null;
  eventRange?: { start: Date; end: Date } | null;
}) {
  const days = params.days ?? 14;
  const baseRange = lastNDays(days);
  const { from, to } = params.eventRange
    ? { from: params.eventRange.start, to: params.eventRange.end }
    : baseRange;

  const eventFilter = params.eventId ? { eventId: params.eventId } : {};

  const [sales, shifts, cashCloses, recentVariance, lowStock, openPos, ingredientsCount, business] = await Promise.all([
    prisma.dailySales.findMany({
      where: { locationId: params.locationId, businessDate: { gte: from, lte: to }, ...eventFilter },
      orderBy: { businessDate: "asc" },
    }),
    prisma.shift.findMany({
      where: { locationId: params.locationId, start: { gte: from, lte: to } },
      include: { employee: true, timeEntry: true },
    }),
    prisma.cashClose.findMany({
      where: { locationId: params.locationId, businessDate: { gte: from, lte: to }, ...eventFilter },
      orderBy: { businessDate: "desc" },
    }),
    prisma.inventoryCount.findFirst({
      where: { locationId: params.locationId },
      orderBy: { countedAt: "desc" },
      include: { lines: true },
    }),
    prisma.ingredient.findMany({
      where: { businessId: params.businessId },
      orderBy: { name: "asc" },
    }),
    prisma.purchaseOrder.findMany({
      where: { locationId: params.locationId, status: { in: ["DRAFT", "SENT"] } },
      include: { supplier: true, items: true },
      orderBy: { expectedAt: "asc" },
      take: 5,
    }),
    prisma.ingredient.count({ where: { businessId: params.businessId } }),
    prisma.business.findUnique({ where: { id: params.businessId } }),
  ]);

  const netSalesCents = sales.reduce((a, s) => a + s.netSalesCents, 0);

  // labor cost from completed time entries, fall back to scheduled minutes * rate
  const laborCostCents = shifts.reduce((acc, s) => {
    const minutes = s.timeEntry?.actualMinutes ?? s.scheduledMinutes;
    const cents = Math.round((minutes / 60) * s.employee.hourlyRateCents);
    return acc + cents;
  }, 0);

  // food cost (theoretical): sum of USAGE movements in window valued at avgCost
  const usage = await prisma.inventoryMovement.findMany({
    where: { locationId: params.locationId, occurredAt: { gte: from, lte: to }, type: "USAGE" },
    include: { ingredient: { select: { avgCostCents: true } } },
  });
  const foodCostCents = usage.reduce((acc, m) => acc + Math.round(Math.abs(m.qty) * m.ingredient.avgCostCents), 0);

  // inventory variance %: latest count's varianceCost / value of period sales
  const varianceCostCents = recentVariance ? recentVariance.lines.reduce((a, l) => a + Math.abs(l.varianceCostCents), 0) : 0;
  const varianceQtyAbsSum = recentVariance ? recentVariance.lines.reduce((a, l) => a + Math.abs(l.varianceQty), 0) : 0;
  const varianceTheoreticalSum = recentVariance ? recentVariance.lines.reduce((a, l) => a + Math.abs(l.theoreticalQty), 0) : 0;
  const inventoryVariancePct = safeDivide(varianceQtyAbsSum, varianceTheoreticalSum || 1) * 100;

  // cash over/short total
  const cashOverShortCents = cashCloses.reduce((a, c) => a + c.overShortCents, 0);

  // low stock items
  const lowStockItems = lowStock
    .filter((i) => i.onHand <= i.reorderPoint && i.reorderPoint > 0)
    .map((i) => ({ id: i.id, name: i.name, onHand: i.onHand, reorderPoint: i.reorderPoint, unit: i.unit }));

  // missing close: any business day in last 7 days w/o a close
  const last7 = lastNDays(7);
  const closesByDay = new Set(cashCloses.map((c) => businessDay(c.businessDate).toISOString()));
  const expectedDays: string[] = [];
  for (let d = new Date(last7.from); d <= last7.to; d.setDate(d.getDate() + 1)) {
    expectedDays.push(businessDay(d).toISOString());
  }
  const missingCloseDays = expectedDays.filter((d) => !closesByDay.has(d));

  // trends
  const trendSales = sales.map((s) => ({ x: fmtDate(s.businessDate, "MMM d"), y: s.netSalesCents / 100 }));
  const trendLaborByDay = bucketLaborByDay(shifts, from, to);

  const foodPct = safeDivide(foodCostCents, netSalesCents) * 100;
  const laborPct = safeDivide(laborCostCents, netSalesCents) * 100;
  const primePct = foodPct + laborPct;

  const foodTarget = business?.foodTargetPct ?? 32;
  const laborTarget = business?.laborTargetPct ?? 30;

  return {
    period: { from, to, days },
    kpis: {
      netSalesCents,
      foodCostCents,
      laborCostCents,
      foodPct,
      laborPct,
      primePct,
      inventoryVariancePct,
      varianceCostCents,
      cashOverShortCents,
      foodTarget,
      laborTarget,
    },
    trends: {
      sales: trendSales,
      labor: trendLaborByDay,
    },
    lowStockItems,
    openPos,
    missingCloseDays,
    ingredientsCount,
    lastCountAt: recentVariance?.countedAt ?? null,
  };
}

function bucketLaborByDay(
  shifts: { start: Date; scheduledMinutes: number; timeEntry: { actualMinutes: number } | null; employee: { hourlyRateCents: number } }[],
  from: Date,
  to: Date
) {
  const out: Record<string, number> = {};
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    out[fmtDate(d, "MMM d")] = 0;
  }
  for (const s of shifts) {
    const key = fmtDate(s.start, "MMM d");
    const minutes = s.timeEntry?.actualMinutes ?? s.scheduledMinutes;
    out[key] = (out[key] ?? 0) + (minutes / 60) * (s.employee.hourlyRateCents / 100);
  }
  return Object.entries(out).map(([x, y]) => ({ x, y: Math.round(y * 100) / 100 }));
}
