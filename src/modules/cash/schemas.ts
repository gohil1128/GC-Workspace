import { z } from "zod";

export const cashCloseSchema = z.object({
  businessDate: z.string(),
  openingDollars: z.coerce.number().min(0),
  closingDollars: z.coerce.number().min(0),
  cashDollars: z.coerce.number().min(0).default(0),
  creditDollars: z.coerce.number().min(0).default(0),
  safeCountDollars: z.coerce.number().min(0).default(0),
  depositDollars: z.coerce.number().min(0).default(0),
  paidInDollars: z.coerce.number().min(0).default(0),
  paidOutDollars: z.coerce.number().min(0).default(0),
  expectedDollars: z.coerce.number().min(0),
  weather: z.string().optional().nullable(),
  specialEvents: z.string().optional().nullable(),
  eventId: z.string().optional().nullable(),
  checklist: z.array(z.object({ label: z.string(), done: z.boolean() })).default([]),
  notes: z.string().optional().nullable(),
});

export const depositSchema = z.object({
  businessDate: z.string(),
  amountDollars: z.coerce.number().positive(),
  sequence: z.coerce.number().int().optional().nullable(),
  bagCode: z.string().optional().nullable(),
  preparedBy: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const verifyCloseSchema = z.object({
  closeId: z.string(),
});
