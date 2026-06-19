import { z } from "zod";

export const capitalAssetSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().optional().nullable(),
  vendor: z.string().optional().nullable(),
  purchaseDate: z.string().min(1, "Purchase date is required"),
  purchasePriceDollars: z.coerce.number().min(0, "Must be ≥ 0"),
  usefulLifeMonths: z.coerce.number().int().min(0).optional().nullable(),
  salvageValueDollars: z.coerce.number().min(0).default(0),
  status: z.enum(["IN_SERVICE", "SOLD", "WRITTEN_OFF"]).default("IN_SERVICE"),
  notes: z.string().optional().nullable(),
  eventId: z.string().optional().nullable(),
});

export const CAPITAL_CATEGORIES = [
  "Beverage equipment",
  "Refrigeration",
  "Cooking equipment",
  "POS / electronics",
  "Furniture",
  "Display",
  "Tent / structure",
  "Vehicle",
  "Other",
] as const;
