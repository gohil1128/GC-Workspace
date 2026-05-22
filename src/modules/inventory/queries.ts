import { prisma } from "@/lib/prisma";

export async function listIngredients(businessId: string) {
  return prisma.ingredient.findMany({
    where: { businessId },
    include: { supplier: true },
    orderBy: { name: "asc" },
  });
}

export async function getIngredient(businessId: string, id: string) {
  return prisma.ingredient.findFirst({
    where: { id, businessId },
    include: {
      supplier: true,
      movements: { orderBy: { occurredAt: "desc" }, take: 50 },
    },
  });
}

export async function listCounts(locationId: string) {
  return prisma.inventoryCount.findMany({
    where: { locationId },
    include: { countedBy: { select: { name: true } }, lines: true },
    orderBy: { countedAt: "desc" },
  });
}

export async function getCount(locationId: string, id: string) {
  return prisma.inventoryCount.findFirst({
    where: { id, locationId },
    include: {
      lines: { include: { ingredient: true } },
      countedBy: { select: { name: true } },
    },
  });
}

export async function getVarianceReport(locationId: string) {
  const latest = await prisma.inventoryCount.findFirst({
    where: { locationId },
    orderBy: { countedAt: "desc" },
    include: { lines: { include: { ingredient: true } }, countedBy: true },
  });
  if (!latest) return null;
  const lines = latest.lines
    .map((l) => ({
      id: l.id,
      ingredient: l.ingredient.name,
      unit: l.unit,
      theoretical: l.theoreticalQty,
      actual: l.qtyCounted,
      variance: l.varianceQty,
      varianceCostCents: l.varianceCostCents,
      pct: l.theoreticalQty === 0 ? 0 : (l.varianceQty / l.theoreticalQty) * 100,
    }))
    .sort((a, b) => Math.abs(b.varianceCostCents) - Math.abs(a.varianceCostCents));
  const totalVarianceCostCents = lines.reduce((a, l) => a + Math.abs(l.varianceCostCents), 0);
  return { count: latest, lines, totalVarianceCostCents };
}
