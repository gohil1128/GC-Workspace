import { formatMoney, formatPercent } from "@/lib/money";
import { Sparkles } from "lucide-react";
import { categoryStyle } from "@/modules/items/categories";

type Item = {
  itemName: string;
  category: string | null;
  qty: number;
  netSalesCents: number;
  txCount: number;
  sharePct: number;
};

type CategoryRollup = {
  category: string;
  netSalesCents: number;
  qty: number;
  sharePct: number;
};

export function TopItems({
  items,
  byCategory = [],
  totalCents,
  totalQty,
}: {
  items: Item[];
  byCategory?: CategoryRollup[];
  totalCents: number;
  totalQty: number;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-8 shadow-card text-center">
        <Sparkles className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
        <div className="text-sm font-medium">No item-level sales yet</div>
        <p className="mt-1 max-w-md mx-auto text-xs text-muted-foreground">
          Upload the Square <em>per-item</em> CSV from{" "}
          <a href="/settings/integrations" className="underline">Settings → Integrations</a>{" "}
          to see what sold (and how much) here.
        </p>
      </div>
    );
  }

  const topShare = items[0]?.sharePct ?? 0;

  return (
    <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
      <div className="grid grid-cols-3 divide-x border-b bg-muted/20">
        <Stat label="Items sold" value={totalQty.toLocaleString()} />
        <Stat label="Item revenue" value={formatMoney(totalCents)} />
        <Stat label="Top item share" value={formatPercent(topShare)} />
      </div>

      {/* Category rollup — Hot Chai / Cold Chais / Food / Tips / Other */}
      {byCategory.length > 0 && (
        <div className="border-b px-4 py-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">By category</span>
            <a href="/settings/integrations" className="text-2xs text-muted-foreground hover:text-foreground">Edit categories →</a>
          </div>
          {/* Stacked share bar */}
          <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
            {byCategory.map((c) => (
              <div
                key={c.category}
                className={`${categoryStyle(c.category).bar} h-full`}
                style={{ width: `${c.sharePct}%` }}
                title={`${c.category}: ${formatMoney(c.netSalesCents)} (${formatPercent(c.sharePct)})`}
              />
            ))}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
            {byCategory.map((c) => {
              const s = categoryStyle(c.category);
              return (
                <div key={c.category} className="flex items-center gap-1.5 text-xs">
                  <span className={`h-2 w-2 rounded-full ${s.dot}`} />
                  <span className="font-medium">{c.category}</span>
                  <span className="num text-muted-foreground">{formatMoney(c.netSalesCents)}</span>
                  <span className="num text-2xs text-muted-foreground/70">({formatPercent(c.sharePct)})</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <ul className="divide-y">
        {items.map((it, idx) => {
          const style = categoryStyle(it.category);
          return (
            <li key={it.itemName} className="group flex items-center gap-3 px-4 py-3 hover:bg-accent/40 transition-colors">
              <div className="w-6 text-2xs font-semibold text-muted-foreground tabular-nums shrink-0">
                {String(idx + 1).padStart(2, "0")}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`h-1.5 w-1.5 rounded-full ${style.dot} shrink-0`} />
                  <span className="text-sm font-medium truncate">{it.itemName}</span>
                  {it.category && (
                    <span className={`text-2xs ${style.text} shrink-0`}>· {it.category}</span>
                  )}
                </div>
                <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted/60">
                  <div
                    className={`h-full ${style.dot} transition-all duration-700`}
                    style={{ width: `${Math.max(2, it.sharePct)}%` }}
                  />
                </div>
              </div>
              <div className="text-right shrink-0">
                <div className="num text-sm font-semibold tracking-tight">{formatMoney(it.netSalesCents)}</div>
                <div className="text-2xs text-muted-foreground">
                  <span className="num">{it.qty.toLocaleString()}</span> sold ·{" "}
                  <span className="num">{formatPercent(it.sharePct)}</span>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4">
      <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold num tracking-tight">{value}</div>
    </div>
  );
}
