import { prisma } from "@/lib/prisma";

// Raw table reads that only the CSV export needs — the app's screens consume
// these tables through aggregates (dashboard, reports), so there was no
// existing list query to reuse.

export async function listDailySalesForExport(locationId: string) {
  return prisma.dailySales.findMany({
    where: { locationId },
    select: {
      businessDate: true,
      netSalesCents: true,
      taxCents: true,
      tipsCents: true,
      guestCount: true,
      source: true,
      event: { select: { name: true } },
    },
    orderBy: { businessDate: "desc" },
  });
}

export async function listSalesItemsForExport(locationId: string) {
  return prisma.salesItem.findMany({
    where: { locationId },
    select: {
      businessDate: true,
      itemName: true,
      category: true,
      qty: true,
      netSalesCents: true,
      taxCents: true,
      txCount: true,
      event: { select: { name: true } },
    },
    orderBy: [{ businessDate: "desc" }, { netSalesCents: "desc" }],
  });
}

export async function listPurchaseOrderItemsForExport(locationId: string) {
  return prisma.purchaseOrder.findMany({
    where: { locationId },
    select: {
      id: true,
      status: true,
      orderedAt: true,
      expectedAt: true,
      receivedAt: true,
      totalCents: true,
      supplier: { select: { name: true } },
      items: {
        select: {
          qtyOrdered: true,
          qtyReceived: true,
          unit: true,
          unitCostCents: true,
          lineTotalCents: true,
          ingredient: { select: { name: true } },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { orderedAt: "desc" },
  });
}

// listAllEvents returns a narrowed EventLite without the booth fee, so the
// export reads the fee columns directly.
export async function listEventsForExport(businessId: string) {
  return prisma.event.findMany({
    where: { businessId },
    select: {
      name: true,
      startDate: true,
      endDate: true,
      feeCents: true,
      feeNote: true,
      isActive: true,
      notes: true,
    },
    orderBy: { startDate: "desc" },
  });
}

export async function listRecipeLinesForExport(businessId: string) {
  return prisma.recipe.findMany({
    where: { businessId },
    select: {
      name: true,
      category: true,
      yieldQty: true,
      yieldUnit: true,
      menuPriceCents: true,
      isActive: true,
      ingredients: {
        select: {
          qty: true,
          unit: true,
          ingredient: { select: { name: true, avgCostCents: true, unit: true } },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });
}

export async function listInventoryCountLinesForExport(locationId: string) {
  return prisma.inventoryCount.findMany({
    where: { locationId },
    select: {
      countedAt: true,
      type: true,
      notes: true,
      countedBy: { select: { name: true } },
      lines: {
        select: {
          qtyCounted: true,
          unit: true,
          theoreticalQty: true,
          varianceQty: true,
          varianceCostCents: true,
          ingredient: { select: { name: true } },
        },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { countedAt: "desc" },
  });
}

export async function listEmployeesForExport(businessId: string) {
  return prisma.employee.findMany({
    where: { businessId },
    select: {
      name: true,
      position: true,
      hourlyRateCents: true,
      isActive: true,
      createdAt: true,
    },
    orderBy: { name: "asc" },
  });
}
