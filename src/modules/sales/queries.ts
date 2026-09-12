import { prisma } from "@/lib/prisma";
import { normalizeCategory } from "@/modules/items/categories";

/*
  Item sales, rolled up two ways over one date window.

  The Overview already computes a version of this, but only ever shows the top
  twelve items inside a rail card — which is fine for "what sold today" and
  useless for "how much of the season was cold chai". This returns the whole
  list plus the category totals, and is the only place that decides how an
  item's raw Square category maps onto a real menu category.
*/

export type SalesSort = "revenue" | "qty" | "name";

export type ItemRow = {
  itemName: string;
  category: string;
  qty: number;
  netSalesCents: number;
  taxCents: number;
  txCount: number;
  sharePct: number;
};

export type CategoryRow = {
  category: string;
  qty: number;
  netSalesCents: number;
  txCount: number;
  itemCount: number;
  sharePct: number;
};

export async function getSalesBreakdown(params: {
  locationId: string;
  from: Date;
  to: Date;
  eventId?: string | null;
  category?: string | null;
  sort?: SalesSort;
}) {
  const rows = await prisma.salesItem.findMany({
    where: {
      locationId: params.locationId,
      businessDate: { gte: params.from, lte: params.to },
      ...(params.eventId ? { eventId: params.eventId } : {}),
    },
    select: {
      itemName: true,
      category: true,
      qty: true,
      netSalesCents: true,
      taxCents: true,
      txCount: true,
      businessDate: true,
    },
  });

  // One row per item name; the same item appears once per business date.
  const byItem = new Map<string, ItemRow & { days: Set<number> }>();
  for (const r of rows) {
    const category = normalizeCategory(r.category, r.itemName);
    const existing = byItem.get(r.itemName);
    if (existing) {
      existing.qty += r.qty;
      existing.netSalesCents += r.netSalesCents;
      existing.taxCents += r.taxCents;
      existing.txCount += r.txCount;
      existing.days.add(r.businessDate.getTime());
    } else {
      byItem.set(r.itemName, {
        itemName: r.itemName,
        category,
        qty: r.qty,
        netSalesCents: r.netSalesCents,
        taxCents: r.taxCents,
        txCount: r.txCount,
        sharePct: 0,
        days: new Set([r.businessDate.getTime()]),
      });
    }
  }

  const all = [...byItem.values()];
  // Share is always of the whole window, never of the filtered subset —
  // otherwise filtering to one category would show every item in it at a
  // share of 100% between them, which reads as a much bigger number than it is.
  const totalCents = all.reduce((a, i) => a + i.netSalesCents, 0);
  const totalQty = all.reduce((a, i) => a + i.qty, 0);
  const totalTx = all.reduce((a, i) => a + i.txCount, 0);

  const catMap = new Map<string, CategoryRow>();
  for (const i of all) {
    const ex = catMap.get(i.category);
    if (ex) {
      ex.qty += i.qty;
      ex.netSalesCents += i.netSalesCents;
      ex.txCount += i.txCount;
      ex.itemCount += 1;
    } else {
      catMap.set(i.category, {
        category: i.category,
        qty: i.qty,
        netSalesCents: i.netSalesCents,
        txCount: i.txCount,
        itemCount: 1,
        sharePct: 0,
      });
    }
  }

  const byCategory = [...catMap.values()]
    .map((c) => ({ ...c, sharePct: totalCents > 0 ? (c.netSalesCents / totalCents) * 100 : 0 }))
    .sort((a, b) => b.netSalesCents - a.netSalesCents);

  const sort = params.sort ?? "revenue";
  const items = all
    .filter((i) => !params.category || i.category === params.category)
    .map(({ days, ...i }) => ({ ...i, sharePct: totalCents > 0 ? (i.netSalesCents / totalCents) * 100 : 0 }))
    .sort((a, b) => {
      if (sort === "qty") return b.qty - a.qty;
      if (sort === "name") return a.itemName.localeCompare(b.itemName);
      return b.netSalesCents - a.netSalesCents;
    });

  return {
    items,
    byCategory,
    totals: {
      netSalesCents: totalCents,
      qty: totalQty,
      txCount: totalTx,
      itemCount: all.length,
      dayCount: new Set(rows.map((r) => r.businessDate.getTime())).size,
    },
    /** Set when a category filter is on and matched nothing. */
    filteredCount: items.length,
  };
}
