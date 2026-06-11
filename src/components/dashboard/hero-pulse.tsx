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
    <div className="relative overflow-hidden rounded-[28px] border bg-card shadow-lift">
      {/* Ambient gradient orbs */}
      <div aria-hidden className="absolute inset-0 overflow-hidden">
        <div className="orb orb--brand h-[420px] w-[420px] -top-32 -left-24" />
        <div className="orb orb--success h-[300px] w-[300px] -bottom-24 -right-16" style={{ animationDelay: "2s" }} />
        <div className="orb orb--warning h-[220px] w-[220px] top-1/2 right-1/3" style={{ animationDelay: "4s" }} />
      </div>

      <div className="relative grid gap-8 p-6 md:p-10 lg:grid-cols-[1.4fr_1fr] lg:items-end">
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-brand animate-pulse" />
            <span className="text-2xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {periodLabel}
            </span>
          </div>
          <div>
            <CountUp
              value={netSalesCents / 100}
              format="currency"
              duration={1100}
              className="display-num block text-[clamp(2.75rem,7vw,5.25rem)] font-semibold text-foreground"
            />
            <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
              {deltaPct !== null && (
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                    trendUp ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
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
          <Spark data={spark.length > 0 ? spark : [0, 0]} width={520} height={120} fill="hsl(var(--brand))" className="w-full" />
          <div className="mt-2 flex items-center justify-between text-2xs text-muted-foreground">
            <span>Net sales · daily</span>
            <span>last point = most recent</span>
          </div>
        </div>
      </div>
    </div>
  );
}
