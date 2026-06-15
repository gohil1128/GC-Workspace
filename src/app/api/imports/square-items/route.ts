import { NextResponse } from "next/server";
import { getScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { parseCsv } from "@/lib/csv";
import { startOfDay } from "@/lib/date";
import { toCents } from "@/lib/money";
import { writeAudit } from "@/lib/audit";

// Importer for Square's per-item CSV export (Sales → Item Sales → Export).
// Schema: Date, Time, Time Zone, Category, Item, Qty, ..., Gross Sales,
// Discounts, Net Sales, Tax, Transaction ID, Payment ID, ...
//
// We aggregate two grains:
//   1. Day-level → DailySales (net, tax, guestCount = unique txn count)
//   2. Day × item → SalesItem (qty, net, tax, txCount)
// Both can be tagged with an event id for the entire upload.

export const maxDuration = 60;

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
  let s = String(raw).trim();
  const negative = /^\(.*\)$/.test(s) || s.startsWith("-");
  s = s.replace(/[()\s$£€,]/g, "").replace(/^-/, "");
  const n = parseFloat(s);
  if (!isFinite(n)) return 0;
  return negative ? -n : n;
}

function parseQty(raw: string | undefined): number {
  if (!raw) return 0;
  const n = parseFloat(String(raw).trim());
  return isFinite(n) ? n : 0;
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const t = raw.trim();
  // Square always exports as YYYY-MM-DD when locale is US/CA
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (iso) return startOfDay(new Date(`${iso[1]}-${iso[2]}-${iso[3]}`));
  const d = new Date(t);
  return isNaN(d.getTime()) ? null : startOfDay(d);
}

