import Link from "next/link";
import { getScope } from "@/lib/scope";
import { dailySummary, weeklyTrend, purchaseSpendByPeriod, supplierSpendByEvent } from "@/modules/reports/queries";
import { getLaborReport } from "@/modules/labor/queries";
import { getVarianceReport } from "@/modules/inventory/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { formatMoney, formatPercent } from "@/lib/money";
import { DeleteReportDayButton } from "./_components/delete-report-day-button";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const scope = await getScope();
  const isOwner = scope.role === "OWNER";
  const [daily, weekly, labor, spend, variance, supplierMatrix] = await Promise.all([
    dailySummary(scope.locationId, 14),
    weeklyTrend(scope.locationId, 4),
    getLaborReport(scope.locationId, 14),
    purchaseSpendByPeriod(scope.locationId, 30),
    getVarianceReport(scope.locationId),
    supplierSpendByEvent(scope.locationId),
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
                  {isOwner && <TableHead className="w-12 text-right">Delete</TableHead>}
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
                    {isOwner && (
                      <TableCell className="text-right">
                        {r.hasSales ? (
                          <DeleteReportDayButton iso={r.iso} label={r.date} />
                        ) : (
                          <span className="text-2xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Supplier spend × event matrix — where the money went, per event and overall */}
        <Card>
          <CardHeader>
            <CardTitle>Supplier spend by event · all-time</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Every supplier invoice, split by the event it&apos;s tagged to. &quot;Untagged&quot; is
              spend with no event — tag those invoices to make per-event costs exact.
            </p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {supplierMatrix.suppliers.length === 0 ? (
              <p className="text-sm text-muted-foreground px-4 pb-4">No invoices yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-36">Supplier</TableHead>
                    {supplierMatrix.events.map((e) => (
                      <TableHead key={e.id} className="text-right whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: e.color ?? "hsl(var(--muted-foreground))" }} />
                          {e.name}
                        </span>
                      </TableHead>
                    ))}
                    {supplierMatrix.hasUntagged && <TableHead className="text-right">Untagged</TableHead>}
                    <TableHead className="text-right font-semibold">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {supplierMatrix.suppliers.map((s) => (
                    <TableRow key={s.supplierId}>
                      <TableCell className="font-medium">{s.name}</TableCell>
                      {supplierMatrix.events.map((e) => (
                        <TableCell key={e.id} className="text-right num text-muted-foreground">
                          {s.byEvent[e.id] ? formatMoney(s.byEvent[e.id]) : "—"}
                        </TableCell>
                      ))}
                      {supplierMatrix.hasUntagged && (
                        <TableCell className="text-right num text-muted-foreground">
                          {s.untaggedCents ? formatMoney(s.untaggedCents) : "—"}
                        </TableCell>
                      )}
                      <TableCell className="text-right num font-semibold">{formatMoney(s.totalCents)}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/30">
                    <TableCell className="font-semibold">All suppliers</TableCell>
                    {supplierMatrix.events.map((e) => (
                      <TableCell key={e.id} className="text-right num font-semibold">
                        {formatMoney(supplierMatrix.eventTotals[e.id] ?? 0)}
                      </TableCell>
                    ))}
                    {supplierMatrix.hasUntagged && (
                      <TableCell className="text-right num font-semibold">{formatMoney(supplierMatrix.grandUntagged)}</TableCell>
                    )}
                    <TableCell className="text-right num font-semibold text-brand">{formatMoney(supplierMatrix.grandTotal)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            )}
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
              <CardTitle>Supplier spend (30d) · invoices + POs</CardTitle>
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
