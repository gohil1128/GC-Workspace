import { NextResponse } from "next/server";
import { getScope } from "@/lib/scope";
import { toCsv } from "@/lib/csv";
import { fromCents } from "@/lib/money";
import { dailySummary, weeklyTrend, purchaseSpendByPeriod } from "@/modules/reports/queries";
import { getLaborReport } from "@/modules/labor/queries";
import { getVarianceReport } from "@/modules/inventory/queries";
import { listCashCloses } from "@/modules/cash/queries";

export async function GET(_req: Request, { params }: { params: Promise<{ report: string }> }) {
  const { report } = await params;
  const scope = await getScope();

  let rows: Record<string, unknown>[] = [];
  let columns: string[] = [];

  switch (report) {
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
