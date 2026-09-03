import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatMoney, formatPercent } from "@/lib/money";
import type { PnlColumn } from "@/modules/reports/queries";

// P&L rolled up per event, with an Overall footer. Costs are everything that
// isn't sales: COGS + labor + expenses + event fees.
const GRID = "grid grid-cols-[1.5fr_1fr_1fr_1fr_90px] gap-2 items-center";

function marginVariant(pct: number, profitCents: number) {
  if (profitCents < 0) return "bg-destructive-muted text-destructive";
  if (pct >= 30) return "bg-success-muted text-success";
  return "bg-warning-muted text-warning";
}

export function PnlByEvent({ columns }: { columns: PnlColumn[] }) {
  const events = columns.filter((c) => c.key !== "overall");
  const overall = columns.find((c) => c.key === "overall");
  const costsOf = (c: PnlColumn) => c.cogsCents + c.laborCents + c.opexCents + c.feeCents;

  return (
    <div className="bento p-[22px]">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">P&amp;L by event</span>
        <Link
          href="/reports"
          className="grid h-7 w-7 place-items-center rounded-full border border-border transition-colors hover:bg-accent"
          aria-label="Full reports"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {events.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No event data yet. Tag invoices and sales to an event to see its P&amp;L.
        </p>
      ) : (
        <div className="overflow-x-auto scroll-fluid">
          <div className="min-w-[520px]">
            <div className={`${GRID} border-b border-border px-3 pb-2 pt-4 text-2xs text-muted-foreground`}>
              <span>Event</span>
              <span className="text-right">Net sales</span>
              <span className="text-right">Costs</span>
              <span className="text-right">Profit</span>
              <span className="text-right">Margin</span>
            </div>

            {events.map((c) => (
              <div key={c.key} className={`${GRID} border-b border-border/60 p-3 text-[13px]`}>
                <span className="flex items-center gap-2.5 font-medium">
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ background: c.color ?? "hsl(var(--muted-foreground))" }}
                  />
                  <span className="truncate">{c.name}</span>
                </span>
                <span className="text-right num">{formatMoney(c.netSalesCents)}</span>
                <span className="text-right num text-muted-foreground">
                  {costsOf(c) > 0 ? `−${formatMoney(costsOf(c))}` : "—"}
                </span>
                <span className={`text-right num font-semibold ${c.profitCents < 0 ? "text-destructive" : ""}`}>
                  {formatMoney(c.profitCents, { signed: true })}
                </span>
                <span className="text-right">
                  <span className={`rounded-full px-2.5 py-1 text-2xs font-semibold ${marginVariant(c.marginPct, c.profitCents)}`}>
                    {c.netSalesCents > 0 ? formatPercent(c.marginPct) : "—"}
                  </span>
                </span>
              </div>
            ))}

            {overall && (
              <div className={`${GRID} mt-1 border-t border-espresso px-3 pb-1 pt-3.5 text-[13px]`}>
                <span className="font-semibold">Overall</span>
                <span className="text-right num font-semibold">{formatMoney(overall.netSalesCents)}</span>
                <span className="text-right num text-muted-foreground">
                  {costsOf(overall) > 0 ? `−${formatMoney(costsOf(overall))}` : "—"}
                </span>
                <span className={`display-num text-right text-base font-bold ${overall.profitCents < 0 ? "text-destructive" : ""}`}>
                  {formatMoney(overall.profitCents, { signed: true })}
                </span>
                <span className="text-right font-semibold">
                  {overall.netSalesCents > 0 ? formatPercent(overall.marginPct) : "—"}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
