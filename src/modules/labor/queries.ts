import { prisma } from "@/lib/prisma";
import { lastNDays, startOfDay, addDays } from "@/lib/date";

export async function listEmployees(businessId: string) {
  return prisma.employee.findMany({ where: { businessId }, orderBy: { name: "asc" } });
}

export async function listShifts(locationId: string, from: Date, to: Date) {
  return prisma.shift.findMany({
    where: { locationId, start: { gte: from, lte: to } },
    include: { employee: true, timeEntry: true },
    orderBy: { start: "asc" },
  });
}

export async function getLaborReport(locationId: string, days: number) {
  const { from, to } = lastNDays(days);
  const [shifts, sales] = await Promise.all([
    prisma.shift.findMany({
      where: { locationId, start: { gte: from, lte: to } },
      include: { employee: true, timeEntry: true },
    }),
    prisma.dailySales.findMany({ where: { locationId, businessDate: { gte: from, lte: to } } }),
  ]);
  const netSalesCents = sales.reduce((a, s) => a + s.netSalesCents, 0);

  const byEmployee = new Map<string, { name: string; position: string; rate: number; scheduledMin: number; actualMin: number; costCents: number }>();
  let totalScheduled = 0;
  let totalActual = 0;
  let totalCostCents = 0;

  for (const s of shifts) {
    const key = s.employeeId;
    if (!byEmployee.has(key)) byEmployee.set(key, { name: s.employee.name, position: s.employee.position, rate: s.employee.hourlyRateCents, scheduledMin: 0, actualMin: 0, costCents: 0 });
    const e = byEmployee.get(key)!;
    e.scheduledMin += s.scheduledMinutes;
    const actualMin = s.timeEntry?.actualMinutes ?? 0;
    e.actualMin += actualMin;
    const cost = Math.round(((actualMin || s.scheduledMinutes) / 60) * s.employee.hourlyRateCents);
    e.costCents += cost;
    totalScheduled += s.scheduledMinutes;
    totalActual += actualMin;
    totalCostCents += cost;
  }

  return {
    period: { from, to, days },
    netSalesCents,
    totalScheduledHours: totalScheduled / 60,
    totalActualHours: totalActual / 60,
    totalCostCents,
    laborPct: netSalesCents === 0 ? 0 : (totalCostCents / netSalesCents) * 100,
    byEmployee: Array.from(byEmployee.values()).sort((a, b) => b.costCents - a.costCents),
  };
}

export function getWeekStart(d: Date): Date {
  const x = startOfDay(d);
  const day = x.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // start Monday
  return addDays(x, diff);
}
