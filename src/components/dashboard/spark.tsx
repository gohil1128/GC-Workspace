"use client";
import * as React from "react";

// Pure SVG sparkline — no recharts, no axes. ~10 lines of geometry.
export function Spark({
  data,
  width = 110,
  height = 32,
  stroke = "currentColor",
  fill,
  className,
}: {
  data: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  className?: string;
}) {
  if (data.length === 0) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const stepX = data.length > 1 ? width / (data.length - 1) : 0;
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * height;
    return { x, y };
  });
  const linePath = points
    .map((p, i) => (i === 0 ? `M${p.x.toFixed(1)},${p.y.toFixed(1)}` : `L${p.x.toFixed(1)},${p.y.toFixed(1)}`))
    .join(" ");
  const areaPath = fill
    ? `${linePath} L${width},${height} L0,${height} Z`
    : null;
  const last = points[points.length - 1];

  const gradId = React.useId();

  return (
    <svg width={width} height={height} className={className} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {fill && (
        <>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={fill} stopOpacity="0.35" />
              <stop offset="100%" stopColor={fill} stopOpacity="0" />
            </linearGradient>
          </defs>
          {areaPath && <path d={areaPath} fill={`url(#${gradId})`} />}
        </>
      )}
      <path d={linePath} fill="none" stroke={stroke} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
      {last && <circle cx={last.x} cy={last.y} r={2.2} fill={stroke} />}
    </svg>
  );
}
