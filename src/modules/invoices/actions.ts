"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { writeAudit } from "@/lib/audit";
import { toCents } from "@/lib/money";
import { newAvgCostCents } from "@/modules/inventory/costing";
import { createInvoiceSchema, updateInvoiceTotalsSchema, addInvoiceItemSchema } from "./schemas";

async function recomputeInvoiceTotals(tx: any, invoiceId: string) {
  const items = await tx.invoiceItem.findMany({ where: { invoiceId } });
  const inv = await tx.invoice.findUnique({ where: { id: invoiceId } });
  if (!inv) return;
  // Line items take over the subtotal when present; a totals-only invoice
  // (no items) keeps its manually entered subtotal.
  const subtotal = items.length > 0
    ? items.reduce((a: number, it: any) => a + it.lineTotalCents, 0)
    : inv.subtotalCents;
  const total = subtotal + inv.gstCents + inv.pstCents + inv.shippingCents - inv.rebateCents;
  await tx.invoice.update({
    where: { id: invoiceId },
    data: { subtotalCents: subtotal, totalCents: total },
  });
}

// Data-URL guard for invoice attachments: an image (client compresses first)
// or a PDF, capped so a giant file can't blow up the row size.
const MAX_IMAGE_DATAURL_CHARS = 3_000_000; // ~2.2 MB binary
const MAX_PDF_DATAURL_CHARS = 6_000_000; // ~4.4 MB binary
function validateImageDataUrl(raw: unknown): string | null {
  const s = typeof raw === "string" ? raw.trim() : "";
  if (!s) return null;
  if (s.startsWith("data:application/pdf")) {
    if (s.length > MAX_PDF_DATAURL_CHARS) throw new Error("PDF too large — keep it under 4 MB");
    return s;
  }
  if (!s.startsWith("data:image/")) throw new Error("Attachment must be an image or a PDF");
  if (s.length > MAX_IMAGE_DATAURL_CHARS) throw new Error("Image too large — retake or crop the photo");
  return s;
}

export async function createInvoiceAction(formData: FormData) {
  const scope = await getScope();
  const parsed = createInvoiceSchema.parse({
    supplierId: formData.get("supplierId"),
    invoiceNumber: formData.get("invoiceNumber"),
    invoiceDate: formData.get("invoiceDate"),
    dateReceived: formData.get("dateReceived"),
    internalMemo: formData.get("internalMemo"),
    poId: formData.get("poId") || null,
    eventId: formData.get("eventId") || null,
    category: formData.get("category") || null,
    subtotalDollars: formData.get("subtotalDollars") || 0,
    gstDollars: formData.get("gstDollars") || 0,
    pstDollars: formData.get("pstDollars") || 0,
    imageDataUrl: formData.get("imageDataUrl") || null,
  });
  const appliesToAllEvents = parsed.eventId === "all";
  const eventId = parsed.eventId && parsed.eventId !== "none" && !appliesToAllEvents ? parsed.eventId : null;
  if (eventId) {
    const ev = await prisma.event.findFirst({ where: { id: eventId, businessId: scope.businessId } });
    if (!ev) throw new Error("Selected event not found");
  }
  const imageDataUrl = validateImageDataUrl(parsed.imageDataUrl);
  const subtotalCents = toCents(parsed.subtotalDollars);
  const gstCents = toCents(parsed.gstDollars);
  const pstCents = toCents(parsed.pstDollars);
  // Auto-generate a short internal reference when none is typed — keeps the
  // supplier+number uniqueness happy without asking the operator for one.
  const invoiceNumber =
    (parsed.invoiceNumber ?? "").trim() || `INV-${Date.now().toString(36).toUpperCase()}`;

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        locationId: scope.locationId,
        supplierId: parsed.supplierId,
        poId: parsed.poId || null,
        eventId,
        appliesToAllEvents,
        category: parsed.category?.trim() || null,
        invoiceNumber,
        invoiceDate: new Date(parsed.invoiceDate),
        dateReceived: new Date(parsed.dateReceived),
        internalMemo: parsed.internalMemo || null,
        imageDataUrl,
        subtotalCents,
        gstCents,
        pstCents,
        totalCents: subtotalCents + gstCents + pstCents,
        createdById: scope.userId,
      },
    });

    // Clone PO items if creating from PO
    if (parsed.poId) {
      const po = await tx.purchaseOrder.findFirst({
        where: { id: parsed.poId, locationId: scope.locationId },
        include: { items: true },
      });
      if (po) {
        for (const it of po.items) {
          await tx.invoiceItem.create({
            data: {
              invoiceId: inv.id,
              ingredientId: it.ingredientId,
              qty: it.qtyOrdered,
              unit: it.unit,
              unitCostCents: it.unitCostCents,
              lineTotalCents: it.lineTotalCents,
            },
          });
        }
        await recomputeInvoiceTotals(tx, inv.id);
      }
    }
    return inv;
  });

  await writeAudit({
    businessId: scope.businessId, userId: scope.userId,
    action: "invoice.create", entityType: "Invoice", entityId: invoice.id,
    diff: { number: invoice.invoiceNumber },
  });
  revalidatePath("/purchasing/invoices");
  redirect(`/purchasing/invoices/${invoice.id}`);
}

