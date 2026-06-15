"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { requireOwner } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

// Delete all imported sales (DailySales + per-item SalesItem) for a single
// business day at the active location. CashClose rows are left intact — the
// CSV importers only *update* their splits, they don't create them — but we
// zero out the cash/credit split we may have written so the close isn't stale.
export async function deleteImportedDayAction(iso: string) {
  await requireOwner();
  const scope = await getScope();
  const businessDate = new Date(iso);
  if (isNaN(businessDate.getTime())) throw new Error("Bad date");

  const [salesDeleted, itemsDeleted] = await prisma.$transaction([
    prisma.dailySales.deleteMany({ where: { locationId: scope.locationId, businessDate } }),
    prisma.salesItem.deleteMany({ where: { locationId: scope.locationId, businessDate } }),
  ]);

  await writeAudit({
    businessId: scope.businessId,
    userId: scope.userId,
    action: "import.delete_day",
    entityType: "DailySales",
    diff: { date: iso, salesDeleted: salesDeleted.count, itemsDeleted: itemsDeleted.count },
  });
  revalidatePath("/settings/integrations");
  revalidatePath("/dashboard");
  return { salesDeleted: salesDeleted.count, itemsDeleted: itemsDeleted.count };
}

// Delete every imported sales row tagged with a given event at this location.
export async function deleteImportedEventDataAction(eventId: string) {
  await requireOwner();
  const scope = await getScope();
  const ev = await prisma.event.findFirst({ where: { id: eventId, businessId: scope.businessId } });
  if (!ev) throw new Error("Event not found");

  const [salesDeleted, itemsDeleted] = await prisma.$transaction([
    prisma.dailySales.deleteMany({ where: { locationId: scope.locationId, eventId } }),
    prisma.salesItem.deleteMany({ where: { locationId: scope.locationId, eventId } }),
  ]);

  await writeAudit({
    businessId: scope.businessId,
    userId: scope.userId,
    action: "import.delete_event_data",
    entityType: "Event",
    entityId: eventId,
    diff: { event: ev.name, salesDeleted: salesDeleted.count, itemsDeleted: itemsDeleted.count },
  });
  revalidatePath("/settings/integrations");
  revalidatePath("/dashboard");
  return { salesDeleted: salesDeleted.count, itemsDeleted: itemsDeleted.count };
}

// Nuclear option — wipe ALL imported sales at this location. Used when the
// operator wants to "re-enter everything" from scratch.
export async function deleteAllImportedAction() {
  await requireOwner();
  const scope = await getScope();

  const [salesDeleted, itemsDeleted] = await prisma.$transaction([
    prisma.dailySales.deleteMany({ where: { locationId: scope.locationId } }),
    prisma.salesItem.deleteMany({ where: { locationId: scope.locationId } }),
  ]);

  await writeAudit({
    businessId: scope.businessId,
    userId: scope.userId,
    action: "import.delete_all",
    entityType: "DailySales",
    diff: { locationId: scope.locationId, salesDeleted: salesDeleted.count, itemsDeleted: itemsDeleted.count },
  });
  revalidatePath("/settings/integrations");
  revalidatePath("/dashboard");
  return { salesDeleted: salesDeleted.count, itemsDeleted: itemsDeleted.count };
}
