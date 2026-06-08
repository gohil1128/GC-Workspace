import Link from "next/link";
import { getScope } from "@/lib/scope";
import { dailySummary, weeklyTrend, purchaseSpendByPeriod } from "@/modules/reports/queries";
import { getLaborReport } from "@/modules/labor/queries";
import { getVarianceReport } from "@/modules/inventory/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { formatMoney, formatPercent } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const scope = await getScope();
  const [daily, weekly, labor, spend, variance] = await Promise.all([
    dailySummary(scope.locationId, 14),
    weeklyTrend(scope.locationId, 4),
    getLaborReport(scope.locationId, 14),
    purchaseSpendByPeriod(scope.locationId, 30),
    getVarianceReport(scope.locationId),
  ]);

  return (
    <div>
      <PageHeader
        title="Reports"
        description="Daily, weekly, labor, variance, and purchase spend"
        actions={
          <>
            <Button asChild variant="outline" size="sm" disabled><a aria-disabled>PDF (placeholder)</a></Button>
          </>
        }
      />
      <div className="p-4 sm:p-6 grid gap-4">
        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle>Daily summary (14d)</CardTitle>
            <Button asChild variant="outline" size="sm"><a href="/api/exports/daily"><Download className="h-3.5 w-3.5" /> CSV</a></Button>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Net Sales</TableHead>
                  <TableHead className="text-right">Tips</TableHead>
                  <TableHead className="text-right">Guests</TableHead>
                  <TableHead className="text-right">Food $</TableHead>
                  <TableHead className="text-right">Food %</TableHead>
                  <TableHead className="text-right">Labor $</TableHead>
                  <TableHead className="text-right">Labor %</TableHead>
                  <TableHead className="text-right">Cash O/S</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {daily.map((r, i) => (
                  <TableRow key={i}>
                    <TableCell className="font-medium">{r.date}</TableCell>
                    <TableCell className="text-right num">{formatMoney(r.netSalesCents)}</TableCell>
                    <TableCell className="text-right num text-muted-foreground">{formatMoney(r.tipsCents)}</TableCell>
                    <TableCell className="text-right num text-muted-foreground">{r.guests}</TableCell>
                    <TableCell className="text-right num">{formatMoney(r.foodCostCents)}</TableCell>
                    <TableCell className={`text-right num ${r.foodPct > 35 ? "text-destructive" : ""}`}>{formatPercent(r.foodPct)}</TableCell>
                    <TableCell className="text-right num">{formatMoney(r.laborCostCents)}</TableCell>
                    <TableCell className={`text-right num ${r.laborPct > 30 ? "text-destructive" : ""}`}>{formatPercent(r.laborPct)}</TableCell>
                    <TableCell className={`text-right num ${r.cashOverShortCents < 0 ? "text-destructive" : r.cashOverShortCents > 0 ? "text-warning" : ""}`}>{formatMoney(r.cashOverShortCents, { signed: true })}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Weekly trend (4w)</CardTitle>
              <Button asChild variant="outline" size="sm"><a href="/api/exports/weekly"><Download className="h-3.5 w-3.5" /> CSV</a></Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Week</TableHead>
                    <TableHead className="text-right">Sales</TableHead>
                    <TableHead className="text-right">Food %</TableHead>
                    <TableHead className="text-right">Labor %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {weekly.map((w, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{w.label}<div className="text-2xs text-muted-foreground">{w.from} – {w.to}</div></TableCell>
                      <TableCell className="text-right num">{formatMoney(w.netSalesCents)}</TableCell>
                      <TableCell className="text-right num">{formatPercent(w.foodPct)}</TableCell>
                      <TableCell className="text-right num">{formatPercent(w.laborPct)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Purchase spend by supplier (30d)</CardTitle>
              <Button asChild variant="outline" size="sm"><a href="/api/exports/spend"><Download className="h-3.5 w-3.5" /> CSV</a></Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Spend</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {spend.map((r, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{r.name}</TableCell>
                      <TableCell className="text-right num">{r.orderCount}</TableCell>
                      <TableCell className="text-right num">{formatMoney(r.spendCents)}</TableCell>
                    </TableRow>
                  ))}
                  {spend.length === 0 && (
                    <TableRow><TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-6">No POs in window.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Labor performance</CardTitle>
              <Button asChild variant="outline" size="sm"><Link href="/labor/report">Open</Link></Button>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Labor %</span><span className="num">{formatPercent(labor.laborPct)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Scheduled hrs</span><span className="num">{labor.totalScheduledHours.toFixed(1)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Actual hrs</span><span className="num">{labor.totalActualHours.toFixed(1)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Total cost</span><span className="num">{formatMoney(labor.totalCostCents)}</span></div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0">
              <CardTitle>Inventory variance</CardTitle>
              <Button asChild variant="outline" size="sm"><Link href="/inventory/variance">Open</Link></Button>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {variance ? (
                <>
                  <div className="flex justify-between"><span className="text-muted-foreground">Lines</span><span className="num">{variance.lines.length}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Total $ impact</span><span className="num text-destructive">{formatMoney(variance.totalVarianceCostCents)}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground">Negative lines</span><span className="num">{variance.lines.filter((l) => l.variance < 0).length}</span></div>
                </>
              ) : (
                <span className="text-muted-foreground">No counts yet.</span>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