export async function updateInvoiceAction(id: string, formData: FormData) {
  const scope = await getScope();
  const parsed = updateInvoiceTotalsSchema.parse({
    invoiceNumber: formData.get("invoiceNumber"),
    invoiceDate: formData.get("invoiceDate"),
    dateReceived: formData.get("dateReceived"),
    internalMemo: formData.get("internalMemo"),
    subtotalDollars: formData.get("subtotalDollars") || 0,
    gstDollars: formData.get("gstDollars"),
    pstDollars: formData.get("pstDollars"),
    shippingDollars: formData.get("shippingDollars"),
    rebateDollars: formData.get("rebateDollars"),
    eventId: formData.get("eventId") || null,
    category: formData.get("category") || null,
  });
  const appliesToAllEvents = parsed.eventId === "all";
  const eventId = parsed.eventId && parsed.eventId !== "none" && !appliesToAllEvents ? parsed.eventId : null;
  if (eventId) {
    const ev = await prisma.event.findFirst({ where: { id: eventId, businessId: scope.businessId } });
    if (!ev) throw new Error("Selected event not found");
  }

  const inv = await prisma.invoice.findFirst({ where: { id, locationId: scope.locationId } });
  if (!inv) throw new Error("Not found");
  if (inv.closedAt) throw new Error("Invoice is closed");

  await prisma.$transaction(async (tx) => {
    await tx.invoice.update({
      where: { id },
      data: {
        invoiceNumber: (parsed.invoiceNumber ?? "").trim() || inv.invoiceNumber,
        invoiceDate: new Date(parsed.invoiceDate),
        dateReceived: new Date(parsed.dateReceived),
        internalMemo: parsed.internalMemo || null,
        eventId,
        appliesToAllEvents,
        category: parsed.category?.trim() || null,
        // Manual subtotal — recompute overrides it whenever line items exist.
        subtotalCents: toCents(parsed.subtotalDollars),
        gstCents: toCents(parsed.gstDollars),
        pstCents: toCents(parsed.pstDollars),
        shippingCents: toCents(parsed.shippingDollars),
        rebateCents: toCents(parsed.rebateDollars),
      },
    });
    await recomputeInvoiceTotals(tx, id);
  });

  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "invoice.update", entityType: "Invoice", entityId: id });
  revalidatePath("/purchasing/invoices");
  revalidatePath(`/purchasing/invoices/${id}`);
}

