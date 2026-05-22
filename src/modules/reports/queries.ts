import { prisma } from "@/lib/prisma";
import { lastNDays, dayRange, fmtDate, startOfDay } from "@/lib/date";
import { safeDivide } from "@/lib/money";

export async function dailySummary(locationId: string, days: number) {
  const { from, to } = lastNDays(days);
  const [sales, shifts, closes, usage] = await Promise.all([
    prisma.dailySales.findMany({ where: { locationId, businessDate: { gte: from, lte: to } }, orderBy: { businessDate: "asc" } }),
    prisma.shift.findMany({ where: { locationId, start: { gte: from, lte: to } }, include: { employee: true, timeEntry: true } }),
    prisma.cashClose.findMany({ where: { locationId, businessDate: { gte: from, lte: to } } }),
    prisma.inventoryMovement.findMany({
      where: { locationId, occurredAt: { gte: from, lte: to }, type: "USAGE" },
      include: { ingredient: true },
    }),
  ]);

  const days_ = dayRange(from, to);
  return days_.map((d) => {
    const key = startOfDay(d).toISOString();
    const sale = sales.find((s) => startOfDay(s.businessDate).toISOString() === key);
    const close = closes.find((c) => startOfDay(c.businessDate).toISOString() === key);
    const dayShifts = shifts.filter((s) => startOfDay(s.start).toISOString() === key);
    const dayUsage = usage.filter((m) => startOfDay(m.occurredAt).toISOString() === key);
    const laborCents = dayShifts.reduce((a, s) => a + Math.round(((s.timeEntry?.actualMinutes ?? s.scheduledMinutes) / 60) * s.employee.hourlyRateCents), 0);
    const foodCents = dayUsage.reduce((a, m) => a + Math.round(Math.abs(m.qty) * m.ingredient.avgCostCents), 0);
    const net = sale?.netSalesCents ?? 0;
    return {
      date: fmtDate(d),
      netSalesCents: net,
      guests: sale?.guestCount ?? 0,
      foodCostCents: foodCents,
      laborCostCents: laborCents,
      foodPct: safeDivide(foodCents, net) * 100,
      laborPct: safeDivide(laborCents, net) * 100,
      cashOverShortCents: close?.overShortCents ?? 0,
    };
  });
}

export async function weeklyTrend(locationId: string, weeks: number) {
  const days = weeks * 7;
  const summary = await dailySummary(locationId, days);
  // bucket by week index from end
  const buckets: Record<number, typeof summary> = {};
  for (let i = 0; i < summary.length; i++) {
    const idx = Math.floor(i / 7);
    buckets[idx] = buckets[idx] ?? [];
    buckets[idx].push(summary[i]);
  }
  return Object.entries(buckets).map(([k, rows]) => {
    const sales = rows.reduce((a, r) => a + r.netSalesCents, 0);
    const food = rows.reduce((a, r) => a + r.foodCostCents, 0);
    const labor = rows.reduce((a, r) => a + r.laborCostCents, 0);
    return {
      label: `Week ${Number(k) + 1}`,
      from: rows[0].date,
      to: rows[rows.length - 1].date,
      netSalesCents: sales,
      foodCostCents: food,
      laborCostCents: labor,
      foodPct: safeDivide(food, sales) * 100,
      laborPct: safeDivide(labor, sales) * 100,
    };
  });
}

export async function purchaseSpendByPeriod(locationId: string, days: number) {
  const { from, to } = lastNDays(days);
  const pos = await prisma.purchaseOrder.findMany({
    where: { locationId, orderedAt: { gte: from, lte: to } },
    include: { supplier: true },
  });
  const bySupplier = new Map<string, { name: string; orderCount: number; spendCents: number }>();
  for (const p of pos) {
    if (!bySupplier.has(p.supplierId)) bySupplier.set(p.supplierId, { name: p.supplier.name, orderCount: 0, spendCents: 0 });
    const e = bySupplier.get(p.supplierId)!;
    e.orderCount += 1;
    e.spendCents += p.totalCents;
  }
  return Array.from(bySupplier.values()).sort((a, b) => b.spendCents - a.spendCents);
}
