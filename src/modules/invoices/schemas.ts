import { z } from "zod";

export const createInvoiceSchema = z.object({
  supplierId: z.string().min(1, "Pick a supplier"),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  invoiceDate: z.string().min(1),
  dateReceived: z.string().min(1),
  internalMemo: z.string().optional().nullable(),
  poId: z.string().optional().nullable(),
});

export const updateInvoiceTotalsSchema = z.object({
  gstDollars: z.coerce.number().min(0).default(0),
  pstDollars: z.coerce.number().min(0).default(0),
  shippingDollars: z.coerce.number().min(0).default(0),
  rebateDollars: z.coerce.number().min(0).default(0),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.string().min(1),
  dateReceived: z.string().min(1),
  internalMemo: z.string().optional().nullable(),
});

export const addInvoiceItemSchema = z.object({
  ingredientId: z.string(),
  qty: z.coerce.number().positive(),
  unitCostDollars: z.coerce.number().min(0),
});
