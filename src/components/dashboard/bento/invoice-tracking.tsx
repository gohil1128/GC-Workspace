import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { fmtDate } from "@/lib/date";

// The screen's one dark card. Contribution-style dot grid where a filled dot
// is a paid bill and a hollow one is still open.
export function InvoiceTracking({
  paidCount,
  openCount,
  openBalanceCents,
  oldestOpen,
  recentStatuses,
}: {
  paidCount: number;
  openCount: number;
  openBalanceCents: number;
  oldestOpen: { supplier: string; date: Date } | null;
  recentStatuses: string[];
}) {
  return (
    <div className="bento-dark relative min-w-0 overflow-hidden p-4 sm:p-[22px]">
      <div className="flex items-center justify-between">
        <span className="text-base font-semibold">Invoice tracking</span>
        <Link
          href="/purchasing/invoices"
          className="grid h-7 w-7 place-items-center rounded-full border border-white/25 transition-colors hover:bg-white/10"
          aria-label="All invoices"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className="mt-5 flex items-baseline gap-[18px]">
        <span className="display-num text-[44px] font-medium">
          {paidCount} <span className="text-base text-success">✓</span>
        </span>
        <span className="display-num text-[44px] font-medium">
          {openCount} <span className="text-base text-amber">↗</span>
        </span>
      </div>
      <div className="mt-1.5 flex gap-[18px] text-2xs opacity-65">
        <span>paid</span>
        <span className="ml-9">open</span>
      </div>

      {recentStatuses.length > 0 && (
        <div className="mt-6 grid grid-cols-8 gap-[9px]">
          {recentStatuses.map((s, i) => (
            <span
              key={i}
              className={
                s === "paid"
                  ? "aspect-square rounded-full bg-amber"
                  : "aspect-square rounded-full border-[1.5px] border-white/35"
              }
            />
          ))}
        </div>
      )}

      <div className="mt-6 flex justify-between border-t border-white/15 pt-4 text-xs">
        <span className="opacity-70">Open balance</span>
        <span className="font-semibold num">{formatMoney(openBalanceCents)}</span>
      </div>
      {oldestOpen && (
        <div className="mt-2 flex justify-between text-xs">
          <span className="truncate opacity-70">Oldest open · {oldestOpen.supplier}</span>
          <span className="shrink-0 font-semibold text-amber">{fmtDate(oldestOpen.date)}</span>
        </div>
      )}
    </div>
  );
}
