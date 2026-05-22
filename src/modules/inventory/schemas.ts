import { z } from "zod";

export const ingredientSchema = z.object({
  name: z.string().min(1),
  sku: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  unit: z.string().min(1),
  parLevel: z.coerce.number().min(0),
  reorderPoint: z.coerce.number().min(0),
  reorderQty: z.coerce.number().min(0),
  supplierId: z.string().optional().nullable(),
  lastCostDollars: z.coerce.number().min(0),
});

export const countLineSchema = z.object({
  ingredientId: z.string(),
  qtyCounted: z.coerce.number().min(0),
});

export const newCountSchema = z.object({
  type: z.enum(["OPEN", "MID", "CLOSE", "WEEKLY"]).default("WEEKLY"),
  notes: z.string().optional().nullable(),
  lines: z.array(countLineSchema).min(1),
});

export const wasteSchema = z.object({
  ingredientId: z.string(),
  qty: z.coerce.number().positive(),
  note: z.string().optional().nullable(),
});
