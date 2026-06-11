import Link from "next/link";
import {
  AlertTriangle,
  ArrowUpRight,
  Boxes,
  Coins,
  Gem,
  Package,
  ScanLine,
  ShoppingCart,
  Sparkles,
  Wallet,
} from "lucide-react";
import { getScope } from "@/lib/scope";
import { getDashboard } from "@/modules/dashboard/queries";
import { getActiveEvent } from "@/modules/events/queries";
import { getFinanceSummary } from "@/modules/finance/queries";
import { fmtDate } from "@/lib/date";
import { formatMoney, formatPercent } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { HeroPulse } from "@/components/dashboard/hero-pulse";
import { StatCard } from "@/components/dashboard/stat-card";
import { MetricRing } from "@/components/dashboard/metric-ring";
import { AreaStory } from "@/components/dashboard/area-story";
import { SectionTitle } from "@/components/dashboard/section-title";

export const dynamic = "force-dynamic";

type Tone = "good" | "warn" | "bad" | "neutral";

function toneFor(value: number, target: number, slack = 2): Tone {
  if (value > target) return "bad";
  if (value > target - slack) return "warn";
  return "good";
}

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

  const salesSpark = data.trends.sales.map((s) => s.y);
  const laborSpark = data.trends.labor.map((s) => s.y);
  const todayCents = data.trends.sales.length > 0
    ? Math.round(data.trends.sales[data.trends.sales.length - 1].y * 100)
    : 0;
  const yesterdayCents = data.trends.sales.length > 1
    ? Math.round(data.trends.sales[data.trends.sales.length - 2].y * 100)
    : 0;

  const foodTone = toneFor(data.kpis.foodPct, data.kpis.foodTarget);
  const laborTone = toneFor(data.kpis.laborPct, data.kpis.laborTarget);
  const primeTone = toneFor(data.kpis.primePct, 60);
  const varianceTone: Tone =
    data.kpis.inventoryVariancePct > 2 ? "bad" : data.kpis.inventoryVariancePct > 1 ? "warn" : "good";
  const cashTone: Tone =
    Math.abs(data.kpis.cashOverShortCents) > 5000 ? "bad"
      : Math.abs(data.kpis.cashOverShortCents) > 2000 ? "warn"
        : "good";

  type Exception = { id: string; title: string; detail: string; tone: "warn" | "bad"; href?: string };
  const exceptions: Exception[] = [];
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
    exceptions.push({
      id: "missing-count",
      title: "Missing inventory count",
      detail: "No counts recorded yet — start the weekly count",
      tone: "warn",
      href: "/inventory/counts",
    });
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

  const periodLabel = activeEvent
    ? `Event · ${activeEvent.name}`
    : `Last ${data.period.days} days · ${scope.locationName}`;

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

      <div className="snap-dashboard scroll-fluid">
        <div className="mx-auto max-w-[1400px] p-4 sm:p-6 lg:p-8 space-y-10 cascade">

          {/* ─────── Hero ─────── */}
          <section>
            <HeroPulse
              netSalesCents={data.kpis.netSalesCents}
              guestCount={data.kpis.guestCount}
              tipsCents={data.kpis.tipsCents}
              spark={salesSpark}
              periodLabel={periodLabel}
              todayCents={todayCents}
              yesterdayCents={yesterdayCents}
            />
          </section>

          {/* ─────── Vitals (rings) ─────── */}
          <section className="space-y-4">
            <SectionTitle
              eyebrow="Vitals"
              title="How the business is breathing"
              subtitle="The four ratios that move the P&L. Each ring fills to the actual value — the tick mark is your target."
            />
            <div className="rounded-2xl border bg-card shadow-card p-6">
              <div className="grid grid-cols-2 gap-y-6 md:grid-cols-4">
                <MetricRing
                  label="Food cost"
                  value={data.kpis.foodPct}
                  target={data.kpis.foodTarget}
                  tone={foodTone}
                  caption={`Target ${data.kpis.foodTarget}%`}
                />
                <MetricRing
                  label="Labor"
                  value={data.kpis.laborPct}
                  target={data.kpis.laborTarget}
                  tone={laborTone}
                  caption={`Target ${data.kpis.laborTarget}%`}
                />
                <MetricRing
                  label="Prime cost"
                  value={data.kpis.primePct}
                  target={60}
                  tone={primeTone}
                  caption="Target ≤60%"
                />
                <MetricRing
                  label="Inventory variance"
                  value={data.kpis.inventoryVariancePct}
                  target={2}
                  tone={varianceTone}
                  caption={data.lastCountAt ? `Last ${fmtDate(data.lastCountAt)}` : "No count yet"}
                />
              </div>
            </div>
          </section>

          {/* ─────── Pulse strip ─────── */}
          <section className="space-y-4">
            <SectionTitle
              eyebrow="Pulse"
              title="At-a-glance"
              subtitle="Six tiles that tell you whether to celebrate, investigate, or move on."
            />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
              <StatCard
                label="Tips collected"
                value={formatMoney(data.kpis.tipsCents)}
                tone={data.kpis.tipsCents > 0 ? "good" : "neutral"}
                hint={data.kpis.netSalesCents > 0 ? `${((data.kpis.tipsCents / data.kpis.netSalesCents) * 100).toFixed(1)}% of sales` : "—"}
                spark={salesSpark}
                sparkColor="hsl(var(--success))"
              />
              <StatCard
                label="Cash over/short"
                value={formatMoney(data.kpis.cashOverShortCents, { signed: true })}
                tone={cashTone}
                hint={`${data.period.days}d total`}
              />
              <StatCard
                label="Low stock"
                value={String(data.lowStockItems.length)}
                tone={data.lowStockItems.length > 0 ? "warn" : "good"}
                hint={`of ${data.ingredientsCount} tracked`}
              />
              <StatCard
                label="Open POs"
                value={String(data.openPos.length)}
                hint="draft + sent"
              />
              <StatCard
                label="Food cost (period)"
                value={formatMoney(data.kpis.foodCostCents)}
                hint="theoretical usage"
              />
              <StatCard
                label="Labor cost"
                value={formatMoney(data.kpis.laborCostCents)}
                hint="incl. completed shifts"
                spark={laborSpark}
                sparkColor="hsl(var(--brand))"
              />
            </div>
          </section>

          {/* ─────── Revenue story (big chart) ─────── */}
          <section className="space-y-4">
            <SectionTitle
              eyebrow="The story so far"
              title="Net sales · day by day"
              subtitle="Brand gradient peaks where money came in. Hover any point for the exact figure."
              href="/reports"
              cta="Open reports"
            />
            <div className="rounded-2xl border bg-card shadow-card p-4 sm:p-6">
              <AreaStory data={data.trends.sales} height={300} />
            </div>
          </section>

          {/* ─────── Exceptions ─────── */}
          {exceptions.length > 0 && (
            <section className="space-y-4">
              <SectionTitle
                eyebrow="Needs you"
                title="What needs attention"
                subtitle="Sorted by impact. Tap any card to dive into the source."
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 cascade">
                {exceptions.map((e) => (
                  <Link
                    key={e.id}
                    href={e.href ?? "#"}
                    className="group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
                  >
                    <div
                      className={`absolute inset-x-0 top-0 h-[3px] ${
                        e.tone === "bad" ? "bg-destructive" : "bg-warning"
                      }`}
                    />
                    <div className="flex items-start gap-3">
                      <div
                        className={`shrink-0 rounded-xl p-2 ${
                          e.tone === "bad"
                            ? "bg-destructive/15 text-destructive"
                            : "bg-warning/15 text-warning"
                        }`}
                      >
                        <AlertTriangle className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold">{e.title}</span>
                          <ArrowUpRight className="h-3.5 w-3.5 opacity-0 -translate-x-1 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{e.detail}</p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* ─────── Financial ─────── */}
          <section className="space-y-4">
            <SectionTitle
              eyebrow={`Financial · ${finance.range.label}`}
              title="What the business is worth"
              subtitle={
                <>
                  Revenue {formatMoney(finance.netSalesCents)} · Costs{" "}
                  {formatMoney(finance.cogsCents + finance.laborCostCents + finance.operatingExpensesCents)}
                </>
              }
              href="/settings"
              cta="Set multipliers"
            />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <FinanceTile
                icon={<Coins className="h-4 w-4" />}
                label="EBITDA"
                value={formatMoney(finance.ebitdaCents, { signed: true })}
                tone={finance.ebitdaCents < 0 ? "bad" : finance.ebitdaMarginPct > 15 ? "good" : "warn"}
                hint={`${formatPercent(finance.ebitdaMarginPct)} margin`}
                sub="Sales − COGS − Labor − Opex"
              />
              <FinanceTile
                icon={<Gem className="h-4 w-4" />}
                label="Valuation"
                value={formatMoney(finance.valuationCents)}
                tone="neutral"
                hint={
                  finance.valuationBasis === "ebitda" ? "EBITDA multiple"
                    : finance.valuationBasis === "revenue" ? "Revenue multiple (EBITDA ≤ 0)"
                      : "Need sales to estimate"
                }
                sub="Set multipliers in Settings"
              />
              <FinanceTile
                icon={<Wallet className="h-4 w-4" />}
                label="Marketing / guest"
                value={formatMoney(finance.marketingPerGuestCents)}
                tone={finance.marketingPerGuestCents > 500 ? "warn" : "good"}
                hint={`${formatMoney(finance.marketingCents)} mkt · ${finance.guestCount.toLocaleString()} guests`}
                sub="CAC proxy"
              />
            </div>
            {finance.expenseByCategory.length > 0 ? (
              <div className="flex flex-wrap items-center gap-1.5 px-1">
                {finance.expenseByCategory.map((e) => (
                  <span key={e.category} className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-2xs">
                    <span className="capitalize text-muted-foreground">{e.category.toLowerCase()}</span>
                    <span className="num font-semibold">{formatMoney(e.amountCents)}</span>
                  </span>
                ))}
                <Link href="/expenses" className="ml-1 text-2xs text-muted-foreground hover:text-foreground">
                  Manage expenses →
                </Link>
              </div>
            ) : (
              <p className="px-1 text-2xs text-muted-foreground">
                <Link href="/expenses" className="underline">Log your operating expenses</Link> (rent, marketing, utilities) for accurate EBITDA and CAC.
              </p>
            )}
          </section>

          {/* ─────── Twin lists ─────── */}
          <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border bg-card shadow-card">
              <div className="flex items-center justify-between p-4 pb-2">
                <div className="flex items-center gap-2">
                  <Boxes className="h-4 w-4 text-brand" />
                  <h3 className="text-sm font-semibold tracking-tight">Low stock</h3>
                </div>
                <Link href="/inventory" className="text-2xs text-muted-foreground hover:text-foreground">
                  All inventory →
                </Link>
              </div>
              {data.lowStockItems.length === 0 ? (
                <div className="p-4 pt-2 text-xs text-muted-foreground">
                  Everything is above reorder point. ✦
                </div>
              ) : (
                <ul className="px-2 pb-2">
                  {data.lowStockItems.slice(0, 6).map((i) => {
                    const fillPct = Math.max(0, Math.min(100, (i.onHand / Math.max(i.reorderPoint, 0.01)) * 100));
                    const tone = fillPct < 50 ? "bg-destructive" : fillPct < 90 ? "bg-warning" : "bg-success";
                    return (
                      <li key={i.id} className="rounded-xl px-3 py-2.5 hover:bg-accent/40 transition-colors">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span className="font-medium truncate">{i.name}</span>
                          <span className="num text-2xs text-muted-foreground shrink-0">
                            <span className="text-destructive font-medium">{i.onHand.toFixed(2)}</span>
                            <span className="text-muted-foreground/70"> / {i.reorderPoint.toFixed(2)} {i.unit}</span>
                          </span>
                        </div>
                        <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={`h-full ${tone} transition-all duration-700`}
                            style={{ width: `${Math.min(100, fillPct)}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>

            <div className="rounded-2xl border bg-card shadow-card">
              <div className="flex items-center justify-between p-4 pb-2">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4 text-brand" />
                  <h3 className="text-sm font-semibold tracking-tight">Upcoming POs</h3>
                </div>
                <Link href="/purchasing" className="text-2xs text-muted-foreground hover:text-foreground">
                  All purchasing →
                </Link>
              </div>
              {data.openPos.length === 0 ? (
                <div className="p-4 pt-2 text-xs text-muted-foreground">No open POs.</div>
              ) : (
                <ul className="px-2 pb-2">
                  {data.openPos.map((po) => (
                    <li key={po.id}>
                      <Link
                        href={`/purchasing/${po.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 hover:bg-accent/40 transition-colors"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-medium truncate">{po.supplier.name}</div>
                          <div className="text-2xs text-muted-foreground">
                            {po.status === "SENT" ? "Sent" : "Draft"}
                            {po.expectedAt ? ` · expected ${fmtDate(po.expectedAt)}` : ""}
                          </div>
                        </div>
                        <div className="num text-sm font-semibold shrink-0">{formatMoney(po.totalCents)}</div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* ─────── Jump strip ─────── */}
          <section className="space-y-4">
            <SectionTitle eyebrow="Jump in" title="One tap to common flows" />
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <JumpTile href="/cash/new" icon={<Wallet className="h-4 w-4" />} title="Close cash" hint="Run today's cash close" />
              <JumpTile href="/purchasing/invoices/new" icon={<Package className="h-4 w-4" />} title="New invoice" hint="Enter a supplier invoice" />
              <JumpTile href="/receipts" icon={<ScanLine className="h-4 w-4" />} title="Scan receipt" hint="AI per-unit cost extractor" />
              <JumpTile href="/inventory/counts" icon={<Sparkles className="h-4 w-4" />} title="Weekly count" hint="Reconcile inventory" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function FinanceTile({
  icon,
  label,
  value,
  tone,
  hint,
  sub,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone: "good" | "warn" | "bad" | "neutral";
  hint?: string;
  sub?: string;
}) {
  const text = tone === "good" ? "text-success" : tone === "bad" ? "text-destructive" : tone === "warn" ? "text-warning" : "text-foreground";
  return (
    <div className="group rounded-2xl border bg-card p-5 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <span className="rounded-lg bg-brand/10 p-1.5 text-brand">{icon}</span>
          <span className="text-2xs font-semibold uppercase tracking-wider">{label}</span>
        </div>
        {hint && <span className="text-2xs text-muted-foreground">{hint}</span>}
      </div>
      <div className={`mt-3 num text-3xl font-semibold leading-none tracking-tight ${text}`}>{value}</div>
      {sub && <div className="mt-2 text-2xs text-muted-foreground">{sub}</div>}
    </div>
  );
}

function JumpTile({
  href,
  icon,
  title,
  hint,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <Link
      href={href}
      className="group relative overflow-hidden rounded-2xl border bg-card p-4 shadow-card transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lift"
    >
      <div className="absolute -right-6 -top-6 h-20 w-20 rounded-full bg-brand/10 transition-transform duration-300 group-hover:scale-110" />
      <div className="relative flex items-start gap-3">
        <span className="rounded-xl bg-brand/15 p-2 text-brand">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-semibold tracking-tight">{title}</div>
          <div className="mt-0.5 text-2xs text-muted-foreground">{hint}</div>
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground transition-all group-hover:text-brand group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
      </div>
    </Link>
  );
}
