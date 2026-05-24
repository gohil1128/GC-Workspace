"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { requireOwner } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

/**
 * Wipe all operational data for the current business: ingredients, suppliers,
 * recipes, employees, sales, counts, movements, POs, shifts, cash, deposits,
 * report snapshots. Keeps: users, locations, business itself, audit log.
 *
 * Owner-only. Confirmation enforced on the client.
 */
export async function wipeBusinessDataAction() {
  await requireOwner();
  const scope = await getScope();

  const locationIds = (
    await prisma.location.findMany({
      where: { businessId: scope.businessId },
      select: { id: true },
    })
  ).map((l) => l.id);

  await prisma.$transaction([
    // Transactional records (scoped by location)
    prisma.timeEntry.deleteMany({ where: { shift: { locationId: { in: locationIds } } } }),
    prisma.shift.deleteMany({ where: { locationId: { in: locationIds } } }),
    prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { locationId: { in: locationIds } } } }),
    prisma.purchaseOrder.deleteMany({ where: { locationId: { in: locationIds } } }),
    prisma.inventoryCountLine.deleteMany({ where: { count: { locationId: { in: locationIds } } } }),
    prisma.inventoryCount.deleteMany({ where: { locationId: { in: locationIds } } }),
    prisma.inventoryMovement.deleteMany({ where: { locationId: { in: locationIds } } }),
    prisma.cashClose.deleteMany({ where: { locationId: { in: locationIds } } }),
    prisma.deposit.deleteMany({ where: { locationId: { in: locationIds } } }),
    prisma.dailySales.deleteMany({ where: { locationId: { in: locationIds } } }),
    prisma.reportSnapshot.deleteMany({ where: { businessId: scope.businessId } }),

    // Master data (scoped by business)
    prisma.recipeIngredient.deleteMany({ where: { recipe: { businessId: scope.businessId } } }),
    prisma.recipe.deleteMany({ where: { businessId: scope.businessId } }),
    prisma.unitConversion.deleteMany({ where: { ingredient: { businessId: scope.businessId } } }),
    prisma.ingredient.deleteMany({ where: { businessId: scope.businessId } }),
    prisma.supplier.deleteMany({ where: { businessId: scope.businessId } }),
    prisma.employee.deleteMany({ where: { businessId: scope.businessId } }),
  ]);

  await writeAudit({
    businessId: scope.businessId,
    userId: scope.userId,
    action: "business.wipe",
    entityType: "Business",
    entityId: scope.businessId,
    diff: { wipedLocations: locationIds.length },
  });

  revalidatePath("/", "layout");
}

const businessSchema = z.object({
  name: z.string().min(1, "Name is required"),
  foodTargetPct: z.coerce.number().int().min(0).max(100),
  laborTargetPct: z.coerce.number().int().min(0).max(100),
});

export async function updateBusinessAction(formData: FormData) {
  await requireOwner();
  const scope = await getScope();
  const parsed = businessSchema.parse({
    name: formData.get("name"),
    foodTargetPct: formData.get("foodTargetPct"),
    laborTargetPct: formData.get("laborTargetPct"),
  });
  await prisma.business.update({
    where: { id: scope.businessId },
    data: { name: parsed.name, foodTargetPct: parsed.foodTargetPct, laborTargetPct: parsed.laborTargetPct },
  });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "business.update", entityType: "Business", entityId: scope.businessId, diff: { name: parsed.name } });
  revalidatePath("/", "layout");
}
