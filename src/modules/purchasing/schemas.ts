import { z } from "zod";

export const poItemSchema = z.object({
  ingredientId: z.string(),
  qtyOrdered: z.coerce.number().positive(),
  unit: z.string().min(1),
  unitCostDollars: z.coerce.number().min(0),
});

export const newPoSchema = z.object({
  supplierId: z.string(),
  expectedAt: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  items: z.array(poItemSchema).min(1),
});

export const receivePoSchema = z.object({
  receipts: z.array(z.object({ itemId: z.string(), qtyReceived: z.coerce.number().min(0) })),
});

export const supplierSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().nullable(),
  terms: z.string().optional().nullable(),
  leadTimeDays: z.coerce.number().int().min(0).default(2),
});
