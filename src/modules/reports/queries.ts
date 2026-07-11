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
      iso: key,
      hasSales: !!sale,
      netSalesCents: net,
      tipsCents: sale?.tipsCents ?? 0,
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
  // Invoices are the operator's actual bills; POs cover anything ordered but
  // not yet invoiced. Both count toward supplier spend.
  const [pos, invoices] = await Promise.all([
    prisma.purchaseOrder.findMany({
      where: { locationId, orderedAt: { gte: from, lte: to } },
      include: { supplier: { select: { name: true } } },
    }),
    prisma.invoice.findMany({
      where: { locationId, invoiceDate: { gte: from, lte: to } },
      select: { supplierId: true, totalCents: true, supplier: { select: { name: true } } },
    }),
  ]);
  const bySupplier = new Map<string, { name: string; orderCount: number; spendCents: number }>();
  const bump = (supplierId: string, name: string, cents: number) => {
    if (!bySupplier.has(supplierId)) bySupplier.set(supplierId, { name, orderCount: 0, spendCents: 0 });
    const e = bySupplier.get(supplierId)!;
    e.orderCount += 1;
    e.spendCents += cents;
  };
  for (const i of invoices) bump(i.supplierId, i.supplier.name, i.totalCents);
  for (const p of pos) bump(p.supplierId, p.supplier.name, p.totalCents);
  return Array.from(bySupplier.values()).sort((a, b) => b.spendCents - a.spendCents);
}

// Supplier spend matrix: how much has gone to each supplier, split by event
// tag and overall (all-time, invoice-based). Rows = suppliers, columns = the
// events that actually carry spend + an "untagged" bucket + a total.
export async function supplierSpendByEvent(locationId: string) {
  const invoices = await prisma.invoice.findMany({
    where: { locationId },
    select: {
      supplierId: true,
      totalCents: true,
      supplier: { select: { name: true } },
      event: { select: { id: true, name: true, color: true, startDate: true } },
    },
  });

  // Events that appear on at least one invoice, oldest first
  const eventMap = new Map<string, { id: string; name: string; color: string | null; startDate: Date }>();
  for (const inv of invoices) {
    if (inv.event && !eventMap.has(inv.event.id)) eventMap.set(inv.event.id, inv.event);
  }
  const events = [...eventMap.values()].sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

  type Row = { supplierId: string; name: string; byEvent: Record<string, number>; untaggedCents: number; totalCents: number };
  const rows = new Map<string, Row>();
  let grandTotal = 0;
  let grandUntagged = 0;
  const eventTotals: Record<string, number> = {};

  for (const inv of invoices) {
    let row = rows.get(inv.supplierId);
    if (!row) {
      row = { supplierId: inv.supplierId, name: inv.supplier.name, byEvent: {}, untaggedCents: 0, totalCents: 0 };
      rows.set(inv.supplierId, row);
    }
    row.totalCents += inv.totalCents;
    grandTotal += inv.totalCents;
    if (inv.event) {
      row.byEvent[inv.event.id] = (row.byEvent[inv.event.id] ?? 0) + inv.totalCents;
      eventTotals[inv.event.id] = (eventTotals[inv.event.id] ?? 0) + inv.totalCents;
    } else {
      row.untaggedCents += inv.totalCents;
      grandUntagged += inv.totalCents;
    }
  }

  return {
    events: events.map((e) => ({ id: e.id, name: e.name, color: e.color })),
    suppliers: [...rows.values()].sort((a, b) => b.totalCents - a.totalCents),
    eventTotals,
    grandUntagged,
    grandTotal,
    hasUntagged: grandUntagged > 0,
  };
}
