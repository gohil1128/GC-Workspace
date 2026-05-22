import { z } from "zod";

export const recipeSchema = z.object({
  name: z.string().min(1),
  category: z.string().optional().nullable(),
  menuPriceDollars: z.coerce.number().min(0),
  yieldQty: z.coerce.number().min(0.0001),
  yieldUnit: z.string().min(1).default("ea"),
  isActive: z.coerce.boolean().default(true),
});

export const recipeIngredientSchema = z.object({
  ingredientId: z.string(),
  qty: z.coerce.number().min(0),
  unit: z.string().min(1),
});

export const updateBomSchema = z.object({
  items: z.array(recipeIngredientSchema),
});
