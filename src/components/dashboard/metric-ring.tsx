"use client";
import * as React from "react";
import { cn } from "@/lib/utils";

// Circular percentage ring with target tick. Used for food%, labor%, prime%,
// inventory variance%. Animates from 0 → value on mount via CSS keyframes.
type Tone = "good" | "warn" | "bad" | "neutral";

const TONE_COLOR: Record<Tone, string> = {
  good: "hsl(var(--success))",
  warn: "hsl(var(--warning))",
  bad: "hsl(var(--destructive))",
  neutral: "hsl(var(--brand))",
};

export function MetricRing({
  label,
  value,
  target,
  tone = "neutral",
  caption,
  size = 96,
  stroke = 8,
}: {
  label: string;
  value: number;
  target?: number;
  tone?: Tone;
  caption?: string;
  size?: number;
  stroke?: number;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const clamped = Math.max(0, Math.min(100, value));
  const offset = c - (clamped / 100) * c;
  const color = TONE_COLOR[tone];
  const trackColor = "hsl(var(--muted))";
  const targetAngle = target != null ? (Math.max(0, Math.min(100, target)) / 100) * 360 : null;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={offset}
            style={{
              transition: "stroke-dashoffset 1s cubic-bezier(0.22, 1, 0.36, 1)",
            }}
          />
        </svg>
        {targetAngle != null && (
          <span
            className="absolute left-1/2 top-1/2 origin-center"
            style={{
              transform: `translate(-50%, -50%) rotate(${targetAngle - 90}deg) translateY(-${(size - stroke) / 2}px)`,
            }}
          >
            <span className="block h-2 w-[3px] rounded-full bg-foreground/70" />
          </span>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className={cn("num font-semibold leading-none tracking-tight", "text-[1.05rem]")} style={{ color }}>
            {value.toFixed(1)}%
          </span>
        </div>
      </div>
      <div className="text-center">
        <div className="text-2xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        {caption && <div className="text-2xs text-muted-foreground/70 mt-0.5">{caption}</div>}
      </div>
    </div>
  );
}
