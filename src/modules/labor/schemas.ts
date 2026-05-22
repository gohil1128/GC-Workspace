import { z } from "zod";

export const employeeSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().optional().or(z.literal("")),
  position: z.string().min(1),
  hourlyRateDollars: z.coerce.number().min(0),
  isActive: z.coerce.boolean().default(true),
});

export const shiftSchema = z.object({
  employeeId: z.string(),
  position: z.string().min(1),
  start: z.string(), // ISO
  end: z.string(),
  notes: z.string().optional().nullable(),
});
