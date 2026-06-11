"use client";
import * as React from "react";

// Animated count-up using rAF — no library. `format` shapes the displayed
// string (currency / percent / number); `value` is always a raw number.
export function CountUp({
  value,
  format = "number",
  duration = 900,
  className,
  prefix,
  suffix,
  fractionDigits = 0,
}: {
  value: number;
  format?: "currency" | "percent" | "number";
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  fractionDigits?: number;
}) {
  const [current, setCurrent] = React.useState(0);
  const startRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    const reduced = typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setCurrent(value);
      return;
    }
    let raf: number;
    const from = 0;
    const to = value;
    const tick = (t: number) => {
      if (startRef.current === null) startRef.current = t;
      const elapsed = t - startRef.current;
      const p = Math.min(1, elapsed / duration);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setCurrent(from + (to - from) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const display = formatNumber(current, format, fractionDigits);
  return (
    <span className={className}>
      {prefix}
      {display}
      {suffix}
    </span>
  );
}

function formatNumber(v: number, format: "currency" | "percent" | "number", fractionDigits: number) {
  if (format === "currency") {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: fractionDigits, minimumFractionDigits: fractionDigits }).format(v);
  }
  if (format === "percent") {
    return `${v.toFixed(Math.max(1, fractionDigits))}%`;
  }
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: fractionDigits }).format(v);
}
