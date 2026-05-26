import { prisma } from "@/lib/prisma";
import { lastNDays, startOfDay } from "@/lib/date";

export async function listCashCloses(locationId: string, days = 30) {
  const { from, to } = lastNDays(days);
  return prisma.cashClose.findMany({
    where: { locationId, businessDate: { gte: from, lte: to } },
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
    where: { locationId, businessDate: startOfDay(new Date(isoDate)) },
    include: {
      closedBy: { select: { name: true } },
      verifiedBy: { select: { name: true } },
    },
  });
}

export async function getSalesForDate(locationId: string, isoDate: string) {
  return prisma.dailySales.findFirst({
    where: { locationId, businessDate: startOfDay(new Date(isoDate)) },
  });
}

export async function listDepositsForDate(locationId: string, isoDate: string) {
  return prisma.deposit.findMany({
    where: { locationId, businessDate: startOfDay(new Date(isoDate)) },
    orderBy: { sequence: "asc" },
  });
}
