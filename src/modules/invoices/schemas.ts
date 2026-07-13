import { z } from "zod";

export const createInvoiceSchema = z.object({
  supplierId: z.string().min(1, "Pick a supplier"),
  // Optional — a short reference is auto-generated when omitted. The photo is
  // the real document for a small operation.
  invoiceNumber: z.string().optional().nullable(),
  invoiceDate: z.string().min(1),
  dateReceived: z.string().min(1),
  internalMemo: z.string().optional().nullable(),
  poId: z.string().optional().nullable(),
  eventId: z.string().optional().nullable(),
  // Totals-only entry: the bill amount before taxes plus taxes. Line items are
  // optional — when added later they take over the subtotal.
  subtotalDollars: z.coerce.number().min(0).default(0),
  gstDollars: z.coerce.number().min(0).default(0),
  pstDollars: z.coerce.number().min(0).default(0),
  imageDataUrl: z.string().optional().nullable(),
});

export const updateInvoiceTotalsSchema = z.object({
  subtotalDollars: z.coerce.number().min(0).default(0),
  gstDollars: z.coerce.number().min(0).default(0),
  pstDollars: z.coerce.number().min(0).default(0),
  shippingDollars: z.coerce.number().min(0).default(0),
  rebateDollars: z.coerce.number().min(0).default(0),
  invoiceNumber: z.string().optional().nullable(),
  invoiceDate: z.string().min(1),
  dateReceived: z.string().min(1),
  internalMemo: z.string().optional().nullable(),
  eventId: z.string().optional().nullable(),
});

export const addInvoiceItemSchema = z.object({
  ingredientId: z.string(),
  qty: z.coerce.number().positive(),
  unitCostDollars: z.coerce.number().min(0),
});
