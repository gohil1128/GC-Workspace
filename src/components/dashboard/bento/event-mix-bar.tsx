import { formatMoney, formatPercent } from "@/lib/money";

// Proportional pill bar showing each event's share of net sales. Segment
// widths are the real revenue split; the fill styles cycle so adjacent
// segments stay distinguishable (design 1a: dark, amber, hatched, outlined).
export type MixSegment = { name: string; netSalesCents: number; sharePct: number };

const FILLS = [
  "bg-espresso text-espresso-foreground",
  "bg-amber text-amber-foreground",
  "text-foreground",
  "border-[1.5px] border-espresso text-foreground",
];
const HATCH = {
  backgroundImage:
    "repeating-linear-gradient(135deg, hsl(33 36% 84%) 0 3px, hsl(40 47% 94%) 3px 7px)",
};

export function EventMixBar({ segments }: { segments: MixSegment[] }) {
  if (segments.length === 0) return null;
  const cols = segments.map((s) => `${Math.max(s.sharePct, 4)}fr`).join(" ");
  return (
    <div className="max-w-[760px]">
      <div className="mb-2 grid gap-1.5 text-xs text-muted-foreground" style={{ gridTemplateColumns: cols }}>
        {segments.map((s) => (
          <span key={s.name} className="truncate">{s.name}</span>
        ))}
      </div>
      <div className="grid gap-1.5" style={{ gridTemplateColumns: cols }}>
        {segments.map((s, i) => (
          <div
            key={s.name}
            className={`flex h-[34px] items-center overflow-hidden whitespace-nowrap rounded-full px-3.5 text-xs font-semibold ${FILLS[i % FILLS.length]}`}
            style={i % FILLS.length === 2 ? HATCH : undefined}
            title={`${s.name} · ${formatMoney(s.netSalesCents)} · ${formatPercent(s.sharePct)}`}
          >
            {/* The widest segment gets the money too; narrow ones show only %. */}
            {formatPercent(s.sharePct, 0)}
            {s.sharePct >= 30 && <span className="ml-1.5">· {formatMoney(s.netSalesCents)}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
