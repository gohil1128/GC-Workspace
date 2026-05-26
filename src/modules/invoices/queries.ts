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
  return prisma.invoice.findMany({
    where,
    include: {
      supplier: { select: { name: true } },
      createdBy: { select: { name: true } },
      _count: { select: { items: true } },
    },
    orderBy: { invoiceDate: "desc" },
  });
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
