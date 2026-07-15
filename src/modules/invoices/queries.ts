import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "@/lib/date";

export type InvoiceFilters = {
  supplierId?: string;
  invoiceNumber?: string;
  status?: "open" | "closed" | "all";
  from?: string; // YYYY-MM-DD on invoiceDate
  to?: string;
};

export async function listInvoices(locationId: string, filters: InvoiceFilters = {}) {
  const where: any = { locationId };
  if (filters.supplierId) where.supplierId = filters.supplierId;
  if (filters.invoiceNumber) where.invoiceNumber = { contains: filters.invoiceNumber.trim(), mode: "insensitive" };
  if (filters.status === "open") where.closedAt = null;
  if (filters.status === "closed") where.closedAt = { not: null };
  if (filters.from || filters.to) {
    where.invoiceDate = {};
    if (filters.from) where.invoiceDate.gte = startOfDay(new Date(filters.from));
    if (filters.to) where.invoiceDate.lte = endOfDay(new Date(filters.to));
  }
  // Explicit select keeps the (potentially large) imageDataUrl out of the
  // list query — a cheap second query flags which rows have a photo so the
  // list can show a clickable thumbnail icon.
  const [rows, withPhoto] = await Promise.all([
    prisma.invoice.findMany({
      where,
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dateReceived: true,
        subtotalCents: true,
        totalCents: true,
        closedAt: true,
        appliesToAllEvents: true,
        supplier: { select: { name: true } },
        createdBy: { select: { name: true } },
        event: { select: { id: true, name: true, color: true } },
        _count: { select: { items: true } },
      },
      orderBy: { invoiceDate: "desc" },
    }),
    prisma.invoice.findMany({
      where: { ...where, imageDataUrl: { not: null } },
      select: { id: true },
    }),
  ]);
  const photoIds = new Set(withPhoto.map((r) => r.id));
  return rows.map((r) => ({ ...r, hasImage: photoIds.has(r.id) }));
}

export async function getInvoice(locationId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, locationId },
    include: {
      supplier: true,
      location: { select: { name: true } },
      createdBy: { select: { name: true } },
      po: { select: { id: true } },
      items: { include: { ingredient: true }, orderBy: { id: "asc" } },
    },
  });
}

export async function listSuppliersForInvoice(businessId: string) {
  return prisma.supplier.findMany({
    where: { businessId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

export async function searchIngredients(businessId: string, q: string, limit = 25) {
  const term = q.trim();
  if (!term) {
    return prisma.ingredient.findMany({
      where: { businessId },
      select: { id: true, name: true, sku: true, unit: true, category: true, lastCostCents: true, supplierId: true },
      orderBy: { name: "asc" },
      take: limit,
    });
  }
  return prisma.ingredient.findMany({
    where: {
      businessId,
      OR: [
        { name: { contains: term, mode: "insensitive" } },
        { sku: { contains: term, mode: "insensitive" } },
      ],
    },
    select: { id: true, name: true, sku: true, unit: true, category: true, lastCostCents: true, supplierId: true },
    orderBy: { name: "asc" },
    take: limit,
  });
}

export async function listOpenPosForSupplier(locationId: string, supplierId: string) {
  return prisma.purchaseOrder.findMany({
    where: { locationId, supplierId, status: { in: ["SENT", "RECEIVED"] } },
    include: { items: { include: { ingredient: true } } },
    orderBy: { orderedAt: "desc" },
    take: 10,
  });
}
