"use client";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell } from "recharts";

export type BarPoint = { x: string; y: number };
type Format = "currency" | "percent" | "number";

function formatValue(v: number, fmt: Format): string {
  if (fmt === "currency") return `$${v.toFixed(0)}`;
  if (fmt === "percent") return `${v.toFixed(1)}%`;
  return v.toFixed(0);
}

export function BarSimple({
  data,
  format = "number",
  height = 220,
  negative = false,
}: {
  data: BarPoint[];
  format?: Format;
  height?: number;
  negative?: boolean;
}) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
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
          <Bar dataKey="y" radius={[3, 3, 0, 0]}>
            {data.map((d, i) => (
              <Cell key={i} fill={negative && d.y < 0 ? "hsl(var(--destructive))" : "hsl(var(--primary))"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
