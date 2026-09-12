import Link from "next/link";
import { CalendarDays } from "lucide-react";
import { requireCapability } from "@/lib/scope";
import { listEventsWithTotals } from "@/modules/events/detail";
import { fmtDate } from "@/lib/date";
import { formatMoney, formatPercent } from "@/lib/money";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/mobile-list";
import { cn } from "@/lib/utils";
import {
  EVENT_FILTERS,
  STATUS_LABELS,
  eventStatus,
  matchesFilter,
  type EventFilter,
  type EventStatus,
} from "@/modules/events/status";

export const dynamic = "force-dynamic";

// Pick-an-event index. Each card opens everything recorded against that event.
export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [params, scope] = await Promise.all([searchParams, requireCapability("events")]);
  const all = await listEventsWithTotals(scope.businessId, scope.locationId);
  const now = new Date();

  const raw = Array.isArray(params.show) ? params.show[0] : params.show;
  const filter: EventFilter =
    (EVENT_FILTERS.find((f) => f.key === raw)?.key as EventFilter) ?? "all";

  const classified = all.map((r) => ({
    ...r,
    status: eventStatus(r.column, r.event, now, r.ownSpendCents),
  }));
  const counts = classified.reduce<Record<string, number>>((acc, r) => {
    acc[r.status] = (acc[r.status] ?? 0) + 1;
    return acc;
  }, {});
  const rows = classified.filter((r) => matchesFilter(r.status, filter));

  return (
    <div>
      <PageHeader
        eyebrow="Events"
        title="Events"
        description="Pick an event to see everything recorded against it — sales, items, invoices, fees, labor and cash."
      />
      <div className="mx-auto max-w-[1400px] px-4 pb-12 pt-4 sm:px-6 lg:px-8">
        {all.length > 0 && (
          <div className="mb-4 flex flex-wrap items-center gap-1.5">
            {EVENT_FILTERS.map((f) => {
              const n = f.key === "all" ? all.length : (counts[f.key] ?? 0);
              const active = filter === f.key;
              return (
                <Link
                  key={f.key}
                  href={f.key === "all" ? "/events" : `/events?show=${f.key}`}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "touch-target inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors",
                    active
                      ? "border-espresso bg-espresso font-semibold text-espresso-foreground"
                      : "border-input bg-card text-secondary-foreground hover:bg-accent",
                    // A segment that would show nothing still renders, so the
                    // set of filters doesn't shift around as data changes —
                    // but it says up front that it is empty.
                    n === 0 && !active && "opacity-55",
                  )}
                >
                  {f.label}
                  <span className={cn("num text-2xs", active ? "opacity-80" : "text-muted-foreground")}>{n}</span>
                </Link>
              );
            })}
          </div>
        )}

        {all.length === 0 ? (
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
        ) : rows.length === 0 ? (
          <p className="bento p-6 text-center text-sm text-muted-foreground">
            Nothing matches that filter right now.{" "}
            <Link href="/events" className="text-brand-ink hover:underline">
              Show all {all.length}
            </Link>
          </p>
        ) : (
          // [&>*]:min-w-0 — grid children default to min-width:auto, which let
          // these cards hold a ~420px intrinsic width and overflow the page on
          // a phone, taking the fixed tab bar off-screen with it.
          <ul className="grid gap-3 [&>*]:min-w-0 sm:grid-cols-2 xl:grid-cols-3">
            {rows.map(({ event, column, status, ownSpendCents }) => {
              const lost = status === "loss";
              return (
                <li key={event.id} className="min-w-0">
                  <Link
                    href={`/events/${event.id}`}
                    className={cn(
                      "bento block h-full p-4 transition-colors sm:p-5",
                      // A card that lost money on real trade is tinted, so a
                      // scan down the list finds it without reading a minus
                      // sign. Stocked-up cards deliberately stay neutral —
                      // they are a purchase, not a problem.
                      lost
                        ? "border-destructive/30 bg-destructive-muted/45 hover:bg-destructive-muted/65"
                        : "hover:bg-accent/40",
                    )}
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
                    </div>
                    {/* The badge sits on the date line rather than beside the
                        title: "Pre-purchased inventory" is long enough that
                        sharing the top row truncated event names to
                        "Chai Worksh…", and the name is the thing you scan for. */}
                    <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {fmtDate(event.startDate, "MMM d")}
                        {event.endDate.getTime() !== event.startDate.getTime() && (
                          <> – {fmtDate(event.endDate, "MMM d, yyyy")}</>
                        )}
                        {event.feeCents > 0 && <> · fee {formatMoney(event.feeCents)}</>}
                      </span>
                      <StatusBadge status={status} />
                    </div>

                    {(column?.txns ?? 0) === 0 ? (
                      /* Nothing has sold, so net sales, profit and margin are
                         not results — they are an artefact of costs spread
                         across every event. An upcoming market was showing
                         "Profit −$122.13" before this, which reads as a loss
                         on an event that has not happened. */
                      <dl className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3">
                        {/* Its own spend, not the P&L profit — that would fold
                            in the share of costs spread across every event. */}
                        <Stat label="Spent so far" value={formatMoney(ownSpendCents)} />
                        <Stat label="Sold" value="Nothing yet" />
                      </dl>
                    ) : (
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
                    )}
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

/*
  One badge per card, naming what the numbers underneath actually are.
  "Pre-purchased inventory" is the one that earns its place: without it, money
  spent stocking up for an event that has not happened is indistinguishable
  from an event that traded and lost.
*/
function StatusBadge({ status }: { status: EventStatus }) {
  if (status === "none") return null;
  // Paired tokens only. `bg-beige text-ink-700` read fine in light and came
  // out at 1.08:1 in dark, because beige is a fixed cream while ink inverts.
  const tone: Record<Exclude<EventStatus, "none">, string> = {
    upcoming: "bg-brand-muted text-brand-ink",
    stocked: "bg-secondary text-secondary-foreground",
    profit: "bg-success-muted text-success",
    loss: "bg-destructive text-destructive-foreground",
  };
  return (
    <span
      className={cn(
        "shrink-0 whitespace-nowrap rounded-full px-2 py-0.5 text-2xs font-semibold",
        tone[status],
      )}
    >
      {STATUS_LABELS[status]}
    </span>
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
