import Link from "next/link";
import { ArrowUpRight, Download } from "lucide-react";
import { getScope } from "@/lib/scope";
import { getDashboard, getPriorNetSales } from "@/modules/dashboard/queries";
import { getTopItems } from "@/modules/dashboard/items";
import { resolveRange } from "@/modules/dashboard/range";
import { getActiveEvent, listUpcomingEvents } from "@/modules/events/queries";
import { getInvoiceTracking, listOpenInvoicesDue } from "@/modules/invoices/queries";
import { pnlByEvent } from "@/modules/reports/queries";
import { fmtDate } from "@/lib/date";
import { formatMoney, formatMoneyHeadline, formatPercent, safeDivide } from "@/lib/money";
import { KpiStrip, type Kpi } from "@/components/dashboard/ledger/kpi-strip";
import { PeriodControl } from "@/components/dashboard/ledger/period-control";
import { PnlStatement } from "@/components/dashboard/ledger/pnl-statement";
import {
  TopItemsCard,
  InvoicesDueCard,
  UpcomingEventsCard,
} from "@/components/dashboard/ledger/rail-cards";
import { RevenueChart } from "@/components/dashboard/bento/revenue-chart";
import { ItemMixDonut } from "@/components/dashboard/bento/item-mix-donut";

export const dynamic = "force-dynamic";

