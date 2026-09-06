"use client";
import * as React from "react";
import { formatMoney } from "@/lib/money";

/*
  Day-by-day revenue: filled area + solid net-sales line, with a dashed labor
  line beneath it.

  The callout follows the pointer. Drag or hover across the plot and it reads
  out that day; let go and it falls back to the best sales day, which is the
  one an operator looks for by default.

  Touch uses `touch-action: pan-y` rather than `none`: a horizontal drag scrubs
  the chart, a vertical one still scrolls the page. Blocking both would trap
  the page behind the chart on a phone.
*/
type Point = { x: string; y: number };

// Short axis money ($6k, $850) so labels don't run into the plot area.
function compactAxis(v: number) {
  if (v >= 1000) {
    const k = v / 1000;
    return `$${k % 1 === 0 ? k : k.toFixed(1)}k`;
  }
  return `$${Math.round(v)}`;
}

const W = 800, H = 220, PAD_L = 40, PAD_R = 40, TOP = 40, BOT = 190;

export function RevenueChart({
  sales,
  costs,
  label,
}: {
  sales: Point[];
  costs: Point[];
  label: string;
}) {
  const svgRef = React.useRef<SVGSVGElement>(null);
  const [hover, setHover] = React.useState<number | null>(null);

  const hasCosts = costs.length === sales.length && costs.length > 0;

  const peak = Math.max(...sales.map((p) => p.y), ...costs.map((p) => p.y), 1);
  const step = sales.length > 1 ? (W - PAD_L - PAD_R) / (sales.length - 1) : 0;
  const xAt = React.useCallback((i: number) => PAD_L + i * step, [step]);
  const yAt = React.useCallback((v: number) => BOT - (v / peak) * (BOT - TOP), [peak]);

  // Pointer x -> nearest day. Reading through the viewBox keeps this correct
  // at any rendered width, since the SVG scales rather than reflows.
  const pick = React.useCallback(
    (clientX: number) => {
      const el = svgRef.current;
      if (!el || step === 0) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0) return;
      const vx = ((clientX - r.left) / r.width) * W;
      const i = Math.round((vx - PAD_L) / step);
      setHover(Math.min(Math.max(i, 0), sales.length - 1));
    },
    [step, sales.length],
  );

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight" && e.key !== "Escape") return;
    e.preventDefault();
    if (e.key === "Escape") return setHover(null);
    setHover((h) => {
      const from = h ?? 0;
      const next = e.key === "ArrowRight" ? from + 1 : from - 1;
      return Math.min(Math.max(next, 0), sales.length - 1);
    });
  };

  if (sales.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Not enough sales days yet to chart a trend.
      </p>
    );
  }

  const line = (pts: Point[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i)} ${yAt(p.y)}`).join(" ");
  const area = `${line(sales)} L${xAt(sales.length - 1)} ${BOT} L${PAD_L} ${BOT} Z`;

  // Resting state marks the best sales day; hovering overrides it.
  const bestIdx = sales.reduce((best, p, i) => (p.y > sales[best].y ? i : best), 0);
  const activeIdx = hover ?? bestIdx;
  const active = sales[activeIdx];
  const activeCost = hasCosts ? costs[activeIdx] : null;
  const markX = xAt(activeIdx), markY = yAt(active.y);

  // Two lines when there is a labor figure to show alongside.
  const headline = `${active.x} · ${formatMoney(Math.round(active.y * 100))}`;
  const sub = activeCost ? `Labor ${formatMoney(Math.round(activeCost.y * 100))}` : null;
  // SVG can't measure text before paint, so size the pill from character count.
  const chars = Math.max(headline.length, sub?.length ?? 0);
  const pillW = Math.min(Math.max(chars * 6.6 + 24, 96), W - 2 * PAD_L);
  const pillH = sub ? 42 : 28;
  const pillX = Math.min(Math.max(markX, PAD_L + pillW / 2), W - PAD_R - pillW / 2);

  // Gridlines snap to a round step (1/2/5 x 10^n) so the axis reads
  // "$2,000" rather than "$2,076.07".
  const roughStep = peak / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(roughStep, 1))));
  const gridStep = [1, 2, 5, 10].map((m) => m * mag).find((v) => v >= roughStep) ?? mag * 10;
  const gridVals: number[] = [];
  for (let v = gridStep; v <= peak * 1.0001; v += gridStep) gridVals.push(v);
  const ticks = [0, Math.floor(sales.length / 2), sales.length - 1].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      className="mt-3.5 block cursor-crosshair overflow-visible outline-none [touch-action:pan-y]"
      role="img"
      aria-label={`${label}. ${activeIdx === hover ? "Showing" : "Best day"} ${headline}. Use the arrow keys to step through days.`}
      tabIndex={0}
      onPointerMove={(e) => pick(e.clientX)}
      onPointerDown={(e) => pick(e.clientX)}
      onPointerLeave={() => setHover(null)}
      onPointerCancel={() => setHover(null)}
      onBlur={() => setHover(null)}
      onKeyDown={onKey}
    >
      <defs>
        <linearGradient id="revArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="hsl(var(--chart-ink))" stopOpacity=".18" />
          <stop offset="1" stopColor="hsl(var(--chart-ink))" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g stroke="hsl(var(--border))" strokeDasharray="3 5">
        {gridVals.map((v) => <line key={v} x1="0" y1={yAt(v)} x2={W} y2={yAt(v)} />)}
      </g>
      <g fontSize="10" fill="hsl(var(--muted-foreground))">
        {gridVals.map((v) => (
          <text key={v} x="0" y={yAt(v) - 4}>{compactAxis(v)}</text>
        ))}
      </g>
      <path d={area} fill="url(#revArea)" />
      <path d={line(sales)} fill="none" stroke="hsl(var(--chart-ink))" strokeWidth="2.2" strokeLinejoin="round" />
      {hasCosts && (
        <path d={line(costs)} fill="none" stroke="hsl(var(--brand))" strokeWidth="1.6" strokeDasharray="4 4" />
      )}

      <line x1={markX} y1={markY} x2={markX} y2={BOT} stroke="hsl(var(--chart-ink))" strokeWidth="1" />
      {activeCost && (
        <circle cx={markX} cy={yAt(activeCost.y)} r="3.5" fill="hsl(var(--brand))" />
      )}
      <circle cx={markX} cy={markY} r="5" fill="hsl(var(--card))" stroke="hsl(var(--chart-ink))" strokeWidth="2" />

      <rect x={pillX - pillW / 2} y="6" width={pillW} height={pillH} rx="14" fill="hsl(var(--chart-ink))" />
      {/* --card, not --espresso-foreground: chart-ink inverts to cream in dark
          mode and the old fill inverted with it, leaving cream on cream. */}
      <text
        x={pillX}
        y={sub ? 22 : 25}
        textAnchor="middle"
        fontSize="12"
        fontWeight="600"
        fill="hsl(var(--card))"
      >
        {headline}
      </text>
      {sub && (
        <text x={pillX} y="37" textAnchor="middle" fontSize="10.5" fill="hsl(var(--card))" opacity=".75">
          {sub}
        </text>
      )}

      <g fontSize="10" fill="hsl(var(--muted-foreground))" textAnchor="middle">
        {ticks.map((i) => <text key={i} x={xAt(i)} y="212">{sales[i].x}</text>)}
      </g>
    </svg>
  );
}
