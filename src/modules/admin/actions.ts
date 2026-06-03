"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { requireOwner } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

/**
 * Wipe all operational data for the current business: ingredients, suppliers,
 * recipes, employees, sales, counts, movements, POs, invoices, expenses,
 * vendors, events, shifts, cash, deposits, report snapshots. Keeps: users,
 * locations, business itself, audit log.
 *
 * Order matters — children must be deleted before parents because most FKs
 * are NoAction by default (not Cascade). The transaction guarantees we
 * either wipe everything or nothing.
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

  try {
    await prisma.$transaction([
      // Leaf-level transactional records first
      prisma.timeEntry.deleteMany({ where: { shift: { locationId: { in: locationIds } } } }),
      prisma.shift.deleteMany({ where: { locationId: { in: locationIds } } }),

      // Invoices reference Supplier (no cascade) — must clear before suppliers
      prisma.invoiceItem.deleteMany({ where: { invoice: { locationId: { in: locationIds } } } }),
      prisma.invoice.deleteMany({ where: { locationId: { in: locationIds } } }),

      // PO items then POs
      prisma.purchaseOrderItem.deleteMany({ where: { purchaseOrder: { locationId: { in: locationIds } } } }),
      prisma.purchaseOrder.deleteMany({ where: { locationId: { in: locationIds } } }),

      // Counts + movements
      prisma.inventoryCountLine.deleteMany({ where: { count: { locationId: { in: locationIds } } } }),
      prisma.inventoryCount.deleteMany({ where: { locationId: { in: locationIds } } }),
      prisma.inventoryMovement.deleteMany({ where: { locationId: { in: locationIds } } }),

      // Cash + deposits + sales — reference Event (no cascade) so must clear before events
      prisma.cashClose.deleteMany({ where: { locationId: { in: locationIds } } }),
      prisma.deposit.deleteMany({ where: { locationId: { in: locationIds } } }),
      prisma.dailySales.deleteMany({ where: { locationId: { in: locationIds } } }),
      prisma.reportSnapshot.deleteMany({ where: { businessId: scope.businessId } }),

      // Expenses reference Vendor (SET NULL) and Event (NoAction) — clear before both
      prisma.expense.deleteMany({ where: { businessId: scope.businessId } }),

      // Recipes
      prisma.recipeIngredient.deleteMany({ where: { recipe: { businessId: scope.businessId } } }),
      prisma.recipe.deleteMany({ where: { businessId: scope.businessId } }),

      // Ingredients (unit conversions cascade on ingredient delete, but be explicit)
      prisma.unitConversion.deleteMany({ where: { ingredient: { businessId: scope.businessId } } }),
      prisma.ingredient.deleteMany({ where: { businessId: scope.businessId } }),

      // Now safe to drop the rest
      prisma.vendor.deleteMany({ where: { businessId: scope.businessId } }),
      prisma.supplier.deleteMany({ where: { businessId: scope.businessId } }),
      prisma.employee.deleteMany({ where: { businessId: scope.businessId } }),
      prisma.event.deleteMany({ where: { businessId: scope.businessId } }),
    ]);
  } catch (err: any) {
    // Surface a usable error message to the client — the dialog shows it.
    const reason = err?.message ?? String(err);
    throw new Error(`Could not wipe data: ${reason.split("\n")[0]}`);
  }

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
  ebitdaMultiplier: z.coerce.number().min(0).max(50).default(4),
  revenueMultiplier: z.coerce.number().min(0).max(20).default(1.5),
});

export async function updateBusinessAction(formData: FormData) {
  await requireOwner();
  const scope = await getScope();
  const parsed = businessSchema.parse({
    name: formData.get("name"),
    foodTargetPct: formData.get("foodTargetPct"),
    laborTargetPct: formData.get("laborTargetPct"),
    ebitdaMultiplier: formData.get("ebitdaMultiplier"),
    revenueMultiplier: formData.get("revenueMultiplier"),
  });
  await prisma.business.update({
    where: { id: scope.businessId },
    data: {
      name: parsed.name,
      foodTargetPct: parsed.foodTargetPct,
      laborTargetPct: parsed.laborTargetPct,
      ebitdaMultiplier: parsed.ebitdaMultiplier,
      revenueMultiplier: parsed.revenueMultiplier,
    },
  });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "business.update", entityType: "Business", entityId: scope.businessId, diff: { name: parsed.name } });
  revalidatePath("/", "layout");
}
