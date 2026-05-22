"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { writeAudit } from "@/lib/audit";
import { toCents } from "@/lib/money";
import { ingredientSchema, newCountSchema, wasteSchema } from "./schemas";

export async function createIngredientAction(formData: FormData) {
  const scope = await getScope();
  const parsed = ingredientSchema.parse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    category: formData.get("category"),
    unit: formData.get("unit"),
    parLevel: formData.get("parLevel"),
    reorderPoint: formData.get("reorderPoint"),
    reorderQty: formData.get("reorderQty"),
    supplierId: formData.get("supplierId") || null,
    lastCostDollars: formData.get("lastCostDollars"),
  });
  const created = await prisma.ingredient.create({
    data: {
      businessId: scope.businessId,
      name: parsed.name,
      sku: parsed.sku || null,
      category: parsed.category || null,
      unit: parsed.unit,
      parLevel: parsed.parLevel,
      reorderPoint: parsed.reorderPoint,
      reorderQty: parsed.reorderQty,
      supplierId: parsed.supplierId || null,
      lastCostCents: toCents(parsed.lastCostDollars),
      avgCostCents: toCents(parsed.lastCostDollars),
    },
  });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "ingredient.create", entityType: "Ingredient", entityId: created.id, diff: { name: created.name } });
  revalidatePath("/inventory");
  return { ok: true, id: created.id };
}

export async function updateIngredientAction(id: string, formData: FormData) {
  const scope = await getScope();
  const parsed = ingredientSchema.parse({
    name: formData.get("name"),
    sku: formData.get("sku"),
    category: formData.get("category"),
    unit: formData.get("unit"),
    parLevel: formData.get("parLevel"),
    reorderPoint: formData.get("reorderPoint"),
    reorderQty: formData.get("reorderQty"),
    supplierId: formData.get("supplierId") || null,
    lastCostDollars: formData.get("lastCostDollars"),
  });
  const existing = await prisma.ingredient.findFirst({ where: { id, businessId: scope.businessId } });
  if (!existing) throw new Error("Not found");
  await prisma.ingredient.update({
    where: { id },
    data: {
      name: parsed.name,
      sku: parsed.sku || null,
      category: parsed.category || null,
      unit: parsed.unit,
      parLevel: parsed.parLevel,
      reorderPoint: parsed.reorderPoint,
      reorderQty: parsed.reorderQty,
      supplierId: parsed.supplierId || null,
      lastCostCents: toCents(parsed.lastCostDollars),
    },
  });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "ingredient.update", entityType: "Ingredient", entityId: id });
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${id}`);
  return { ok: true };
}

export async function saveCountAction(formData: FormData) {
  const scope = await getScope();
  const raw = JSON.parse(String(formData.get("payload") ?? "{}"));
  const parsed = newCountSchema.parse(raw);

  const ingredients = await prisma.ingredient.findMany({
    where: { businessId: scope.businessId, id: { in: parsed.lines.map((l) => l.ingredientId) } },
  });
  const ingMap = new Map(ingredients.map((i) => [i.id, i]));

  const count = await prisma.$transaction(async (tx) => {
    const c = await tx.inventoryCount.create({
      data: {
        locationId: scope.locationId,
        type: parsed.type,
        countedById: scope.userId,
        notes: parsed.notes ?? null,
      },
    });

    for (const line of parsed.lines) {
      const ing = ingMap.get(line.ingredientId);
      if (!ing) continue;
      const theoretical = ing.onHand;
      const variance = line.qtyCounted - theoretical;
      const varianceCostCents = Math.round(variance * ing.avgCostCents);
      await tx.inventoryCountLine.create({
        data: {
          countId: c.id,
          ingredientId: ing.id,
          qtyCounted: line.qtyCounted,
          unit: ing.unit,
          theoreticalQty: theoretical,
          varianceQty: variance,
          varianceCostCents,
        },
      });
      // reconcile: write COUNT_RECONCILE movement and update onHand
      await tx.inventoryMovement.create({
        data: {
          locationId: scope.locationId,
          ingredientId: ing.id,
          type: "COUNT_RECONCILE",
          qty: variance,
          unit: ing.unit,
          unitCostCents: ing.avgCostCents,
          sourceType: "COUNT",
          sourceId: c.id,
        },
      });
      await tx.ingredient.update({
        where: { id: ing.id },
        data: { onHand: line.qtyCounted },
      });
    }
    return c;
  });

  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "count.create", entityType: "InventoryCount", entityId: count.id });
  revalidatePath("/inventory/variance");
  revalidatePath("/inventory/counts");
  revalidatePath("/inventory");
  redirect(`/inventory/variance`);
}

export async function recordWasteAction(formData: FormData) {
  const scope = await getScope();
  const parsed = wasteSchema.parse({
    ingredientId: formData.get("ingredientId"),
    qty: formData.get("qty"),
    note: formData.get("note"),
  });
  const ing = await prisma.ingredient.findFirst({ where: { id: parsed.ingredientId, businessId: scope.businessId } });
  if (!ing) throw new Error("Not found");
  await prisma.$transaction([
    prisma.inventoryMovement.create({
      data: {
        locationId: scope.locationId,
        ingredientId: ing.id,
        type: "WASTE",
        qty: -parsed.qty,
        unit: ing.unit,
        unitCostCents: ing.avgCostCents,
        sourceType: "WASTE",
        note: parsed.note ?? null,
      },
    }),
    prisma.ingredient.update({
      where: { id: ing.id },
      data: { onHand: { decrement: parsed.qty } },
    }),
  ]);
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "waste.record", entityType: "Ingredient", entityId: ing.id, diff: { qty: parsed.qty } });
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${ing.id}`);
  return { ok: true };
}
