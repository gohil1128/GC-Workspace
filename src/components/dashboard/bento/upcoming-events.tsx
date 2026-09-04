import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { fmtDate } from "@/lib/date";

// Next few events. The first one is highlighted on the dark chip, matching
// the design's "next up" treatment.
export type UpcomingEvent = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  feeCents: number;
  color: string | null;
};

export function UpcomingEvents({ events }: { events: UpcomingEvent[] }) {
  return (
    <div className="bento p-4 sm:p-[22px]">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">Upcoming events</span>
        <Link
          href="/settings"
          className="grid h-7 w-7 place-items-center rounded-full border border-border transition-colors hover:bg-accent"
          aria-label="Manage events"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No upcoming events. Add one in Settings to track its P&amp;L.
        </p>
      ) : (
        <div className="mt-4 flex flex-col gap-2.5">
          {events.map((e, i) => (
            <div
              key={e.id}
              className={
                i === 0
                  ? "rounded-2xl bg-espresso px-3.5 py-3 text-espresso-foreground"
                  : "rounded-2xl border border-border bg-card px-3.5 py-3"
              }
            >
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                {i !== 0 && (
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: e.color ?? "hsl(var(--muted-foreground))" }}
                  />
                )}
                <span className="truncate">{e.name}</span>
              </div>
              <div className={`mt-0.5 text-2xs ${i === 0 ? "opacity-70" : "text-muted-foreground"}`}>
                {fmtDate(e.startDate)}
                {e.endDate.getTime() !== e.startDate.getTime() && <> – {fmtDate(e.endDate)}</>}
                {e.feeCents > 0 && <> · Fee {formatMoney(e.feeCents)}</>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
