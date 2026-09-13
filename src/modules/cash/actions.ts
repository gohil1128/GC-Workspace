"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { writeAudit } from "@/lib/audit";
import { toCents } from "@/lib/money";
import { startOfDay } from "@/lib/date";
import { cashCloseSchema, depositSchema, payoutSchema, payoutEditSchema } from "./schemas";
import { overShortCentsFor } from "./reconcile";
import { requireCan } from "@/lib/auth";

async function recomputeOverShort(tx: any, locationId: string, businessDate: Date) {
  const [deposits, payouts, close] = await Promise.all([
    tx.deposit.findMany({ where: { locationId, businessDate } }),
    tx.cashPayout.findMany({ where: { locationId, businessDate } }),
    tx.cashClose.findFirst({ where: { locationId, businessDate } }),
  ]);
  if (!close) return;
  const depositCents = deposits.reduce((a: number, d: any) => a + d.amountCents, 0);
  // Derived from the itemised rows, the same way deposits are — the list is
  // the record, not a total anybody retypes.
  const paidOutCents = payouts.reduce((a: number, p: any) => a + p.amountCents, 0);
  const overShortCents = overShortCentsFor({
    cashCents: close.cashCents,
    creditCents: close.creditCents,
    depositCents,
    paidOutCents,
    paidInCents: close.paidInCents,
    openingCents: close.openingCents,
    expectedCents: close.expectedCents,
  });
  await tx.cashClose.update({
    where: { id: close.id },
    data: { depositCents, paidOutCents, overShortCents },
  });
}

export async function saveCashCloseAction(payload: unknown) {
  await requireCan("cash");
  const scope = await getScope();
  const parsed = cashCloseSchema.parse(payload);
  const businessDate = startOfDay(new Date(parsed.businessDate));

  const openingCents = toCents(parsed.openingDollars);
  const closingCents = toCents(parsed.closingDollars);
  const cashCents = toCents(parsed.cashDollars);
  const creditCents = toCents(parsed.creditDollars);
  const safeCountCents = toCents(parsed.safeCountDollars);
  const paidInCents = toCents(parsed.paidInDollars);
  const expectedCents = toCents(parsed.expectedDollars);

  await prisma.$transaction(async (tx) => {
    const [existingDeposits, existingPayouts] = await Promise.all([
      tx.deposit.findMany({ where: { locationId: scope.locationId, businessDate } }),
      tx.cashPayout.findMany({ where: { locationId: scope.locationId, businessDate } }),
    ]);
    const depositCents = existingDeposits.reduce((a, d) => a + d.amountCents, 0);
    // Not taken from the form: the payout list is what says how much left the
    // till, so there is nothing here for a typed total to disagree with.
    const paidOutCents = existingPayouts.reduce((a, p) => a + p.amountCents, 0);
    const overShortCents = overShortCentsFor({
      cashCents, creditCents, depositCents, paidOutCents, paidInCents, openingCents, expectedCents,
    });

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
  await requireCan("cash");
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
  await requireCan("cash");
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

export async function addPayoutAction(payload: unknown) {
  await requireCan("cash");
  const scope = await getScope();
  const parsed = payoutSchema.parse(payload);
  const businessDate = startOfDay(new Date(parsed.businessDate));

  await prisma.$transaction(async (tx) => {
    await tx.cashPayout.create({
      data: {
        locationId: scope.locationId,
        businessDate,
        amountCents: toCents(parsed.amountDollars),
        kind: parsed.kind,
        reason: parsed.reason.trim(),
        paidTo: parsed.paidTo?.trim() || null,
        reference: parsed.reference?.trim() || null,
      },
    });
    await recomputeOverShort(tx, scope.locationId, businessDate);
  });

  await writeAudit({
    businessId: scope.businessId, userId: scope.userId,
    action: "payout.add", entityType: "CashPayout",
    diff: { amount: parsed.amountDollars, reason: parsed.reason, paidTo: parsed.paidTo ?? null },
  });
  revalidatePath("/cash");
  revalidatePath("/cash/new");
  revalidatePath("/dashboard");
}

/*
  Correcting a payout, rather than deleting and re-typing it.

  A payout is usually written down in a hurry at the stall — the amount off by
  a digit, the reason half a word — and the old answer was to delete the row
  and add it again, which loses the record that it was ever wrong. This keeps
  the row and re-derives the day's over/short from the new amount.

  The day itself is not editable here: a payout belongs to the day whose drawer
  it came out of, and moving it would have to re-balance two closes. A payout
  filed against the wrong day is still a delete-and-re-add.

  Returns its error rather than throwing: production redacts thrown Server
  Action messages, so a thrown validation message reaches the user as a digest.
*/
export async function updatePayoutAction(
  id: string,
  payload: unknown,
): Promise<{ ok: true } | { error: string }> {
  await requireCan("cash");
  const scope = await getScope();

  const parsed = payoutEditSchema.safeParse(payload);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the amount and the reason." };
  }
  const next = parsed.data;

  const before = await prisma.cashPayout.findFirst({
    where: { id, locationId: scope.locationId },
  });
  if (!before) return { error: "That payout is no longer there — reload the page." };

  const amountCents = toCents(next.amountDollars);
  await prisma.$transaction(async (tx) => {
    await tx.cashPayout.update({
      where: { id },
      data: {
        amountCents,
        kind: next.kind,
        reason: next.reason.trim(),
        paidTo: next.paidTo?.trim() || null,
        reference: next.reference?.trim() || null,
      },
    });
    await recomputeOverShort(tx, scope.locationId, before.businessDate);
  });

  await writeAudit({
    businessId: scope.businessId, userId: scope.userId,
    action: "payout.update", entityType: "CashPayout", entityId: id,
    // Before and after, so the correction itself is auditable — that is the
    // whole reason this edits rather than replaces.
    diff: {
      before: {
        amountCents: before.amountCents, kind: before.kind, reason: before.reason,
        paidTo: before.paidTo, reference: before.reference,
      },
      after: {
        amountCents, kind: next.kind, reason: next.reason.trim(),
        paidTo: next.paidTo?.trim() || null, reference: next.reference?.trim() || null,
      },
    },
  });

  revalidatePath("/cash");
  revalidatePath("/cash/new");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deletePayoutAction(id: string) {
  await requireCan("cash");
  const scope = await getScope();
  const payout = await prisma.cashPayout.findFirst({ where: { id, locationId: scope.locationId } });
  if (!payout) throw new Error("Not found");
  await prisma.$transaction(async (tx) => {
    await tx.cashPayout.delete({ where: { id } });
    await recomputeOverShort(tx, scope.locationId, payout.businessDate);
  });
  await writeAudit({
    businessId: scope.businessId, userId: scope.userId,
    action: "payout.delete", entityType: "CashPayout", entityId: id,
  });
  revalidatePath("/cash");
  revalidatePath("/cash/new");
  revalidatePath("/dashboard");
}

export async function verifyCloseAction(closeId: string) {
  await requireCan("cashVerify");
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
