import { NextResponse } from "next/server";
import { getScope } from "@/lib/scope";
import { toCsv } from "@/lib/csv";
import { fromCents } from "@/lib/money";
import { dailySummary, weeklyTrend, purchaseSpendByPeriod } from "@/modules/reports/queries";
import { getLaborReport } from "@/modules/labor/queries";
import { getVarianceReport } from "@/modules/inventory/queries";
import { listCashCloses } from "@/modules/cash/queries";
import { listInvoicesForExport, type InvoiceFilters } from "@/modules/invoices/queries";

// The list page narrows to event-untagged invoices in JS rather than SQL;
// mirror that here so the export matches the filtered view.
function onlyUntagged<T extends { event: unknown; appliesToAllEvents: boolean }>(
  rows: T[],
  sp: URLSearchParams,
): T[] {
  if (sp.get("untagged") !== "1") return rows;
  return rows.filter((r) => !r.event && !r.appliesToAllEvents);
}

// Mirrors the invoice list page's query params so "Download CSV" exports
// exactly the rows the operator is looking at.
function invoiceFiltersFrom(sp: URLSearchParams): InvoiceFilters {
  const status = sp.get("status");
  return {
    supplierId: sp.get("supplier") ?? undefined,
    invoiceNumber: sp.get("number") ?? undefined,
    status: status === "open" || status === "closed" ? status : "all",
    from: sp.get("from") ?? undefined,
    to: sp.get("to") ?? undefined,
  };
}

