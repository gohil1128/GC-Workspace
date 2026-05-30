import { z } from "zod";

export const expenseSchema = z.object({
  category: z.enum(["RENT", "UTILITIES", "MARKETING", "INSURANCE", "EQUIPMENT", "REPAIRS", "ADMIN", "OTHER"]),
  businessDate: z.string().min(1),
  amountDollars: z.coerce.number().positive("Amount must be > 0"),
  description: z.string().optional().nullable(),
  eventId: z.string().optional().nullable(),
});
