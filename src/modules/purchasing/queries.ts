import { prisma } from "@/lib/prisma";
import { reorderSuggestion } from "@/modules/inventory/costing";

export async function listSuppliers(businessId: string) {
  return prisma.supplier.findMany({
    where: { businessId },
    orderBy: { name: "asc" },
    include: { _count: { select: { ingredients: true, purchaseOrders: true } } },
  });
}

export async function listPurchaseOrders(locationId: string) {
  return prisma.purchaseOrder.findMany({
    where: { locationId },
    include: { supplier: true, items: true, createdBy: { select: { name: true } } },
    orderBy: { orderedAt: "desc" },
  });
}

export async function getPurchaseOrder(locationId: string, id: string) {
  return prisma.purchaseOrder.findFirst({
    where: { id, locationId },
    include: {
      supplier: true,
      createdBy: { select: { name: true } },
      items: { include: { ingredient: true }, orderBy: { id: "asc" } },
    },
  });
}

export async function getReorderSuggestions(businessId: string) {
  const ingredients = await prisma.ingredient.findMany({
    where: { businessId },
    include: { supplier: true },
    orderBy: { name: "asc" },
  });
  const suggestions = ingredients
    .map((i) => {
      const suggested = reorderSuggestion({
        onHand: i.onHand,
        parLevel: i.parLevel,
        reorderPoint: i.reorderPoint,
        reorderQty: i.reorderQty,
      });
      return { ingredient: i, suggested };
    })
    .filter((s) => s.suggested > 0);

  const bySupplier = new Map<string, { supplier: typeof ingredients[0]["supplier"]; items: typeof suggestions }>();
  for (const s of suggestions) {
    const key = s.ingredient.supplierId ?? "unassigned";
    if (!bySupplier.has(key)) bySupplier.set(key, { supplier: s.ingredient.supplier, items: [] });
    bySupplier.get(key)!.items.push(s);
  }
  return Array.from(bySupplier.values());
}
