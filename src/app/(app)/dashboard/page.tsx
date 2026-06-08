import Link from "next/link";
import { AlertTriangle, ArrowUpRight, Banknote, Boxes, Clock, ShoppingCart, TrendingUp, Users, Gem } from "lucide-react";
import { getScope } from "@/lib/scope";
import { getDashboard } from "@/modules/dashboard/queries";
import { getActiveEvent } from "@/modules/events/queries";
import { getFinanceSummary } from "@/modules/finance/queries";
import { fmtDate, fmtDateTime } from "@/lib/date";
import { formatMoney, formatPercent } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { KpiCard } from "@/components/charts/kpi-card";
import { TrendLine } from "@/components/charts/trend-line";
import { BarSimple } from "@/components/charts/bar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const scope = await getScope();
  const activeEvent = await getActiveEvent(scope.businessId);
  const [data, finance] = await Promise.all([
    getDashboard({
      businessId: scope.businessId,
      locationId: scope.locationId,
      days: 14,
      eventId: activeEvent?.id ?? null,
      eventRange: activeEvent ? { start: activeEvent.startDate, end: activeEvent.endDate } : null,
    }),
    getFinanceSummary({
      businessId: scope.businessId,
      locationId: scope.locationId,
      eventId: activeEvent?.id ?? null,
      eventRange: activeEvent ? { start: activeEvent.startDate, end: activeEvent.endDate } : null,
    }),
  ]);

  const foodTone = data.kpis.foodPct > data.kpis.foodTarget ? "bad" : data.kpis.foodPct > data.kpis.foodTarget - 2 ? "warn" : "good";
  const laborTone = data.kpis.laborPct > data.kpis.laborTarget ? "bad" : data.kpis.laborPct > data.kpis.laborTarget - 2 ? "warn" : "good";
  const varianceTone = data.kpis.inventoryVariancePct > 2 ? "bad" : data.kpis.inventoryVariancePct > 1 ? "warn" : "good";
  const cashTone = Math.abs(data.kpis.cashOverShortCents) > 5000 ? "bad" : Math.abs(data.kpis.cashOverShortCents) > 2000 ? "warn" : "good";

  const exceptions: { id: string; title: string; detail: string; tone: "warn" | "bad"; href?: string }[] = [];
  if (data.kpis.laborPct > data.kpis.laborTarget) {
    exceptions.push({
      id: "labor",
      title: "Labor over target",
      detail: `${formatPercent(data.kpis.laborPct)} vs ${data.kpis.laborTarget}% target — review schedule`,
      tone: "bad",
      href: "/labor/report",
    });
  }
  if (data.kpis.inventoryVariancePct > 2) {
    exceptions.push({
      id: "variance",
      title: "High inventory variance",
      detail: `${formatPercent(data.kpis.inventoryVariancePct)} on last count — investigate top variances`,
      tone: "bad",
      href: "/inventory/variance",
    });
  }
  if (!data.lastCountAt) {
    exceptions.push({ id: "missing-count", title: "Missing inventory count", detail: "No counts recorded yet — start the weekly count", tone: "warn", href: "/inventory/counts" });
  }
  if (data.missingCloseDays.length > 0) {
    exceptions.push({
      id: "missing-close",
      title: `${data.missingCloseDays.length} missing cash close${data.missingCloseDays.length === 1 ? "" : "s"}`,
      detail: `Last 7 days — most recent missing: ${fmtDate(data.missingCloseDays[data.missingCloseDays.length - 1])}`,
      tone: "warn",
      href: "/cash",
    });
  }
  if (Math.abs(data.kpis.cashOverShortCents) > 5000) {
    exceptions.push({
      id: "cash",
      title: "Cash variance over $50",
      detail: `${formatMoney(data.kpis.cashOverShortCents, { signed: true })} across period`,
      tone: "bad",
      href: "/cash",
    });
  }

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description={
          activeEvent
            ? `${scope.locationName} · event: ${activeEvent.name} · ${fmtDate(data.period.from)} – ${fmtDate(data.period.to)}`
            : `${scope.locationName} · ${fmtDate(data.period.from)} – ${fmtDate(data.period.to)} (${data.period.days} days)`
        }
      />
      <div className="p-4 sm:p-6 space-y-6">
        {/* Hero KPI strip — controllable levers first */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard label="Net Sales" value={formatMoney(data.kpis.netSalesCents)} delta={`${data.kpis.guestCount.toLocaleString()} transactions`} hint={`${data.period.days}d`} />
          <KpiCard label="Food Cost %" value={formatPercent(data.kpis.foodPct)} tone={foodTone} delta={`Target ${data.kpis.foodTarget}%`} />
          <KpiCard label="Labor %" value={formatPercent(data.kpis.laborPct)} tone={laborTone} delta={`Target ${data.kpis.laborTarget}%`} />
          <KpiCard label="Prime Cost %" value={formatPercent(data.kpis.primePct)} tone={data.kpis.primePct > 60 ? "bad" : data.kpis.primePct > 55 ? "warn" : "good"} delta="Target ≤60%" />
          <KpiCard label="Inventory Variance" value={formatPercent(data.kpis.inventoryVariancePct)} tone={varianceTone} delta={data.lastCountAt ? `Last count ${fmtDate(data.lastCountAt)}` : "No count yet"} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <KpiCard
            label="Tips Collected"
            value={formatMoney(data.kpis.tipsCents)}
            tone={data.kpis.tipsCents > 0 ? "good" : "neutral"}
            delta={data.kpis.netSalesCents > 0
              ? `${((data.kpis.tipsCents / data.kpis.netSalesCents) * 100).toFixed(1)}% of net sales`
              : "—"}
          />
          <KpiCard label="Cash Over/Short" value={formatMoney(data.kpis.cashOverShortCents, { signed: true })} tone={cashTone} delta={`${data.period.days}d total`} />
          <KpiCard label="Low Stock Items" value={String(data.lowStockItems.length)} tone={data.lowStockItems.length > 0 ? "warn" : "good"} delta={`of ${data.ingredientsCount} tracked`} />
          <KpiCard label="Open POs" value={String(data.openPos.length)} delta="draft + sent" />
          <KpiCard label="Food Cost (period)" value={formatMoney(data.kpis.foodCostCents)} delta="theoretical usage" />
        </div>

        {/* Financial KPIs — EBITDA, Valuation, CAC (YTD or event-scoped) */}
        <div className="space-y-2">
          <div className="flex items-end justify-between">
            <h2 className="text-2xs uppercase tracking-wider font-semibold text-muted-foreground">Financial · {finance.range.label}</h2>
            <span className="text-2xs text-muted-foreground">
              Revenue {formatMoney(finance.netSalesCents)} · Costs {formatMoney(finance.cogsCents + finance.laborCostCents + finance.operatingExpensesCents)}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <KpiCard
              label="EBITDA"
              value={formatMoney(finance.ebitdaCents, { signed: true })}
              tone={finance.ebitdaCents < 0 ? "bad" : finance.ebitdaMarginPct > 15 ? "good" : "warn"}
              delta={`${formatPercent(finance.ebitdaMarginPct)} margin`}
              hint="Sales − COGS − Labor − Opex"
            />
            <KpiCard
              label="Valuation"
              value={formatMoney(finance.valuationCents)}
              tone="neutral"
              delta={
                finance.valuationBasis === "ebitda" ? "EBITDA multiple"
                : finance.valuationBasis === "revenue" ? "Revenue multiple (EBITDA ≤ 0)"
                : "Need sales to estimate"
              }
              hint="Set multipliers in Settings"
            />
            <KpiCard
              label="Marketing / Guest"
              value={formatMoney(finance.marketingPerGuestCents)}
              tone={finance.marketingPerGuestCents > 500 ? "warn" : "good"}
              delta={`${formatMoney(finance.marketingCents)} marketing · ${finance.guestCount.toLocaleString()} guests`}
              hint="CAC proxy"
            />
          </div>
          {finance.expenseByCategory.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {finance.expenseByCategory.map((e) => (
                <Badge key={e.category} variant="muted" className="gap-1.5">
                  <span className="capitalize">{e.category.toLowerCase()}</span>
                  <span className="num font-semibold">{formatMoney(e.amountCents)}</span>
                </Badge>
              ))}
              <Link href="/expenses" className="text-2xs text-muted-foreground hover:text-foreground self-center ml-2">Manage expenses →</Link>
            </div>
          )}
          {finance.expenseByCategory.length === 0 && (
            <p className="text-2xs text-muted-foreground pt-1">
              <Link href="/expenses" className="underline">Log your operating expenses</Link> (rent, marketing, utilities) for accurate EBITDA and CAC.
            </p>
          )}
        </div>

        {/* Exception cards */}
        {exceptions.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-xs uppercase tracking-wide text-muted-foreground">Exceptions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {exceptions.map((e) => (
                <Link
                  key={e.id}
                  href={e.href ?? "#"}
                  className="rounded-lg border p-3 flex gap-3 hover:bg-muted/40 transition-colors group"
                >
                  <div className={`shrink-0 rounded p-1.5 ${e.tone === "bad" ? "bg-destructive/15 text-destructive" : "bg-warning/15 text-warning"}`}>
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{e.title}</span>
                      <ArrowUpRight className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <p className="text-xs text-muted-foreground">{e.detail}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
              <CardTitle>Net sales trend</CardTitle>
              <Badge variant="muted">{data.period.days}d</Badge>
            </CardHeader>
            <CardContent>
              <TrendLine data={data.trends.sales} format="currency" />
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
              <CardTitle>Labor cost by day</CardTitle>
              <Badge variant="muted">{data.period.days}d</Badge>
            </CardHeader>
            <CardContent>
              <BarSimple data={data.trends.labor} format="currency" />
            </CardContent>
          </Card>
        </div>

        {/* Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
              <CardTitle className="flex items-center gap-2"><Boxes className="h-4 w-4" /> Low stock</CardTitle>
              <Link href="/inventory" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
            </CardHeader>
            <CardContent className="pt-0">
              {data.lowStockItems.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">All items above reorder point.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">On Hand</TableHead>
                      <TableHead className="text-right">Reorder Pt</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.lowStockItems.slice(0, 6).map((i) => (
                      <TableRow key={i.id}>
                        <TableCell className="font-medium">{i.name}</TableCell>
                        <TableCell className="text-right num text-destructive">{i.onHand.toFixed(2)} {i.unit}</TableCell>
                        <TableCell className="text-right num text-muted-foreground">{i.reorderPoint.toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
              <CardTitle className="flex items-center gap-2"><ShoppingCart className="h-4 w-4" /> Upcoming POs</CardTitle>
              <Link href="/purchasing" className="text-xs text-muted-foreground hover:text-foreground">View all →</Link>
            </CardHeader>
            <CardContent className="pt-0">
              {data.openPos.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">No open POs.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expected</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.openPos.map((po) => (
                      <TableRow key={po.id}>
                        <TableCell className="font-medium">
                          <Link href={`/purchasing/${po.id}`} className="hover:underline">{po.supplier.name}</Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={po.status === "SENT" ? "default" : "muted"}>{po.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{po.expectedAt ? fmtDate(po.expectedAt) : "—"}</TableCell>
                        <TableCell className="text-right num">{formatMoney(po.totalCents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
