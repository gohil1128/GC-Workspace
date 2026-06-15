import { prisma } from "@/lib/prisma";
import { normalizeCategory } from "@/modules/items/categories";

export async function getTopItems(params: {
  locationId: string;
  from: Date;
  to: Date;
  eventId?: string | null;
  limit?: number;
}) {
  const where = {
    locationId: params.locationId,
    businessDate: { gte: params.from, lte: params.to },
    ...(params.eventId ? { eventId: params.eventId } : {}),
  };
  const rows = await prisma.salesItem.findMany({
    where,
    select: {
      itemName: true,
      category: true,
      qty: true,
      netSalesCents: true,
      txCount: true,
    },
  });

  const byItem = new Map<
    string,
    { itemName: string; category: string | null; qty: number; netSalesCents: number; txCount: number }
  >();
  for (const r of rows) {
    const existing = byItem.get(r.itemName);
    if (existing) {
      existing.qty += r.qty;
      existing.netSalesCents += r.netSalesCents;
      existing.txCount += r.txCount;
    } else {
      byItem.set(r.itemName, {
        itemName: r.itemName,
        category: r.category,
        qty: r.qty,
        netSalesCents: r.netSalesCents,
        txCount: r.txCount,
      });
    }
  }

  const items = [...byItem.values()].sort((a, b) => b.netSalesCents - a.netSalesCents);
  const totalCents = items.reduce((a, i) => a + i.netSalesCents, 0);
  const totalQty = items.reduce((a, i) => a + i.qty, 0);

  // Roll up by normalized category (Hot Chai / Cold Chais / Food / Tips / Other)
  const catMap = new Map<string, { category: string; netSalesCents: number; qty: number }>();
  for (const i of items) {
    const cat = normalizeCategory(i.category, i.itemName);
    const ex = catMap.get(cat);
    if (ex) {
      ex.netSalesCents += i.netSalesCents;
      ex.qty += i.qty;
    } else {
      catMap.set(cat, { category: cat, netSalesCents: i.netSalesCents, qty: i.qty });
    }
  }
  const byCategory = [...catMap.values()]
    .map((c) => ({ ...c, sharePct: totalCents > 0 ? (c.netSalesCents / totalCents) * 100 : 0 }))
    .sort((a, b) => b.netSalesCents - a.netSalesCents);

  return {
    items: items.slice(0, params.limit ?? 12).map((i) => ({
      ...i,
      category: normalizeCategory(i.category, i.itemName),
      sharePct: totalCents > 0 ? (i.netSalesCents / totalCents) * 100 : 0,
    })),
    byCategory,
    totalCents,
    totalQty,
    count: items.length,
  };
}
