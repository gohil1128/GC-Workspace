"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export type TrendPoint = { x: string; y: number };
type Format = "currency" | "percent" | "number";

function formatValue(v: number, fmt: Format): string {
  if (fmt === "currency") return `$${v.toFixed(0)}`;
  if (fmt === "percent") return `${v.toFixed(1)}%`;
  return v.toFixed(0);
}

export function TrendLine({
  data,
  format = "number",
  height = 220,
}: {
  data: TrendPoint[];
  format?: Format;
  height?: number;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="x" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            tick={{ fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => formatValue(v as number, format)}
            width={48}
          />
          <Tooltip
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 6,
              fontSize: 12,
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(v: number) => formatValue(v, format)}
          />
          <Line type="monotone" dataKey="y" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
