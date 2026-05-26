"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { writeAudit } from "@/lib/audit";
import { toCents } from "@/lib/money";
import { startOfDay } from "@/lib/date";
import { cashCloseSchema, depositSchema } from "./schemas";

async function recomputeOverShort(tx: any, locationId: string, businessDate: Date) {
  // Sum deposits for the day
  const deposits = await tx.deposit.findMany({ where: { locationId, businessDate } });
  const depositCents = deposits.reduce((a: number, d: any) => a + d.amountCents, 0);
  const close = await tx.cashClose.findFirst({ where: { locationId, businessDate } });
  if (!close) return;
  const overShortCents = close.cashCents + close.creditCents + depositCents - close.openingCents - close.expectedCents;
  await tx.cashClose.update({
    where: { id: close.id },
    data: { depositCents, overShortCents },
  });
}

export async function saveCashCloseAction(payload: unknown) {
  const scope = await getScope();
  const parsed = cashCloseSchema.parse(payload);
  const businessDate = startOfDay(new Date(parsed.businessDate));

  const openingCents = toCents(parsed.openingDollars);
  const closingCents = toCents(parsed.closingDollars);
  const cashCents = toCents(parsed.cashDollars);
  const creditCents = toCents(parsed.creditDollars);
  const safeCountCents = toCents(parsed.safeCountDollars);
  const paidInCents = toCents(parsed.paidInDollars);
  const paidOutCents = toCents(parsed.paidOutDollars);
  const expectedCents = toCents(parsed.expectedDollars);

  await prisma.$transaction(async (tx) => {
    const existingDeposits = await tx.deposit.findMany({ where: { locationId: scope.locationId, businessDate } });
    const depositCents = existingDeposits.reduce((a, d) => a + d.amountCents, 0);
    const overShortCents = cashCents + creditCents + depositCents - openingCents - expectedCents;

    await tx.cashClose.upsert({
      where: { locationId_businessDate: { locationId: scope.locationId, businessDate } },
      update: {
        openingCents, closingCents, cashCents, creditCents, safeCountCents,
        depositCents, paidInCents, paidOutCents, expectedCents, overShortCents,
        weather: parsed.weather ?? null,
        specialEvents: parsed.specialEvents ?? null,
        eventId: parsed.eventId || null,
        checklistJson: parsed.checklist as object,
        notes: parsed.notes ?? null,
        closedById: scope.userId,
      },
      create: {
        locationId: scope.locationId, businessDate,
        openingCents, closingCents, cashCents, creditCents, safeCountCents,
        depositCents, paidInCents, paidOutCents, expectedCents, overShortCents,
        weather: parsed.weather ?? null,
        specialEvents: parsed.specialEvents ?? null,
        eventId: parsed.eventId || null,
        checklistJson: parsed.checklist as object,
        notes: parsed.notes ?? null,
        closedById: scope.userId,
      },
    });
  });

  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "cash.close", entityType: "CashClose", entityId: businessDate.toISOString() });
  revalidatePath("/cash");
  revalidatePath("/dashboard");
  redirect("/cash");
}

export async function addDepositAction(payload: unknown) {
  const scope = await getScope();
  const parsed = depositSchema.parse(payload);
  const businessDate = startOfDay(new Date(parsed.businessDate));

  // Auto-increment sequence if not provided
  let sequence = parsed.sequence ?? null;
  if (sequence === null) {
    const last = await prisma.deposit.findFirst({
      where: { locationId: scope.locationId, businessDate },
      orderBy: { sequence: "desc" },
      select: { sequence: true },
    });
    sequence = (last?.sequence ?? 0) + 1;
  }

  await prisma.$transaction(async (tx) => {
    await tx.deposit.create({
      data: {
        locationId: scope.locationId,
        businessDate,
        amountCents: toCents(parsed.amountDollars),
        sequence,
        bagCode: parsed.bagCode || null,
        preparedBy: parsed.preparedBy || null,
        notes: parsed.notes || null,
      },
    });
    await recomputeOverShort(tx, scope.locationId, businessDate);
  });

  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "deposit.add", entityType: "Deposit", diff: { amount: parsed.amountDollars } });
  revalidatePath("/cash");
  revalidatePath("/cash/new");
  revalidatePath("/dashboard");
}

export async function deleteDepositAction(id: string) {
  const scope = await getScope();
  const dep = await prisma.deposit.findFirst({ where: { id, locationId: scope.locationId } });
  if (!dep) throw new Error("Not found");
  await prisma.$transaction(async (tx) => {
    await tx.deposit.delete({ where: { id } });
    await recomputeOverShort(tx, scope.locationId, dep.businessDate);
  });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "deposit.delete", entityType: "Deposit", entityId: id });
  revalidatePath("/cash");
  revalidatePath("/cash/new");
}

export async function verifyCloseAction(closeId: string) {
  const scope = await getScope();
  const c = await prisma.cashClose.findFirst({ where: { id: closeId, locationId: scope.locationId } });
  if (!c) throw new Error("Not found");
  await prisma.cashClose.update({
    where: { id: closeId },
    data: {
      verifiedById: c.verifiedById ? null : scope.userId,
      verifiedAt: c.verifiedById ? null : new Date(),
    },
  });
  await writeAudit({
    businessId: scope.businessId, userId: scope.userId,
    action: c.verifiedById ? "cash.unverify" : "cash.verify",
    entityType: "CashClose", entityId: closeId,
  });
  revalidatePath("/cash");
  revalidatePath("/cash/new");
}
