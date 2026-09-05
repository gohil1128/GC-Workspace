import { cn } from "@/lib/utils";
import { formatMoney, formatPercent } from "@/lib/money";
import type { PnlColumn } from "@/modules/reports/queries";

/*
  The P&L statement — the Overview's centrepiece.

  It is a CSS grid rather than a <table> because the column count is the number
  of events in range, which the label column has to give way to. Semantics are
  kept with an explicit row/cell role set so it still reads as a table to a
  screen reader.

  Below `lg` the grid can't hold six columns, so the statement is replaced by
  one card per event — the same treatment the rest of the app's wide tables
  already use.
*/

// Fallbacks when an event carries no colour of its own: logo brown, gold,
// logo rust, taupe — the four the handoff legend uses, in that order.
const FALLBACK_SWATCH = [
  "hsl(var(--espresso))",
  "hsl(var(--amber-deep))",
  "hsl(var(--brand))",
  "hsl(var(--ink-300))",
];

type Line = {
  label: string;
  /** Sub-lines of net sales are indented and set in muted ink. */
  indent?: boolean;
  /** Costs render as negatives. */
  negate?: boolean;
  value: (c: PnlColumn) => number;
  format?: (n: number) => string;
};

const LINES: Line[] = [
  { label: "Transactions", value: (c) => c.txns, format: (n) => n.toLocaleString() },
  { label: "Net sales", value: (c) => c.netSalesCents },
  { label: "Supplier invoices (COGS)", indent: true, negate: true, value: (c) => c.cogsCents },
  { label: "Labor", indent: true, negate: true, value: (c) => c.laborCents },
  { label: "Operating expenses", indent: true, negate: true, value: (c) => c.opexCents },
  { label: "Event fees", indent: true, negate: true, value: (c) => c.feeCents },
];

function money(n: number) {
  return n === 0 ? "—" : formatMoney(n);
}

