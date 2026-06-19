import { prisma } from "@/lib/prisma";

export type CapitalAssetRow = Awaited<ReturnType<typeof listCapitalAssets>>[number];

export async function listCapitalAssets(locationId: string) {
  return prisma.capitalAsset.findMany({
    where: { locationId },
    include: {
      event: { select: { id: true, name: true, color: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { purchaseDate: "desc" },
  });
}

// Straight-line depreciation for a single asset between `from` and `to`.
// If usefulLifeMonths is null, treated as a non-depreciating asset (0).
export function depreciationForPeriod(
  asset: {
    purchaseDate: Date;
    purchasePriceCents: number;
    salvageValueCents: number;
    usefulLifeMonths: number | null;
    status: string;
  },
  from: Date,
  to: Date,
): number {
  if (!asset.usefulLifeMonths || asset.usefulLifeMonths <= 0) return 0;
  if (asset.status !== "IN_SERVICE") return 0;
  const depreciable = asset.purchasePriceCents - asset.salvageValueCents;
  if (depreciable <= 0) return 0;
  const perMonth = depreciable / asset.usefulLifeMonths;

  // Service window: max(purchaseDate, from) → min(purchaseEnd, to)
  const serviceStart = asset.purchaseDate;
  const serviceEnd = new Date(serviceStart);
  serviceEnd.setMonth(serviceEnd.getMonth() + asset.usefulLifeMonths);

  const windowStart = serviceStart > from ? serviceStart : from;
  const windowEnd = serviceEnd < to ? serviceEnd : to;
  if (windowEnd <= windowStart) return 0;

  const ms = windowEnd.getTime() - windowStart.getTime();
  const months = ms / (1000 * 60 * 60 * 24 * 30.4375);
  return Math.round(perMonth * months);
}

// Aggregate capital position for the dashboard:
//   - totalInvested: sum of every IN_SERVICE asset's purchase price
//   - depreciationCents: depreciation for the given window
//   - netBookValueCents: invested − cumulative depreciation through `to`
//   - count
export async function getCapitalSummary(params: {
  locationId: string;
  from: Date;
  to: Date;
  eventId?: string | null;
}) {
  const where: any = { locationId: params.locationId };
  if (params.eventId) where.eventId = params.eventId;
  const assets = await prisma.capitalAsset.findMany({ where });
  const inService = assets.filter((a) => a.status === "IN_SERVICE");

  let totalInvested = 0;
  let depreciation = 0;
  let netBookValue = 0;
  for (const a of inService) {
    totalInvested += a.purchasePriceCents;
    depreciation += depreciationForPeriod(a, params.from, params.to);
    const cumulativeDep = depreciationForPeriod(a, a.purchaseDate, params.to);
    const nbv = Math.max(a.salvageValueCents, a.purchasePriceCents - cumulativeDep);
    netBookValue += nbv;
  }

  return {
    count: inService.length,
    totalInvestedCents: totalInvested,
    depreciationCents: depreciation,
    netBookValueCents: netBookValue,
  };
}
