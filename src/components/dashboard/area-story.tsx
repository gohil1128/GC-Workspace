"use client";
import * as React from "react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export type StoryPoint = { x: string; y: number };

const fmtCurrency = (v: number) =>
  v >= 1000 ? `$${(v / 1000).toFixed(v < 10000 ? 1 : 0)}k` : `$${v.toFixed(0)}`;

export function AreaStory({ data, height = 280 }: { data: StoryPoint[]; height?: number }) {
  const gradId = React.useId();
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <AreaChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="hsl(var(--brand))" stopOpacity={0.45} />
              <stop offset="60%" stopColor="hsl(var(--brand))" stopOpacity={0.10} />
              <stop offset="100%" stopColor="hsl(var(--brand))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="2 6" vertical={false} />
          <XAxis dataKey="x" stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis stroke="hsl(var(--muted-foreground))" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={fmtCurrency} width={52} />
          <Tooltip
            cursor={{ stroke: "hsl(var(--brand))", strokeWidth: 1, strokeDasharray: "3 3" }}
            contentStyle={{
              background: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: 10,
              fontSize: 12,
              boxShadow: "0 8px 24px hsl(var(--foreground) / 0.08)",
              padding: "6px 10px",
              color: "hsl(var(--popover-foreground))",
            }}
            formatter={(v: number) => [fmtCurrency(v), "Net sales"]}
          />
          <Area
            type="monotone"
            dataKey="y"
            stroke="hsl(var(--brand))"
            strokeWidth={2.4}
            fill={`url(#${gradId})`}
            activeDot={{ r: 5, fill: "hsl(var(--brand))", stroke: "hsl(var(--background))", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
