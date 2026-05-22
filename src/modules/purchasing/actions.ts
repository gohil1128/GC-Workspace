"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { writeAudit } from "@/lib/audit";
import { toCents } from "@/lib/money";
import { newAvgCostCents } from "@/modules/inventory/costing";
import { newPoSchema, receivePoSchema, supplierSchema } from "./schemas";

export async function createSupplierAction(formData: FormData) {
  const scope = await getScope();
  const parsed = supplierSchema.parse({
    name: formData.get("name"),
    email: formData.get("email") || "",
    phone: formData.get("phone"),
    terms: formData.get("terms"),
    leadTimeDays: formData.get("leadTimeDays"),
  });
  const s = await prisma.supplier.create({
    data: {
      businessId: scope.businessId,
      name: parsed.name,
      email: parsed.email || null,
      phone: parsed.phone || null,
      terms: parsed.terms || null,
      leadTimeDays: parsed.leadTimeDays,
    },
  });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "supplier.create", entityType: "Supplier", entityId: s.id });
  revalidatePath("/purchasing/suppliers");
}

export async function createPoAction(payload: unknown) {
  const scope = await getScope();
  const parsed = newPoSchema.parse(payload);
  const subtotalCents = parsed.items.reduce((a, it) => a + Math.round(it.qtyOrdered * toCents(it.unitCostDollars)), 0);
  const po = await prisma.purchaseOrder.create({
    data: {
      locationId: scope.locationId,
      supplierId: parsed.supplierId,
      status: "DRAFT",
      expectedAt: parsed.expectedAt ? new Date(parsed.expectedAt) : null,
      notes: parsed.notes ?? null,
      subtotalCents,
      totalCents: subtotalCents,
      createdById: scope.userId,
      items: {
        create: parsed.items.map((it) => ({
          ingredientId: it.ingredientId,
          qtyOrdered: it.qtyOrdered,
          unit: it.unit,
          unitCostCents: toCents(it.unitCostDollars),
          lineTotalCents: Math.round(it.qtyOrdered * toCents(it.unitCostDollars)),
        })),
      },
    },
  });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "po.create", entityType: "PurchaseOrder", entityId: po.id });
  revalidatePath("/purchasing");
  redirect(`/purchasing/${po.id}`);
}

export async function setPoStatusAction(poId: string, status: "DRAFT" | "SENT" | "CANCELLED") {
  const scope = await getScope();
  const po = await prisma.purchaseOrder.findFirst({ where: { id: poId, locationId: scope.locationId } });
  if (!po) throw new Error("Not found");
  await prisma.purchaseOrder.update({ where: { id: poId }, data: { status } });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "po.status", entityType: "PurchaseOrder", entityId: poId, diff: { status } });
  revalidatePath("/purchasing");
  revalidatePath(`/purchasing/${poId}`);
}

export async function receivePoAction(poId: string, payload: unknown) {
  const scope = await getScope();
  const parsed = receivePoSchema.parse(payload);
  const po = await prisma.purchaseOrder.findFirst({
    where: { id: poId, locationId: scope.locationId },
    include: { items: { include: { ingredient: true } } },
  });
  if (!po) throw new Error("Not found");

  await prisma.$transaction(async (tx) => {
    for (const r of parsed.receipts) {
      const item = po.items.find((i) => i.id === r.itemId);
      if (!item) continue;
      if (r.qtyReceived <= 0) continue;

      await tx.purchaseOrderItem.update({
        where: { id: item.id },
        data: { qtyReceived: { increment: r.qtyReceived } },
      });

      await tx.inventoryMovement.create({
        data: {
          locationId: scope.locationId,
          ingredientId: item.ingredientId,
          type: "PURCHASE",
          qty: r.qtyReceived,
          unit: item.unit,
          unitCostCents: item.unitCostCents,
          sourceType: "PO",
          sourceId: po.id,
        },
      });

      const ing = item.ingredient;
      const newAvg = newAvgCostCents({
        currentOnHand: ing.onHand,
        currentAvgCostCents: ing.avgCostCents,
        receivedQty: r.qtyReceived,
        receivedUnitCostCents: item.unitCostCents,
      });
      await tx.ingredient.update({
        where: { id: ing.id },
        data: {
          onHand: { increment: r.qtyReceived },
          avgCostCents: newAvg,
          lastCostCents: item.unitCostCents,
        },
      });
    }

    // mark RECEIVED if all items fully received
    const refreshed = await tx.purchaseOrderItem.findMany({ where: { poId: po.id } });
    const allReceived = refreshed.every((i) => i.qtyReceived >= i.qtyOrdered);
    await tx.purchaseOrder.update({
      where: { id: po.id },
      data: {
        status: allReceived ? "RECEIVED" : po.status === "DRAFT" ? "SENT" : po.status,
        receivedAt: allReceived ? new Date() : po.receivedAt,
      },
    });
  });

  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "po.receive", entityType: "PurchaseOrder", entityId: po.id });
  revalidatePath("/purchasing");
  revalidatePath("/inventory");
  revalidatePath(`/purchasing/${po.id}`);
}