/*
  Overview — the "ledger" layout.

  Statement first: one ruled KPI band, then the per-event P&L as the hero, with
  a narrow rail for what sold and what's owed. Everything on the page reads
  from a single resolved date range so the period control moves all of it at
  once.

  The revenue chart and item mix sit below the fold. They aren't in the ledger
  handoff, which covers roughly one screen, but they are the only day-by-day
  and category views in the app and dropping them would lose real function.
*/

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, scope] = await Promise.all([searchParams, getScope()]);
  const activeEvent = await getActiveEvent(scope.businessId);
  const range = await resolveRange(scope.businessId, params, activeEvent);
  const now = new Date();

  const [data, pnl, invoiceTracking, dueInvoices, priorNetSales, upcoming] = await Promise.all([
    getDashboard({
      businessId: scope.businessId,
      locationId: scope.locationId,
      eventId: range.eventId,
      eventRange: { start: range.start, end: range.end },
    }),
    pnlByEvent(scope.businessId, scope.locationId, { start: range.start, end: range.end }),
    getInvoiceTracking(scope.locationId),
    listOpenInvoicesDue(scope.locationId, 3),
    getPriorNetSales(scope.locationId, { start: range.start, end: range.end }),
    listUpcomingEvents(scope.businessId, now, 3),
  ]);

  const topItems = await getTopItems({
    locationId: scope.locationId,
    from: range.start,
    to: range.end,
    eventId: range.eventId,
    limit: 12,
  });

  const overall = pnl.find((c) => c.key === "overall");
  const netSalesCents = overall?.netSalesCents ?? 0;
  const profitCents = overall?.profitCents ?? 0;
  const txns = overall?.txns ?? 0;

  const deltaPct = priorNetSales ? ((netSalesCents - priorNetSales) / priorNetSales) * 100 : null;
  const avgTicketCents = txns > 0 ? Math.round(safeDivide(netSalesCents, txns)) : 0;

  const kpis: Kpi[] = [
    {
      label: "Net sales",
      value: formatMoneyHeadline(netSalesCents),
      tone: deltaPct === null ? "muted" : deltaPct >= 0 ? "success" : "danger",
      // "vs last season" isn't derivable — there is no season concept — so the
      // comparison is the preceding window of equal length, and says so.
      sub:
        deltaPct === null
          ? "No earlier period to compare"
          : `${deltaPct >= 0 ? "▲" : "▼"} ${formatPercent(Math.abs(deltaPct))} vs previous period`,
    },
    {
      label: "Profit",
      value: formatMoneyHeadline(profitCents, { signed: true }),
      sub: netSalesCents > 0 ? `${formatPercent(overall?.marginPct ?? 0)} margin` : "No sales in range",
    },
    {
      label: "Open invoices",
      value: formatMoneyHeadline(invoiceTracking.openBalanceCents),
      tone: invoiceTracking.openCount > 0 ? "brand" : "muted",
      sub:
        invoiceTracking.openCount === 0
          ? "Every bill closed"
          : `${invoiceTracking.openCount} open · oldest ${
              invoiceTracking.oldestOpen ? fmtDate(invoiceTracking.oldestOpen.date, "MMM d") : "—"
            }`,
    },
    {
      label: "Avg. ticket",
      value: avgTicketCents > 0 ? formatMoney(avgTicketCents) : "—",
      sub: `${topItems.totalQty.toLocaleString()} items · ${txns.toLocaleString()} tickets`,
    },
  ];

  // trends.*.x is already a formatted "MMM d" label — re-parsing it would lose
  // the year (new Date("Aug 21") lands in 2001).
  const salesPoints = data.trends.sales.map((s) => ({ x: s.x, y: s.y }));
  const costPoints = data.trends.labor.map((s) => ({ x: s.x, y: s.y }));

  const asDay = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
      {/* Breadcrumb + period control */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-[13px] font-normal tracking-normal text-muted-foreground">
          <span className="sr-only">Overview — </span>
          {range.scopeLabel} · <span className="text-foreground">{range.subjectLabel}</span> ·{" "}
          {range.dateLabel}
        </h1>
        <div className="-mx-4 overflow-x-auto px-4 scroll-contain sm:mx-0 sm:overflow-visible sm:px-0">
          <PeriodControl
            active={range.key}
            eventLabel={activeEvent?.name ?? null}
            from={asDay(range.start)}
            to={asDay(range.end)}
          />
        </div>
      </div>

      <KpiStrip items={kpis} />

      {/* Statement + rail */}
      <div className="mt-7 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="min-w-0">
          <header className="flex items-baseline justify-between gap-3">
            <h2 className="font-display text-xl font-semibold">Profit &amp; loss statement</h2>
            <a
              href="/api/exports/pnl"
              className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-brand-ink hover:underline"
            >
              Export CSV
              <Download className="h-3 w-3" aria-hidden />
            </a>
          </header>
          <div className="mt-3.5">
            {pnl.length > 1 ? (
              <PnlStatement columns={pnl} />
            ) : (
              <p className="panel p-6 text-sm text-muted-foreground">
                No events fall inside {range.dateLabel}. Pick a wider range, or add an event to start
                splitting sales and costs by where they happened.
              </p>
            )}
          </div>
        </section>

        <div className="flex min-w-0 flex-col gap-5">
          <TopItemsCard items={topItems.items} />
          <InvoicesDueCard invoices={dueInvoices} now={now} />
          <UpcomingEventsCard events={upcoming} />
        </div>
      </div>

      {/* Day-by-day and category views, below the statement. */}
      <div className="mt-7 grid gap-[18px] [&>*]:min-w-0 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="bento min-w-0 p-4 sm:p-[22px]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-5">
              <h2 className="text-base font-semibold">Revenue · day by day</h2>
              <span className="flex gap-3.5 text-xs text-muted-foreground">
                <span>● Net sales</span>
                <span className="text-brand-ink">● Labor cost</span>
              </span>
            </div>
            <Link
              href="/reports"
              className="grid h-7 w-7 place-items-center rounded-full border border-border transition-colors hover:bg-accent"
              aria-label="Reports"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <RevenueChart sales={salesPoints} costs={costPoints} label="Net sales and labor cost by day" />
        </div>

        <div className="bento min-w-0 p-4 sm:p-[22px]">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Item mix</h2>
            <Link
              href="/reports"
              className="grid h-7 w-7 place-items-center rounded-full border border-border transition-colors hover:bg-accent"
              aria-label="Item sales"
            >
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {topItems.byCategory.length > 0 ? (
            <ItemMixDonut slices={topItems.byCategory} totalQty={topItems.totalQty} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">
              {topItems.count === 0
                ? "No item-level sales yet. Upload the Square per-item CSV to see the mix."
                : `No item sales between ${fmtDate(range.start)} and ${fmtDate(range.end)}.`}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
