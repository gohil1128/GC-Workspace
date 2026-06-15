import { prisma } from "@/lib/prisma";
import { normalizeCategory } from "./categories";

// One row per unique item name at this location, rolled up across all dates,
// with the raw category Square gave it. Used by the category editor.
export async function listItemCatalog(locationId: string) {
  const rows = await prisma.salesItem.findMany({
    where: { locationId },
    select: { itemName: true, category: true, qty: true, netSalesCents: true, businessDate: true },
    orderBy: { businessDate: "desc" },
  });

  const byItem = new Map<
    string,
    { itemName: string; category: string | null; qty: number; netSalesCents: number; days: Set<string>; lastDate: Date }
  >();
  for (const r of rows) {
    const ex = byItem.get(r.itemName);
    if (ex) {
      ex.qty += r.qty;
      ex.netSalesCents += r.netSalesCents;
      ex.days.add(r.businessDate.toISOString());
      if (r.businessDate > ex.lastDate) ex.lastDate = r.businessDate;
      // Prefer a non-empty category if any row has one
      if (!ex.category && r.category) ex.category = r.category;
    } else {
      byItem.set(r.itemName, {
        itemName: r.itemName,
        category: r.category,
        qty: r.qty,
        netSalesCents: r.netSalesCents,
        days: new Set([r.businessDate.toISOString()]),
        lastDate: r.businessDate,
      });
    }
  }

  return [...byItem.values()]
    .map((i) => ({
      itemName: i.itemName,
      rawCategory: i.category,
      category: normalizeCategory(i.category, i.itemName),
      qty: i.qty,
      netSalesCents: i.netSalesCents,
      dayCount: i.days.size,
      lastDate: i.lastDate,
    }))
    .sort((a, b) => b.netSalesCents - a.netSalesCents);
}
