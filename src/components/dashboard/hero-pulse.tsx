"use client";
import * as React from "react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { CountUp } from "./count-up";
import { Spark } from "./spark";

// The marquee piece at the top of the dashboard. Big, breathing, single
// figure — the operator's "how are we doing today" answer in 0.5 seconds.
export function HeroPulse({
  netSalesCents,
  guestCount,
  tipsCents,
  spark,
  periodLabel,
  todayCents,
  yesterdayCents,
}: {
  netSalesCents: number;
  guestCount: number;
  tipsCents: number;
  spark: number[];
  periodLabel: string;
  todayCents: number;
  yesterdayCents: number;
}) {
  const deltaPct =
    yesterdayCents > 0 ? ((todayCents - yesterdayCents) / yesterdayCents) * 100 : null;
  const trendUp = (deltaPct ?? 0) >= 0;
  return (
    <div className="relative overflow-hidden rounded-xl border bg-card shadow-soft">
      {/* Single whisper-subtle accent wash — Swiss restraint */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div className="orb orb--brand h-[360px] w-[360px] -top-40 -right-24" />
      </div>

      <div className="relative grid gap-8 p-6 md:p-8 lg:grid-cols-[1.35fr_1fr] lg:items-end">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            <span className="text-2xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              {periodLabel}
            </span>
          </div>
          <div>
            <div className="text-2xs font-medium uppercase tracking-wider text-muted-foreground mb-1.5">Net sales</div>
            <CountUp
              value={netSalesCents / 100}
              format="currency"
              duration={900}
              className="display-num block text-[clamp(2.5rem,6vw,4.5rem)] font-bold text-foreground"
            />
            <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {deltaPct !== null && (
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                    trendUp ? "bg-success/12 text-success" : "bg-destructive/12 text-destructive"
                  }`}
                >
                  {trendUp ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
                  {trendUp ? "+" : ""}
                  {deltaPct.toFixed(1)}% vs yesterday
                </span>
              )}
              <span className="text-muted-foreground">
                <CountUp value={guestCount} className="num font-semibold text-foreground" /> transactions
              </span>
              <span className="text-muted-foreground">
                <CountUp value={tipsCents / 100} format="currency" className="num font-semibold text-foreground" /> tips
              </span>
            </div>
          </div>
        </div>

        <div className="text-brand">
          <Spark data={spark.length > 0 ? spark : [0, 0]} width={520} height={110} fill="hsl(var(--brand))" className="w-full" />
          <div className="mt-2 flex items-center justify-between text-2xs text-muted-foreground">
            <span>Net sales · daily</span>
            <span>latest →</span>
          </div>
        </div>
      </div>
    </div>
  );
}