export async function POST(req: Request) {
  const scope = await getScope();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing CSV file" }, { status: 400 });
  }

  const eventIdRaw = String(form.get("eventId") ?? "");
  const eventId = eventIdRaw && eventIdRaw !== "none" ? eventIdRaw : null;
  if (eventId) {
    const exists = await prisma.event.findFirst({
      where: { id: eventId, businessId: scope.businessId },
    });
    if (!exists) return NextResponse.json({ error: "Selected event not found" }, { status: 400 });
  }

  const text = await file.text();
  const rows = parseCsv(text);
  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV looked empty" }, { status: 400 });
  }

  const sample = rows[0] as Record<string, string>;
  const dateCol = findCol(sample, ["Date", "Business Date", "Transaction Date"]);
  const itemCol = findCol(sample, ["Item", "Item Name", "Product"]);
  const categoryCol = findCol(sample, ["Category", "Item Category"]);
  const qtyCol = findCol(sample, ["Qty", "Quantity", "Count"]);
  const netCol = findCol(sample, ["Net Sales", "Net", "Net Amount"]);
  const grossCol = findCol(sample, ["Gross Sales", "Gross", "Total"]);
  const taxCol = findCol(sample, ["Tax", "Sales Tax", "Taxes"]);
  const txCol = findCol(sample, ["Transaction ID", "Order ID", "Receipt Number"]);

  if (!dateCol || !itemCol) {
    return NextResponse.json({
      error: "Could not find Date or Item columns. This importer expects Square's per-item CSV (Sales → Items → Export).",
      detectedColumns: Object.keys(sample),
    }, { status: 400 });
  }
  if (!netCol && !grossCol) {
    return NextResponse.json({
      error: "Could not find a Net Sales or Gross Sales column.",
      detectedColumns: Object.keys(sample),
    }, { status: 400 });
  }

  type DayKey = string; // ISO date
  type ItemKey = string; // `${ISO}|${itemName}`
  const dayAgg = new Map<DayKey, {
    businessDate: Date;
    netCents: number;
    taxCents: number;
    txIds: Set<string>;
  }>();
  const itemAgg = new Map<ItemKey, {
    businessDate: Date;
    itemName: string;
    category: string | null;
    qty: number;
    netCents: number;
    taxCents: number;
    txIds: Set<string>;
  }>();
  const errors: { row: number; reason: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i] as Record<string, string>;
    const date = parseDate(r[dateCol] ?? "");
    if (!date) {
      errors.push({ row: i + 2, reason: `Bad date "${r[dateCol]}"` });
      continue;
    }
    const itemName = String(r[itemCol] ?? "").trim();
    if (!itemName) {
      errors.push({ row: i + 2, reason: "Missing item name" });
      continue;
    }
    const category = categoryCol ? String(r[categoryCol] ?? "").trim() || null : null;
    const qty = qtyCol ? parseQty(r[qtyCol]) : 1;
    const net = netCol ? parseMoney(r[netCol]) : parseMoney(r[grossCol!]);
    const tax = taxCol ? parseMoney(r[taxCol]) : 0;
    const tx = txCol ? String(r[txCol] ?? "").trim() : "";

    const dayKey = date.toISOString();
    const day = dayAgg.get(dayKey) ?? {
      businessDate: date,
      netCents: 0,
      taxCents: 0,
      txIds: new Set<string>(),
    };
    day.netCents += toCents(net);
    day.taxCents += toCents(tax);
    if (tx) day.txIds.add(tx);
    dayAgg.set(dayKey, day);

    const itemKey = `${dayKey}|${itemName}`;
    const item = itemAgg.get(itemKey) ?? {
      businessDate: date,
      itemName,
      category,
      qty: 0,
      netCents: 0,
      taxCents: 0,
      txIds: new Set<string>(),
    };
    item.qty += qty;
    item.netCents += toCents(net);
    item.taxCents += toCents(tax);
    if (tx) item.txIds.add(tx);
    if (!item.category && category) item.category = category;
    itemAgg.set(itemKey, item);
  }

  let dayCreated = 0;
  let dayUpdated = 0;
  let itemCreated = 0;
  let itemUpdated = 0;

  for (const day of dayAgg.values()) {
    const data = {
      locationId: scope.locationId,
      businessDate: day.businessDate,
      netSalesCents: day.netCents,
      taxCents: day.taxCents,
      guestCount: day.txIds.size,
      eventId,
      source: "POS" as const,
    };
    const existing = await prisma.dailySales.findUnique({
      where: { locationId_businessDate: { locationId: scope.locationId, businessDate: day.businessDate } },
    });
    if (existing) {
      await prisma.dailySales.update({ where: { id: existing.id }, data });
      dayUpdated++;
    } else {
      await prisma.dailySales.create({ data });
      dayCreated++;
    }
  }

  for (const item of itemAgg.values()) {
    const data = {
      locationId: scope.locationId,
      businessDate: item.businessDate,
      itemName: item.itemName,
      category: item.category,
      qty: item.qty,
      netSalesCents: item.netCents,
      taxCents: item.taxCents,
      txCount: item.txIds.size,
      eventId,
    };
    const existing = await prisma.salesItem.findUnique({
      where: {
        locationId_businessDate_itemName: {
          locationId: scope.locationId,
          businessDate: item.businessDate,
          itemName: item.itemName,
        },
      },
    });
    if (existing) {
      await prisma.salesItem.update({ where: { id: existing.id }, data });
      itemUpdated++;
    } else {
      await prisma.salesItem.create({ data });
      itemCreated++;
    }
  }

  await writeAudit({
    businessId: scope.businessId,
    userId: scope.userId,
    action: "square.items.import",
    entityType: "SalesItem",
    diff: {
      dayCreated, dayUpdated, itemCreated, itemUpdated,
      errorCount: errors.length,
      uniqueDays: dayAgg.size,
      uniqueItems: new Set([...itemAgg.values()].map((i) => i.itemName)).size,
      eventId,
    },
  });

  return NextResponse.json({
    ok: true,
    days: { created: dayCreated, updated: dayUpdated, total: dayAgg.size },
    items: { created: itemCreated, updated: itemUpdated, total: itemAgg.size },
    uniqueItems: [...new Set([...itemAgg.values()].map((i) => i.itemName))].sort(),
    errors,
  });
}
