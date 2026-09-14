import { prisma } from "@/lib/prisma";
import { lastNDays, businessDayFromIso } from "@/lib/date";

export async function listCashCloses(locationId: string, days = 30, eventId?: string | null) {
  const { from, to } = lastNDays(days);
  return prisma.cashClose.findMany({
    where: {
      locationId,
      businessDate: { gte: from, lte: to },
      ...(eventId ? { eventId } : {}),
    },
    include: {
      closedBy: { select: { name: true } },
      verifiedBy: { select: { name: true } },
      event: { select: { id: true, name: true, color: true } },
    },
    orderBy: { businessDate: "desc" },
  });
}

export async function getCashCloseByDate(locationId: string, isoDate: string) {
  return prisma.cashClose.findFirst({
    where: { locationId, businessDate: businessDayFromIso(isoDate) },
    include: {
      closedBy: { select: { name: true } },
      verifiedBy: { select: { name: true } },
    },
  });
}

export async function getSalesForDate(locationId: string, isoDate: string) {
  return prisma.dailySales.findFirst({
    where: { locationId, businessDate: businessDayFromIso(isoDate) },
  });
}

export async function listDepositsForDate(locationId: string, isoDate: string) {
  return prisma.deposit.findMany({
    where: { locationId, businessDate: businessDayFromIso(isoDate) },
    orderBy: { sequence: "asc" },
  });
}

export async function listPayouts(locationId: string, days = 365) {
  const { from, to } = lastNDays(days);
  return prisma.cashPayout.findMany({
    where: { locationId, businessDate: { gte: from, lte: to } },
    orderBy: [{ businessDate: "desc" }, { createdAt: "asc" }],
  });
}

export async function listPayoutsForDate(locationId: string, isoDate: string) {
  return prisma.cashPayout.findMany({
    where: { locationId, businessDate: businessDayFromIso(isoDate) },
    orderBy: { createdAt: "asc" },
  });
}

/*
  The cash position: how much cash the business is actually holding, across
  every event it has ever traded.

  Not the latest drawer count, which is what this used to be. This business
  trades at events with weeks of nothing between them, so "the most recent
  close" answered a question about one market day rather than about the cash
  box — and a thirty-day window could easily contain no trading at all.

  Per close the arithmetic is unchanged, and is the same one the tile has
  always claimed: the till as counted, less the float that was put in to make
  change. Banked cash and payouts are NOT taken off again — both left the
  drawer before it was counted, so they are already missing from the count.
  Subtracting them here would deduct the same money twice.

  A close with a zero count is left out rather than counted as minus the
  float. A till that was counted always has at least the float in it, so zero
  means nobody counted it — usually an entry saved with the amount left at its
  default. Counting those would quietly drag the total down by the float for
  every one of them. They are returned as `uncounted` so the page can say how
  many were skipped instead of hiding the gap.
*/
export async function getCashPosition(locationId: string) {
  const closes = await prisma.cashClose.findMany({
    where: { locationId },
    select: {
      businessDate: true, cashCents: true, openingCents: true,
      depositCents: true, safeCountCents: true, overShortCents: true,
    },
    orderBy: { businessDate: "desc" },
  });

  const counted = closes.filter((c) => c.cashCents > 0);
  const inHandCents = counted.reduce((a, c) => a + (c.cashCents - c.openingCents), 0);

  const paidOut = await prisma.cashPayout.aggregate({
    where: { locationId },
    _sum: { amountCents: true },
    _count: true,
  });

  return {
    inHandCents,
    countedTills: counted.length,
    uncounted: closes.length - counted.length,
    closes: closes.length,
    // The float is working change rather than takings, so it is netted out of
    // the figure above — but it is real cash in the box, so it is named.
    floatCents: counted[0]?.openingCents ?? 0,
    safeCents: counted[0]?.safeCountCents ?? 0,
    bankedCents: closes.reduce((a, c) => a + c.depositCents, 0),
    paidOutCents: paidOut._sum.amountCents ?? 0,
    payoutCount: paidOut._count,
    overShortCents: closes.reduce((a, c) => a + c.overShortCents, 0),
    // The earliest till that was actually counted, not the earliest close —
    // the figure covers the counted ones, so that is the date it runs from.
    firstCountedDate: counted.length ? counted[counted.length - 1].businessDate : null,
    lastCountedDate: counted[0]?.businessDate ?? null,
  };
}