export async function GET(req: Request, { params }: { params: Promise<{ report: string }> }) {
  const { report } = await params;
  const scope = await getScope();
  const sp = new URL(req.url).searchParams;

  let rows: Record<string, unknown>[] = [];
  let columns: string[] = [];

  switch (report) {
    // One row per invoice — the header-level view, with the full tax and
    // adjustment breakdown that the on-screen table leaves out.
    case "invoices": {
      const data = onlyUntagged(await listInvoicesForExport(scope.locationId, invoiceFiltersFrom(sp)), sp);
      columns = [
        "invoiceNumber", "supplier", "event", "category", "invoiceDate", "dateReceived",
        "itemCount", "subtotal", "gst", "pst", "shipping", "rebate", "total",
        "status", "closedAt", "createdBy", "memo",
      ];
      rows = data.map((i) => ({
        invoiceNumber: i.invoiceNumber,
        supplier: i.supplier.name,
        event: i.appliesToAllEvents ? "All events" : (i.event?.name ?? ""),
        category: i.category ?? "",
        invoiceDate: i.invoiceDate.toISOString().slice(0, 10),
        dateReceived: i.dateReceived.toISOString().slice(0, 10),
        itemCount: i.items.length,
        subtotal: fromCents(i.subtotalCents).toFixed(2),
        gst: fromCents(i.gstCents).toFixed(2),
        pst: fromCents(i.pstCents).toFixed(2),
        shipping: fromCents(i.shippingCents).toFixed(2),
        rebate: fromCents(i.rebateCents).toFixed(2),
        total: fromCents(i.totalCents).toFixed(2),
        status: i.closedAt ? "Closed" : "Open",
        closedAt: i.closedAt ? i.closedAt.toISOString().slice(0, 10) : "",
        createdBy: i.createdBy.name,
        memo: i.internalMemo ?? "",
      }));
      break;
    }
    // One row per line item, each carrying its parent invoice's identifying
    // columns so the file pivots cleanly in a spreadsheet.
    case "invoice-items": {
      const data = onlyUntagged(await listInvoicesForExport(scope.locationId, invoiceFiltersFrom(sp)), sp);
      columns = [
        "invoiceNumber", "supplier", "event", "category", "invoiceDate",
        "ingredient", "qty", "unit", "unitCost", "lineTotal", "status",
      ];
      rows = data.flatMap((i) =>
        i.items.map((it) => ({
          invoiceNumber: i.invoiceNumber,
          supplier: i.supplier.name,
          event: i.appliesToAllEvents ? "All events" : (i.event?.name ?? ""),
          category: i.category ?? "",
          invoiceDate: i.invoiceDate.toISOString().slice(0, 10),
          ingredient: it.ingredient.name,
          qty: it.qty,
          unit: it.unit,
          unitCost: fromCents(it.unitCostCents).toFixed(2),
          lineTotal: fromCents(it.lineTotalCents).toFixed(2),
          status: i.closedAt ? "Closed" : "Open",
        }))
      );
      break;
    }
    case "daily": {
      const data = await dailySummary(scope.locationId, 30);
      columns = ["date", "netSales", "tips", "guests", "foodCost", "foodPct", "laborCost", "laborPct", "cashOverShort"];
      rows = data.map((r) => ({
        date: r.date,
        netSales: fromCents(r.netSalesCents).toFixed(2),
        tips: fromCents(r.tipsCents).toFixed(2),
        guests: r.guests,
        foodCost: fromCents(r.foodCostCents).toFixed(2),
        foodPct: r.foodPct.toFixed(2),
        laborCost: fromCents(r.laborCostCents).toFixed(2),
        laborPct: r.laborPct.toFixed(2),
        cashOverShort: fromCents(r.cashOverShortCents).toFixed(2),
      }));
      break;
    }
    case "weekly": {
      const data = await weeklyTrend(scope.locationId, 4);
      columns = ["week", "from", "to", "netSales", "foodPct", "laborPct"];
      rows = data.map((w) => ({
        week: w.label, from: w.from, to: w.to,
        netSales: fromCents(w.netSalesCents).toFixed(2),
        foodPct: w.foodPct.toFixed(2),
        laborPct: w.laborPct.toFixed(2),
      }));
      break;
    }
    case "labor": {
      const data = await getLaborReport(scope.locationId, 14);
      columns = ["employee", "position", "wage", "scheduledHours", "actualHours", "costDollars"];
      rows = data.byEmployee.map((e) => ({
        employee: e.name, position: e.position,
        wage: fromCents(e.rate).toFixed(2),
        scheduledHours: (e.scheduledMin / 60).toFixed(2),
        actualHours: (e.actualMin / 60).toFixed(2),
        costDollars: fromCents(e.costCents).toFixed(2),
      }));
      break;
    }
    case "variance": {
      const v = await getVarianceReport(scope.locationId);
      columns = ["ingredient", "unit", "theoretical", "actual", "variance", "variancePct", "varianceDollars"];
      rows = (v?.lines ?? []).map((l) => ({
        ingredient: l.ingredient, unit: l.unit,
        theoretical: l.theoretical.toFixed(3),
        actual: l.actual.toFixed(3),
        variance: l.variance.toFixed(3),
        variancePct: l.pct.toFixed(2),
        varianceDollars: fromCents(l.varianceCostCents).toFixed(2),
      }));
      break;
    }
    case "spend": {
      const data = await purchaseSpendByPeriod(scope.locationId, 30);
      columns = ["supplier", "orders", "spendDollars"];
      rows = data.map((r) => ({
        supplier: r.name, orders: r.orderCount,
        spendDollars: fromCents(r.spendCents).toFixed(2),
      }));
      break;
    }
    case "cash": {
      const data = await listCashCloses(scope.locationId, 30);
      columns = ["date", "opening", "closing", "deposit", "expected", "overShort", "closedBy"];
      rows = data.map((c) => ({
        date: c.businessDate.toISOString().slice(0, 10),
        opening: fromCents(c.openingCents).toFixed(2),
        closing: fromCents(c.closingCents).toFixed(2),
        deposit: fromCents(c.depositCents).toFixed(2),
        expected: fromCents(c.expectedCents).toFixed(2),
        overShort: fromCents(c.overShortCents).toFixed(2),
        closedBy: c.closedBy.name,
      }));
      break;
    }
    default:
      return NextResponse.json({ error: "unknown report" }, { status: 404 });
  }

  const csv = toCsv(rows, columns);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${report}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
