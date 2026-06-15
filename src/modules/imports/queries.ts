import { prisma } from "@/lib/prisma";

export type ImportedDay = {
  iso: string; // businessDate.toISOString()
  businessDate: Date;
  netSalesCents: number;
  taxCents: number;
  guestCount: number;
  tipsCents: number;
  source: string;
  itemCount: number; // distinct SalesItem rows for that day
  itemQty: number;
  event: { id: string; name: string; color: string | null } | null;
};

// One row per imported sales day at this location, with the per-item rollup
// count joined in so the operator can see "this day has 8 items behind it."
export async function listImportedDays(locationId: string): Promise<ImportedDay[]> {
  const [sales, items] = await Promise.all([
    prisma.dailySales.findMany({
      where: { locationId },
      include: { event: { select: { id: true, name: true, color: true } } },
      orderBy: { businessDate: "desc" },
    }),
    prisma.salesItem.findMany({
      where: { locationId },
      select: { businessDate: true, qty: true },
    }),
  ]);

  const itemAgg = new Map<string, { count: number; qty: number }>();
  for (const it of items) {
    const key = it.businessDate.toISOString();
    const cur = itemAgg.get(key) ?? { count: 0, qty: 0 };
    cur.count += 1;
    cur.qty += it.qty;
    itemAgg.set(key, cur);
  }

  return sales.map((s) => {
    const iso = s.businessDate.toISOString();
    const agg = itemAgg.get(iso) ?? { count: 0, qty: 0 };
    return {
      iso,
      businessDate: s.businessDate,
      netSalesCents: s.netSalesCents,
      taxCents: s.taxCents,
      guestCount: s.guestCount,
      tipsCents: s.tipsCents,
      source: s.source,
      itemCount: agg.count,
      itemQty: agg.qty,
      event: s.event,
    };
  });
}

// Days that only have per-item rows (SalesItem) but no DailySales — edge case,
// but surface them so nothing is orphaned/undeletable.
export async function listOrphanItemDays(locationId: string) {
  const [items, sales] = await Promise.all([
    prisma.salesItem.findMany({
      where: { locationId },
      select: { businessDate: true },
    }),
    prisma.dailySales.findMany({
      where: { locationId },
      select: { businessDate: true },
    }),
  ]);
  const salesDays = new Set(sales.map((s) => s.businessDate.toISOString()));
  const orphan = new Set<string>();
  for (const it of items) {
    const iso = it.businessDate.toISOString();
    if (!salesDays.has(iso)) orphan.add(iso);
  }
  return [...orphan];
}
