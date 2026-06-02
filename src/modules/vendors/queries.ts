import { prisma } from "@/lib/prisma";

export async function listVendors(businessId: string) {
  return prisma.vendor.findMany({
    where: { businessId },
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
  });
}

export async function getVendor(businessId: string, id: string) {
  return prisma.vendor.findFirst({
    where: { id, businessId },
    include: {
      expenses: {
        orderBy: { businessDate: "desc" },
        take: 24,
        include: { event: { select: { id: true, name: true, color: true } } },
      },
    },
  });
}

/**
 * Given a list of vendors, look up whether each has been paid in the given
 * month (YYYY-MM) — used to drive the "Pay this month" button state.
 */
export async function getMonthlyFeePaymentStatus(
  vendorIds: string[],
  yearMonth: string // e.g. "2026-06"
): Promise<Map<string, { paid: boolean; amountCents: number }>> {
  const [year, month] = yearMonth.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 1);
  const rows = await prisma.expense.findMany({
    where: {
      vendorId: { in: vendorIds },
      isIncentive: false,
      businessDate: { gte: start, lt: end },
    },
    select: { vendorId: true, amountCents: true },
  });
  const map = new Map<string, { paid: boolean; amountCents: number }>();
  for (const id of vendorIds) map.set(id, { paid: false, amountCents: 0 });
  for (const r of rows) {
    if (!r.vendorId) continue;
    const cur = map.get(r.vendorId)!;
    cur.paid = true;
    cur.amountCents += r.amountCents;
  }
  return map;
}