export function PnlStatement({ columns }: { columns: PnlColumn[] }) {
  const events = columns.filter((c) => c.key !== "overall");
  const overall = columns.find((c) => c.key === "overall");
  if (!overall) return null;

  const swatch = (c: PnlColumn, i: number) => c.color ?? FALLBACK_SWATCH[i % FALLBACK_SWATCH.length];
  // The grid template is sized from the live event count, so two events don't
  // leave four columns of dead space.
  const gridVars = { "--ledger-cols": events.length } as React.CSSProperties;

  return (
    <>
      {/* ── Desktop: the statement proper ─────────────────────────────── */}
      {/* The panel is what makes the pinned label column possible: a sticky
          cell needs an opaque background, and it cannot reproduce the canvas
          gradient behind itself. */}
      <div className="panel hidden overflow-hidden lg:block">
        {/* The scrollport is its own focusable region so the statement can be
            scrolled from the keyboard. role="table" stays on the element that
            actually holds the rows — a role-less div between a table and its
            rows breaks the accessibility tree. */}
        <div
          className="overflow-x-auto scroll-contain"
          role="region"
          aria-label="Profit and loss statement, scrollable"
          tabIndex={0}
        >
          <div
            style={gridVars}
            className="num min-w-max pr-4 text-[13px]"
            role="table"
            aria-label="Profit and loss by event"
          >
          {/* Column heads, doubling as the event colour legend. */}
          <div
            role="row"
            className="ledger-row border-b border-espresso pb-2 pt-2 text-[11px] text-muted-foreground"
          >
            <span role="columnheader">Line</span>
            {events.map((c, i) => (
              <span
                key={c.key}
                role="columnheader"
                title={c.name}
                className="flex items-center justify-end gap-1.5 truncate"
              >
                <span
                  aria-hidden
                  className="h-2 w-2 shrink-0 rounded-[2px]"
                  style={{ background: swatch(c, i) }}
                />
                <span className="truncate">{c.name}</span>
              </span>
            ))}
            <span role="columnheader" className="text-right font-semibold text-foreground">
              Overall
            </span>
          </div>

          {LINES.map((line) => (
            <div key={line.label} role="row" className="ledger-row border-b border-input py-[11px]">
              <span
                role="rowheader"
                className={cn(
                  "truncate whitespace-nowrap",
                  line.indent ? "pl-3.5 text-muted-foreground" : "font-semibold",
                )}
              >
                {line.label}
              </span>
              {events.map((c) => (
                <Cell key={c.key} line={line} col={c} muted={line.indent} />
              ))}
              <Cell line={line} col={overall} strong={!line.indent} />
            </div>
          ))}

          {/* Profit — the one row the eye should land on first. */}
          <div
            role="row"
            className="ledger-row ledger-highlight border-b-2 border-espresso py-[13px]"
          >
            <span role="rowheader" className="font-bold">
              Profit
            </span>
            {events.map((c) => (
              <span key={c.key} role="cell" className={cn("text-right font-semibold", signTone(c.profitCents))}>
                {formatMoney(c.profitCents, { signed: true })}
              </span>
            ))}
            <span role="cell" className="display-num text-right text-base font-bold">
              {formatMoney(overall.profitCents, { signed: true })}
            </span>
          </div>

          <div role="row" className="ledger-row border-b border-input py-[11px]">
            <span role="rowheader" className="text-muted-foreground">
              Margin
            </span>
            {events.map((c) => (
              <span key={c.key} role="cell" className={cn("text-right", c.marginPct < 0 && "text-destructive")}>
                {formatPercent(c.marginPct)}
              </span>
            ))}
            <span
              role="cell"
              className={cn("text-right font-semibold", overall.marginPct < 0 && "text-destructive")}
            >
              {formatPercent(overall.marginPct)}
            </span>
          </div>

          <div role="row" className="ledger-row py-[11px] text-xs text-muted-foreground">
            <span role="rowheader" className="whitespace-nowrap">
              Tips (staff, not in profit)
            </span>
            {events.map((c) => (
              <span key={c.key} role="cell" className="text-right">
                {money(c.tipsCents)}
              </span>
            ))}
            <span role="cell" className="text-right">
              {money(overall.tipsCents)}
            </span>
          </div>
          </div>
        </div>
      </div>

      {/* ── Mobile: one card per event, plus the overall column ────────── */}
      <div className="space-y-2.5 lg:hidden">
        {[...events, overall].map((c, i) => (
          <div key={c.key} className={cn("panel p-4", c.key === "overall" && "border-espresso")}>
            <div className="flex items-center justify-between gap-3">
              <span className="flex min-w-0 items-center gap-2">
                {c.key !== "overall" && (
                  <span
                    aria-hidden
                    className="h-2 w-2 shrink-0 rounded-[2px]"
                    style={{ background: swatch(c, i) }}
                  />
                )}
                <span className="truncate text-sm font-semibold" title={c.name}>
                  {c.name}
                </span>
              </span>
              <span className="num shrink-0 text-sm text-muted-foreground">
                {c.txns.toLocaleString()} txns
              </span>
            </div>
            <dl className="num mt-3 space-y-1.5 text-[13px]">
              <MobileLine label="Net sales" value={money(c.netSalesCents)} strong />
              <MobileLine label="Supplier invoices" value={neg(c.cogsCents)} muted />
              <MobileLine label="Labor" value={neg(c.laborCents)} muted />
              <MobileLine label="Operating expenses" value={neg(c.opexCents)} muted />
              <MobileLine label="Event fees" value={neg(c.feeCents)} muted />
            </dl>
            <div className="ledger-highlight mt-3 flex items-baseline justify-between py-2.5">
              <dt className="text-[13px] font-bold">Profit</dt>
              <dd className={cn("display-num text-base font-bold", signTone(c.profitCents))}>
                {formatMoney(c.profitCents, { signed: true })}{" "}
                <span className="text-xs font-medium">({formatPercent(c.marginPct)})</span>
              </dd>
            </div>
            <div className="mt-2 flex items-baseline justify-between text-xs text-muted-foreground">
              <span>Tips (staff, not in profit)</span>
              <span className="num">{money(c.tipsCents)}</span>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function signTone(cents: number) {
  return cents < 0 ? "text-destructive" : cents > 0 ? "text-success" : "";
}

function neg(cents: number) {
  return cents === 0 ? "—" : formatMoney(-cents);
}

function Cell({
  line,
  col,
  muted,
  strong,
}: {
  line: Line;
  col: PnlColumn;
  muted?: boolean;
  strong?: boolean;
}) {
  const raw = line.value(col);
  const n = line.negate ? -raw : raw;
  const text = line.format ? (raw === 0 ? "—" : line.format(raw)) : money(n);
  return (
    <span
      role="cell"
      className={cn("truncate text-right", muted && "text-muted-foreground", strong && "font-semibold")}
    >
      {text}
    </span>
  );
}

function MobileLine({
  label,
  value,
  muted,
  strong,
}: {
  label: string;
  value: string;
  muted?: boolean;
  strong?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <dt className={cn("truncate", muted && "text-muted-foreground", strong && "font-semibold")}>
        {label}
      </dt>
      <dd className={cn("shrink-0", strong && "font-semibold")}>{value}</dd>
    </div>
  );
}
