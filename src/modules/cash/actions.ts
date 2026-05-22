"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { writeAudit } from "@/lib/audit";
import { toCents } from "@/lib/money";
import { startOfDay } from "@/lib/date";
import { cashCloseSchema } from "./schemas";

export async function saveCashCloseAction(payload: unknown) {
  const scope = await getScope();
  const parsed = cashCloseSchema.parse(payload);
  const businessDate = startOfDay(new Date(parsed.businessDate));

  const openingCents = toCents(parsed.openingDollars);
  const closingCents = toCents(parsed.closingDollars);
  const safeCountCents = toCents(parsed.safeCountDollars);
  const depositCents = toCents(parsed.depositDollars);
  const paidInCents = toCents(parsed.paidInDollars);
  const paidOutCents = toCents(parsed.paidOutDollars);
  const expectedCents = toCents(parsed.expectedDollars);
  const overShortCents = closingCents + depositCents - openingCents - expectedCents;

  const c = await prisma.cashClose.upsert({
    where: { locationId_businessDate: { locationId: scope.locationId, businessDate } },
    update: {
      openingCents, closingCents, safeCountCents, depositCents, paidInCents, paidOutCents,
      expectedCents, overShortCents,
      checklistJson: parsed.checklist as object,
      notes: parsed.notes ?? null,
      closedById: scope.userId,
    },
    create: {
      locationId: scope.locationId, businessDate,
      openingCents, closingCents, safeCountCents, depositCents, paidInCents, paidOutCents,
      expectedCents, overShortCents,
      checklistJson: parsed.checklist as object,
      notes: parsed.notes ?? null,
      closedById: scope.userId,
    },
  });

  // also create deposit record if depositCents > 0
  if (depositCents > 0) {
    await prisma.deposit.create({
      data: { locationId: scope.locationId, businessDate, amountCents: depositCents, reference: `Close ${c.id.slice(-6)}` },
    });
  }

  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "cash.close", entityType: "CashClose", entityId: c.id, diff: { overShortCents } });
  revalidatePath("/cash");
  revalidatePath("/dashboard");
  redirect("/cash");
}