export async function addInvoiceItemAction(invoiceId: string, payload: unknown) {
  const scope = await getScope();
  const parsed = addInvoiceItemSchema.parse(payload);
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, locationId: scope.locationId } });
  if (!inv) throw new Error("Not found");
  if (inv.closedAt) throw new Error("Invoice is closed");

  const ing = await prisma.ingredient.findFirst({ where: { id: parsed.ingredientId, businessId: scope.businessId } });
  if (!ing) throw new Error("Ingredient not found");

  const unitCostCents = toCents(parsed.unitCostDollars);
  const lineTotalCents = Math.round(parsed.qty * unitCostCents);

  await prisma.$transaction(async (tx) => {
    await tx.invoiceItem.create({
      data: {
        invoiceId,
        ingredientId: ing.id,
        qty: parsed.qty,
        unit: ing.unit,
        unitCostCents,
        lineTotalCents,
      },
    });
    // Side-effect: invoice receipt → record purchase movement + update on-hand + weighted avg
    await tx.inventoryMovement.create({
      data: {
        locationId: scope.locationId,
        ingredientId: ing.id,
        type: "PURCHASE",
        qty: parsed.qty,
        unit: ing.unit,
        unitCostCents,
        sourceType: "INVOICE",
        sourceId: invoiceId,
      },
    });
    const newAvg = newAvgCostCents({
      currentOnHand: ing.onHand,
      currentAvgCostCents: ing.avgCostCents,
      receivedQty: parsed.qty,
      receivedUnitCostCents: unitCostCents,
    });
    await tx.ingredient.update({
      where: { id: ing.id },
      data: {
        onHand: { increment: parsed.qty },
        avgCostCents: newAvg,
        lastCostCents: unitCostCents,
      },
    });
    await recomputeInvoiceTotals(tx, invoiceId);
  });

  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "invoice.item.add", entityType: "Invoice", entityId: invoiceId, diff: { ingredient: ing.name, qty: parsed.qty } });
  revalidatePath(`/purchasing/invoices/${invoiceId}`);
  revalidatePath("/inventory");
}

export async function removeInvoiceItemAction(invoiceId: string, itemId: string) {
  const scope = await getScope();
  const inv = await prisma.invoice.findFirst({ where: { id: invoiceId, locationId: scope.locationId } });
  if (!inv) throw new Error("Not found");
  if (inv.closedAt) throw new Error("Invoice is closed");

  const item = await prisma.invoiceItem.findFirst({ where: { id: itemId, invoiceId }, include: { ingredient: true } });
  if (!item) throw new Error("Item not found");

  await prisma.$transaction(async (tx) => {
    // Reverse the receipt: subtract from on-hand and write a reversal movement
    await tx.inventoryMovement.create({
      data: {
        locationId: scope.locationId,
        ingredientId: item.ingredientId,
        type: "ADJUSTMENT",
        qty: -item.qty,
        unit: item.unit,
        unitCostCents: item.unitCostCents,
        sourceType: "INVOICE_REVERSAL",
        sourceId: invoiceId,
        note: `Reversal of invoice item ${itemId.slice(-6)}`,
      },
    });
    await tx.ingredient.update({
      where: { id: item.ingredientId },
      data: { onHand: { decrement: item.qty } },
    });
    await tx.invoiceItem.delete({ where: { id: itemId } });
    await recomputeInvoiceTotals(tx, invoiceId);
  });

  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "invoice.item.remove", entityType: "Invoice", entityId: invoiceId, diff: { ingredient: item.ingredient.name } });
  revalidatePath(`/purchasing/invoices/${invoiceId}`);
  revalidatePath("/inventory");
}

// Lightweight event tag for an existing invoice — works even on closed
// invoices, since tagging doesn't change line items or totals.
export async function setInvoiceEventAction(id: string, eventIdRaw: string | null) {
  const scope = await getScope();
  const inv = await prisma.invoice.findFirst({ where: { id, locationId: scope.locationId } });
  if (!inv) throw new Error("Not found");
  const appliesToAllEvents = eventIdRaw === "all";
  const eventId = eventIdRaw && eventIdRaw !== "none" && !appliesToAllEvents ? eventIdRaw : null;
  if (eventId) {
    const ev = await prisma.event.findFirst({ where: { id: eventId, businessId: scope.businessId } });
    if (!ev) throw new Error("Selected event not found");
  }
  await prisma.invoice.update({ where: { id }, data: { eventId, appliesToAllEvents } });
  await writeAudit({
    businessId: scope.businessId, userId: scope.userId,
    action: "invoice.set_event", entityType: "Invoice", entityId: id,
    diff: { eventId },
  });
  revalidatePath("/purchasing/invoices");
  revalidatePath(`/purchasing/invoices/${id}`);
}

