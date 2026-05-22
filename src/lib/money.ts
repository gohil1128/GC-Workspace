export function toCents(value: number | string): number {
  const n = typeof value === "string" ? parseFloat(value) : value;
  if (!isFinite(n)) return 0;
  return Math.round(n * 100);
}

export function fromCents(cents: number): number {
  return cents / 100;
}

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

export function formatMoney(cents: number, opts?: { signed?: boolean }): string {
  const value = fromCents(cents);
  const formatted = usdFormatter.format(Math.abs(value));
  if (opts?.signed && cents > 0) return `+${formatted}`;
  if (cents < 0) return `-${formatted}`;
  return formatted;
}

export function formatPercent(value: number, fractionDigits = 1): string {
  if (!isFinite(value)) return "—";
  return `${value.toFixed(fractionDigits)}%`;
}

export function safeDivide(num: number, denom: number): number {
  return denom === 0 ? 0 : num / denom;
}
