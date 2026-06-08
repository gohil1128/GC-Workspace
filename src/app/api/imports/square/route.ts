import { NextResponse } from "next/server";
import { getScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/csv";
import { startOfDay } from "@/lib/date";
import { toCents } from "@/lib/money";
import { writeAudit } from "@/lib/audit";

// Tolerant matcher for column headers. Square's exports vary slightly by report
// type, country, and Square plan, so we look for any reasonable equivalent.
function findCol(row: Record<string, string>, candidates: string[]): string | null {
  const keys = Object.keys(row);
  for (const c of candidates) {
    const target = c.toLowerCase().replace(/[\s_-]/g, "");
    const found = keys.find((k) => k.toLowerCase().replace(/[\s_-]/g, "") === target);
    if (found) return found;
  }
  return null;
}

function parseMoney(raw: string | undefined): number {
  if (!raw) return 0;
  // Strip currency symbols, commas, parens (negative), spaces
  let s = String(raw).trim();
  const negative = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()\s$£€,]/g, "").replace(/^-/, "");
  const n = parseFloat(s);
  if (!isFinite(n)) return 0;
  return negative ? -n : n;
}

function parseInteger(raw: string | undefined): number {
  if (!raw) return 0;
  const s = String(raw).replace(/[,\s]/g, "");
  const n = parseInt(s, 10);
  return isFinite(n) ? n : 0;
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  // Try ISO first, then common US/UK formats
  const trimmed = raw.trim();
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
  if (isoMatch) return startOfDay(new Date(`${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`));
  // Square sometimes uses "Mar 15, 2026" or "15/03/2026" — let JS try
  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) return startOfDay(d);
  return null;
}

export async function POST(req: Request) {
  const scope = await getScope();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Missing CSV file" }, { status: 400 });
  const text = await file.text();
  const rows = parseCsv(text);
  // Optional event tag — applied to every imported row.
  const eventIdRaw = String(form.get("eventId") ?? "");
  const eventId = eventIdRaw && eventIdRaw !== "none" ? eventIdRaw : null;
  if (eventId) {
    const exists = await prisma.event.findFirst({ where: { id: eventId, businessId: scope.businessId } });
    if (!exists) return NextResponse.json({ error: "Selected event not found" }, { status: 400 });
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV looked empty" }, { status: 400 });
  }

  // Probe the first row to detect column mapping
  const sample = rows[0] as Record<string, string>;
  const dateCol = findCol(sample, ["Date", "date", "Day", "Business Date", "Transaction Date"]);
  // Prefer Net Sales (after refunds + discounts), fall back to Gross Sales
  const netCol = findCol(sample, ["Net Sales", "Net Total", "Net Amount", "net_sales"]);
  const grossCol = findCol(sample, ["Gross Sales", "Gross Total", "Gross Amount", "Total Sales", "Total"]);
  const taxCol = findCol(sample, ["Tax", "Sales Tax", "Taxes"]);
  const cashCol = findCol(sample, ["Cash", "Cash Sales"]);
  const cardCol = findCol(sample, ["Card", "Credit", "Card Sales", "Card Payments"]);
  // Each Square transaction counts as one guest — that's the closest signal
  // available without per-customer identity tracking.
  const guestsCol = findCol(sample, ["Guests", "Covers", "Transactions", "Order Count", "Txns", "Tickets"]);
  const tipsCol = findCol(sample, ["Tips", "Tip", "Gratuity", "Gratuities"]);

  if (!dateCol) {
    return NextResponse.json({
      error: "Could not find a Date column. Make sure your CSV has a column named Date.",
      detectedColumns: Object.keys(sample),
    }, { status: 400 });
  }
  if (!netCol && !grossCol) {
    return NextResponse.json({
      error: "Could not find a Net Sales or Gross Sales column.",
      detectedColumns: Object.keys(sample),
    }, { status: 400 });
  }

  let created = 0;
  let updated = 0;
  const errors: { row: number; reason: string }[] = [];

  // Track cash/card totals per date so we can also pre-fill cash close splits
  const cashByDate = new Map<string, { cashCents: number; cardCents: number }>();

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as Record<string, string>;
    const businessDate = parseDate(r[dateCol] ?? "");
    if (!businessDate) {
      errors.push({ row: i + 2, reason: `Bad date "${r[dateCol]}"` });
      continue;
    }
    const netDollars = netCol ? parseMoney(r[netCol]) : parseMoney(r[grossCol!]);
    const taxDollars = taxCol ? parseMoney(r[taxCol]) : 0;
    const tipsDollars = tipsCol ? parseMoney(r[tipsCol]) : 0;
    const guestCount = guestsCol ? parseInteger(r[guestsCol]) : 0;
    const data = {
      locationId: scope.locationId,
      businessDate,
      netSalesCents: toCents(netDollars),
      taxCents: toCents(taxDollars),
      tipsCents: toCents(tipsDollars),
      guestCount,
      eventId,
      source: "POS" as const,
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

    // Stash cash/card split if columns exist
    if (cashCol || cardCol) {
      const key = businessDate.toISOString();
      cashByDate.set(key, {
        cashCents: cashCol ? toCents(parseMoney(r[cashCol])) : 0,
        cardCents: cardCol ? toCents(parseMoney(r[cardCol])) : 0,
      });
    }
  }

  // If cash/card data was present, upsert today's CashClose with those splits
  let cashClosesTouched = 0;
  for (const [iso, totals] of cashByDate.entries()) {
    const businessDate = new Date(iso);
    const existing = await prisma.cashClose.findFirst({
      where: { locationId: scope.locationId, businessDate },
    });
    if (existing) {
      const expectedCents = existing.openingCents + totals.cashCents + totals.cardCents;
      const overShortCents = totals.cashCents + totals.cardCents + existing.depositCents - existing.openingCents - expectedCents;
      await prisma.cashClose.update({
        where: { id: existing.id },
        data: { cashCents: totals.cashCents, creditCents: totals.cardCents, expectedCents, overShortCents },
      });
      cashClosesTouched++;
    }
  }

  await writeAudit({
    businessId: scope.businessId,
    userId: scope.userId,
    action: "square.sales.import",
    entityType: "DailySales",
    diff: { created, updated, errorCount: errors.length, cashClosesTouched, columns: { dateCol, netCol, grossCol, taxCol, cashCol, cardCol, guestsCol, tipsCol } },
  });

  return NextResponse.json({
    created,
    updated,
    errors,
    cashClosesTouched,
    detected: { dateCol, netCol, grossCol, taxCol, cashCol, cardCol, guestsCol, tipsCol },
  });
}
