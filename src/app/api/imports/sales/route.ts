import { NextResponse } from "next/server";
import { z } from "zod";
import { getScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/csv";
import { startOfDay } from "@/lib/date";
import { toCents } from "@/lib/money";
import { writeAudit } from "@/lib/audit";

const rowSchema = z.object({
  date: z.string(),
  net_sales: z.string(),
  tax: z.string().optional(),
  guests: z.string().optional(),
});

export async function POST(req: Request) {
  const scope = await getScope();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "missing file" }, { status: 400 });
  const text = await file.text();
  const rawRows = parseCsv(text);
  let created = 0;
  let updated = 0;
  let errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rawRows.length; i++) {
    const parsed = rowSchema.safeParse(rawRows[i]);
    if (!parsed.success) {
      errors.push({ row: i + 2, reason: parsed.error.issues[0]?.message ?? "invalid" });
      continue;
    }
    const businessDate = startOfDay(new Date(parsed.data.date));
    if (isNaN(businessDate.getTime())) {
      errors.push({ row: i + 2, reason: "bad date" });
      continue;
    }
    const data = {
      locationId: scope.locationId,
      businessDate,
      netSalesCents: toCents(parsed.data.net_sales),
      taxCents: toCents(parsed.data.tax ?? "0"),
      guestCount: Number(parsed.data.guests ?? "0") || 0,
      source: "CSV" as const,
    };
    const existing = await prisma.dailySales.findUnique({
      where: { locationId_businessDate: { locationId: scope.locationId, businessDate } },
    });
    if (existing) {
      await prisma.dailySales.update({ where: { id: existing.id }, data });
      updated++;
    } else {
      await prisma.dailySales.create({ data });
      created++;
    }
  }

  await writeAudit({
    businessId: scope.businessId,
    userId: scope.userId,
    action: "sales.import",
    entityType: "DailySales",
    diff: { created, updated, errorCount: errors.length },
  });

  return NextResponse.json({ created, updated, errors });
}
