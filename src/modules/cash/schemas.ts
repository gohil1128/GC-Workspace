import { z } from "zod";

export const cashCloseSchema = z.object({
  businessDate: z.string(),
  openingDollars: z.coerce.number().min(0),
  closingDollars: z.coerce.number().min(0),
  safeCountDollars: z.coerce.number().min(0).default(0),
  depositDollars: z.coerce.number().min(0).default(0),
  paidInDollars: z.coerce.number().min(0).default(0),
  paidOutDollars: z.coerce.number().min(0).default(0),
  expectedDollars: z.coerce.number().min(0),
  checklist: z.array(z.object({ label: z.string(), done: z.boolean() })).default([]),
  notes: z.string().optional().nullable(),
});
