import Link from "next/link";
import { CalendarDays, Coffee, FileText, ArrowUpRight } from "lucide-react";
import { getScope } from "@/lib/scope";
import { auth } from "@/lib/auth";
import { getDashboard } from "@/modules/dashboard/queries";
import { getTopItems } from "@/modules/dashboard/items";
import { getActiveEvent, getAllEventsRange, listAllEvents, listUpcomingEvents } from "@/modules/events/queries";
import { getInvoiceTracking } from "@/modules/invoices/queries";
import { pnlByEvent } from "@/modules/reports/queries";
import { fmtDate } from "@/lib/date";
import { formatMoney } from "@/lib/money";
import { EventMixBar } from "@/components/dashboard/bento/event-mix-bar";
import { UpcomingEvents } from "@/components/dashboard/bento/upcoming-events";
import { PnlByEvent } from "@/components/dashboard/bento/pnl-by-event";
import { InvoiceTracking } from "@/components/dashboard/bento/invoice-tracking";
import { RevenueChart } from "@/components/dashboard/bento/revenue-chart";
import { ItemMixDonut } from "@/components/dashboard/bento/item-mix-donut";

export const dynamic = "force-dynamic";

function greeting(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function DashboardPage() {
  const [session, scope] = await Promise.all([auth(), getScope()]);
  const activeEvent = await getActiveEvent(scope.businessId);
  const allEventsRange = activeEvent ? null : await getAllEventsRange(scope.businessId);
  const dashboardRange = activeEvent
    ? { start: activeEvent.startDate, end: activeEvent.endDate }
    : allEventsRange;

  const now = new Date();
  const [data, pnl, invoiceTracking, allEvents, upcoming] = await Promise.all([
    getDashboard({
      businessId: scope.businessId,
      locationId: scope.locationId,
      days: 14,
      eventId: activeEvent?.id ?? null,
      eventRange: dashboardRange,
    }),
    pnlByEvent(scope.businessId, scope.locationId),
    getInvoiceTracking(scope.locationId),
    listAllEvents(scope.businessId),
    listUpcomingEvents(scope.businessId, now, 3),
  ]);

  const topItems = await getTopItems({
    locationId: scope.locationId,
    from: data.period.from,
    to: data.period.to,
    eventId: activeEvent?.id ?? null,
    limit: 12,
  });

  const firstName = (session?.user?.name ?? "there").split(" ")[0];

  // Event-mix bar: real share of net sales per event, biggest first.
  const eventCols = pnl.filter((c) => c.key !== "overall" && c.netSalesCents > 0);
  const mixTotal = eventCols.reduce((a, c) => a + c.netSalesCents, 0);
  const mixSegments = eventCols
    .map((c) => ({
      name: c.name,
      netSalesCents: c.netSalesCents,
      sharePct: mixTotal > 0 ? (c.netSalesCents / mixTotal) * 100 : 0,
    }))
    .sort((a, b) => b.netSalesCents - a.netSalesCents)
    .slice(0, 4);

  // Cost line for the chart: labor is the only real per-day cost series the
  // dashboard query returns, so that's what the dashed line shows.
  // trends.*.x is already a formatted "MMM d" label — re-parsing it would
  // lose the year (new Date("Aug 21") lands in 2001).
  const salesPoints = data.trends.sales.map((s) => ({ x: s.x, y: s.y }));
  const costPoints = data.trends.labor.map((s) => ({ x: s.x, y: s.y }));

  const periodLabel = activeEvent
    ? `${activeEvent.name} · ${fmtDate(data.period.from)} – ${fmtDate(data.period.to)}`
    : `All events · ${fmtDate(data.period.from)} – ${fmtDate(data.period.to)}`;

  return (
    <div className="mx-auto max-w-[1400px] px-4 pb-10 pt-2 sm:px-6 lg:px-8">
      {/* Greeting + the three headline counts */}
      <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="display-num text-[30px] font-medium sm:text-[40px]">
            {greeting(now.getHours())}, {firstName}
          </h1>
          <div className="mt-2.5 text-[13px] text-muted-foreground">
            {scope.locationName} · {periodLabel}
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 sm:flex sm:flex-wrap sm:gap-10">
          <StatCluster icon={<CalendarDays className="h-3.5 w-3.5" />} value={allEvents.length} label="Events" />
          <StatCluster icon={<Coffee className="h-3.5 w-3.5" />} value={topItems.totalQty} label="Items sold" />
          <StatCluster icon={<FileText className="h-3.5 w-3.5" />} value={invoiceTracking.totalCount} label="Invoices" />
        </div>
      </div>

      {/* Event revenue mix */}
      {mixSegments.length > 0 && (
        <div className="mt-7">
          <EventMixBar segments={mixSegments} />
        </div>
      )}

      {/* Bento grid — 320px | 1fr | 300px on desktop, stacking down */}
      <div className="mt-7 grid gap-[18px] [&>*]:min-w-0 lg:grid-cols-[320px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_300px]">
        <UpcomingEvents events={upcoming} />
        <PnlByEvent columns={pnl} />
        <div className="min-w-0 lg:col-span-2 xl:col-span-1">
          <InvoiceTracking
            paidCount={invoiceTracking.paidCount}
            openCount={invoiceTracking.openCount}
            openBalanceCents={invoiceTracking.openBalanceCents}
            oldestOpen={invoiceTracking.oldestOpen}
            recentStatuses={invoiceTracking.recentStatuses}
          />
        </div>

        <div className="bento min-w-0 p-4 sm:p-[22px] lg:col-span-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-5">
              <span className="text-base font-semibold">Revenue · day by day</span>
              <span className="flex gap-3.5 text-xs text-muted-foreground">
                <span>● Net sales</span>
                <span className="text-brand">● Labor cost</span>
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
            <span className="text-base font-semibold">Item mix</span>
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
              No item-level sales yet. Upload the Square per-item CSV to see the mix.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCluster({ icon, value, label }: { icon: React.ReactNode; value: number; label: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className="hidden h-[26px] w-[26px] place-items-center rounded-lg border border-border bg-card text-muted-foreground sm:grid">
        {icon}
      </span>
      <div>
        <div className="display-num text-[26px] font-medium sm:text-[38px]">{value.toLocaleString()}</div>
        <div className="mt-1 text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}
