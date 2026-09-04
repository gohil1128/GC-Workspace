import { formatMoney } from "@/lib/money";

// Day-by-day revenue: filled area + solid net-sales line, with a dashed cost
// line beneath it and a callout on the best day (design 1a).
type Point = { x: string; y: number };

// Short axis money ($6k, $850) so labels don't run into the plot area.
function compactAxis(v: number) {
  if (v >= 1000) {
    const k = v / 1000;
    return `$${k % 1 === 0 ? k : k.toFixed(1)}k`;
  }
  return `$${Math.round(v)}`;
}

export function RevenueChart({
  sales,
  costs,
  label,
}: {
  sales: Point[];
  costs: Point[];
  label: string;
}) {
  if (sales.length < 2) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        Not enough sales days yet to chart a trend.
      </p>
    );
  }

  const W = 800, H = 220, PAD_L = 40, PAD_R = 40, TOP = 40, BOT = 190;
  const peak = Math.max(...sales.map((p) => p.y), ...costs.map((p) => p.y), 1);
  const step = (W - PAD_L - PAD_R) / (sales.length - 1);
  const xAt = (i: number) => PAD_L + i * step;
  const yAt = (v: number) => BOT - (v / peak) * (BOT - TOP);

  const line = (pts: Point[]) => pts.map((p, i) => `${i === 0 ? "M" : "L"}${xAt(i)} ${yAt(p.y)}`).join(" ");
  const area = `${line(sales)} L${xAt(sales.length - 1)} ${BOT} L${PAD_L} ${BOT} Z`;

  // Callout marks the best sales day — the one an operator actually looks for.
  const bestIdx = sales.reduce((best, p, i) => (p.y > sales[best].y ? i : best), 0);
  const best = sales[bestIdx];
  const bestX = xAt(bestIdx), bestY = yAt(best.y);
  const calloutX = Math.min(Math.max(bestX, 96), W - 96);

  // Gridlines snap to a round step (1/2/5 x 10^n) so the axis reads
  // "$2,000" rather than "$2,076.07".
  const roughStep = peak / 4;
  const mag = Math.pow(10, Math.floor(Math.log10(Math.max(roughStep, 1))));
  const gridStep = [1, 2, 5, 10].map((m) => m * mag).find((v) => v >= roughStep) ?? mag * 10;
  const gridVals: number[] = [];
  for (let v = gridStep; v <= peak * 1.0001; v += gridStep) gridVals.push(v);
  const ticks = [0, Math.floor(sales.length / 2), sales.length - 1].filter((v, i, a) => a.indexOf(v) === i);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} className="mt-3.5 block overflow-visible">
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
      {costs.length === sales.length && (
        <path d={line(costs)} fill="none" stroke="hsl(var(--brand))" strokeWidth="1.6" strokeDasharray="4 4" />
      )}
      <line x1={bestX} y1={bestY} x2={bestX} y2={BOT} stroke="hsl(var(--chart-ink))" strokeWidth="1" />
      <circle cx={bestX} cy={bestY} r="5" fill="hsl(var(--card))" stroke="hsl(var(--chart-ink))" strokeWidth="2" />
      <rect x={calloutX - 56} y="8" width="112" height="28" rx="14" fill="hsl(var(--chart-ink))" />
      <text x={calloutX} y="27" textAnchor="middle" fontSize="12" fontWeight="600" fill="hsl(var(--espresso-foreground))">
        {formatMoney(Math.round(best.y * 100))}
      </text>
      <g fontSize="10" fill="hsl(var(--muted-foreground))" textAnchor="middle">
        {ticks.map((i) => <text key={i} x={xAt(i)} y="212">{sales[i].x}</text>)}
      </g>
      <title>{label}</title>
    </svg>
  );
}