// Lightweight category tag for an existing invoice — same instant-save
// pattern as the event tagger, works on closed invoices.
export async function setInvoiceCategoryAction(id: string, categoryRaw: string | null) {
  const scope = await getScope();
  const inv = await prisma.invoice.findFirst({ where: { id, locationId: scope.locationId } });
  if (!inv) throw new Error("Not found");
  const category = categoryRaw?.trim() || null;
  await prisma.invoice.update({ where: { id }, data: { category } });
  await writeAudit({
    businessId: scope.businessId, userId: scope.userId,
    action: "invoice.set_category", entityType: "Invoice", entityId: id,
    diff: { category },
  });
  revalidatePath("/purchasing/invoices");
  revalidatePath(`/purchasing/invoices/${id}`);
}

// Attach, replace, or remove (null) the invoice photo. Allowed on closed
// invoices too — a photo is documentation, not a financial edit.
export async function setInvoiceImageAction(id: string, dataUrl: string | null) {
  const scope = await getScope();
  const inv = await prisma.invoice.findFirst({ where: { id, locationId: scope.locationId } });
  if (!inv) throw new Error("Not found");
  const imageDataUrl = validateImageDataUrl(dataUrl);
  await prisma.invoice.update({ where: { id }, data: { imageDataUrl } });
  await writeAudit({
    businessId: scope.businessId, userId: scope.userId,
    action: imageDataUrl ? "invoice.image.attach" : "invoice.image.remove",
    entityType: "Invoice", entityId: id,
  });
  revalidatePath(`/purchasing/invoices/${id}`);
}

export async function closeInvoiceAction(id: string) {
  const scope = await getScope();
  const inv = await prisma.invoice.findFirst({ where: { id, locationId: scope.locationId } });
  if (!inv) throw new Error("Not found");
  await prisma.invoice.update({
    where: { id },
    data: { closedAt: inv.closedAt ? null : new Date() },
  });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: inv.closedAt ? "invoice.reopen" : "invoice.close", entityType: "Invoice", entityId: id });
  revalidatePath(`/purchasing/invoices/${id}`);
  revalidatePath("/purchasing/invoices");
}

export async function deleteInvoiceAction(id: string) {
  const scope = await getScope();
  const inv = await prisma.invoice.findFirst({
    where: { id, locationId: scope.locationId },
    include: { items: true },
  });
  if (!inv) throw new Error("Not found");

  await prisma.$transaction(async (tx) => {
    // Reverse all on-hand impacts from this invoice's items
    for (const item of inv.items) {
      await tx.inventoryMovement.create({
        data: {
          locationId: scope.locationId,
          ingredientId: item.ingredientId,
          type: "ADJUSTMENT",
          qty: -item.qty,
          unit: item.unit,
          unitCostCents: item.unitCostCents,
          sourceType: "INVOICE_DELETE",
          sourceId: id,
          note: `Reversal: invoice ${inv.invoiceNumber} deleted`,
        },
      });
      await tx.ingredient.update({
        where: { id: item.ingredientId },
        data: { onHand: { decrement: item.qty } },
      });
    }
    // InvoiceItem cascades on Invoice delete
    await tx.invoice.delete({ where: { id } });
  });

  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "invoice.delete", entityType: "Invoice", entityId: id, diff: { number: inv.invoiceNumber } });
  revalidatePath("/purchasing/invoices");
  revalidatePath("/inventory");
}
