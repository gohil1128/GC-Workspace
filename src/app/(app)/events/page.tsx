import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { getScope } from "@/lib/scope";
import { listEventsWithTotals } from "@/modules/events/detail";
import { fmtDate } from "@/lib/date";
import { formatMoney, formatPercent } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/mobile-list";

export const dynamic = "force-dynamic";

// Pick-an-event index. Each card opens everything recorded against that event.
export default async function EventsPage() {
  const scope = await getScope();
  const rows = await listEventsWithTotals(scope.businessId, scope.locationId);
  const now = new Date();

  return (
    <div>
      <PageHeader
        eyebrow="Events"
        title="Events"
        description="Pick an event to see everything recorded against it — sales, items, invoices, fees, labor and cash."
      />
      <div className="mx-auto max-w-[1400px] px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        {rows.length === 0 ? (
          <EmptyState
            icon={<CalendarDays className="h-5 w-5" />}
            title="No events yet"
            description="Add an event in Settings, then tag sales and invoices to it to build its P&L."
            action={
              <Link
                href="/settings"
                className="rounded-full bg-espresso px-4 py-2 text-sm text-espresso-foreground"
              >
                Go to Settings
              </Link>
            }
          />
        ) : (
          // [&>*]:min-w-0 — grid children default to min-width:auto, which let
          // these cards hold a ~420px intrinsic width and overflow the page on
          // a phone, taking the fixed tab bar off-screen with it.
          <ul className="grid gap-3 [&>*]:min-w-0 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map(({ event, column }) => {
              const upcoming = event.endDate >= now;
              return (
                <li key={event.id} className="min-w-0">
                  <Link
                    href={`/events/${event.id}`}
                    className="bento block h-full p-4 transition-colors hover:bg-accent/40 sm:p-5"
                  >
                    <div className="flex min-w-0 items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span
                          aria-hidden
                          className="h-2.5 w-2.5 shrink-0 rounded-[3px]"
                          style={{ background: event.color ?? "hsl(var(--ink-400))" }}
                        />
                        <span className="truncate text-[15px] font-semibold" title={event.name}>
                          {event.name}
                        </span>
                      </div>
                      {upcoming && (
                        <span className="shrink-0 rounded-full bg-brand-muted px-2 py-0.5 text-2xs font-semibold text-brand-ink">
                          Upcoming
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {fmtDate(event.startDate, "MMM d")}
                      {event.endDate.getTime() !== event.startDate.getTime() && (
                        <> – {fmtDate(event.endDate, "MMM d, yyyy")}</>
                      )}
                      {event.feeCents > 0 && <> · fee {formatMoney(event.feeCents)}</>}
                    </div>

                    <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3">
                      <Stat label="Net sales" value={formatMoney(column?.netSalesCents ?? 0)} />
                      <Stat
                        label="Profit"
                        value={formatMoney(column?.profitCents ?? 0, { signed: true })}
                        tone={
                          (column?.profitCents ?? 0) < 0
                            ? "text-destructive"
                            : (column?.profitCents ?? 0) > 0
                              ? "text-success"
                              : undefined
                        }
                      />
                      <Stat label="Margin" value={formatPercent(column?.marginPct ?? 0)} />
                    </dl>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-2xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className={`num mt-0.5 truncate text-[13px] font-semibold ${tone ?? ""}`}>{value}</dd>
    </div>
  );
}
