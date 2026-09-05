"use client";
import * as React from "react";
import Link from "next/link";
import { CalendarRange } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { RangeKey } from "@/modules/dashboard/range";

/*
  The Overview's period control: a segmented pill group where the selected
  segment is the espresso fill.

  Every segment is a real link, so the range survives a reload, a bookmark and
  the back button. "Custom" is the one that can't be a plain link — it opens a
  small popover with two date fields that submits as a GET, which keeps the
  same "the URL is the state" contract.
*/

type Seg = { key: RangeKey; label: string; href: string };

export function PeriodControl({
  active,
  eventSegment,
  from,
  to,
}: {
  active: RangeKey;
  /** Present when one event scopes the page — from the header's event
      switcher, or from drilling into a column of the statement. */
  eventSegment?: { label: string; href: string } | null;
  from?: string;
  to?: string;
}) {
  const segs: Seg[] = [
    ...(eventSegment ? [{ key: "event" as RangeKey, ...eventSegment }] : []),
    { key: "season", label: "Season", href: "/dashboard?range=season" },
    { key: "month", label: "This month", href: "/dashboard?range=month" },
    { key: "last-event", label: "Last event", href: "/dashboard?range=last-event" },
  ];

  const segClass = (isActive: boolean) =>
    cn(
      "touch-target inline-flex items-center rounded-[7px] px-3 py-1.5 text-xs transition-colors",
      isActive
        ? "bg-espresso font-semibold text-espresso-foreground shadow-xs"
        : "text-secondary-foreground hover:bg-accent",
    );

  return (
    <div className="flex items-center gap-0.5 rounded-[10px] border border-input bg-card p-[3px] shadow-xs">
      {segs.map((s) => (
        <Link
          key={s.key}
          href={s.href}
          aria-current={active === s.key ? "true" : undefined}
          className={cn(segClass(active === s.key), "max-w-[10rem] truncate")}
        >
          {s.label}
        </Link>
      ))}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" className={cn(segClass(active === "custom"), "gap-1.5")}>
            <CalendarRange className="h-3.5 w-3.5" aria-hidden />
            Custom
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64 p-3">
          <form method="GET" action="/dashboard" className="space-y-2.5">
            <input type="hidden" name="range" value="custom" />
            <div className="text-2xs font-medium uppercase tracking-[0.08em] text-muted-foreground">
              Custom range
            </div>
            <label className="block text-xs text-secondary-foreground">
              From
              <input
                type="date"
                name="from"
                defaultValue={from}
                required
                className="mt-1 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-[13px]"
              />
            </label>
            <label className="block text-xs text-secondary-foreground">
              To
              <input
                type="date"
                name="to"
                defaultValue={to}
                required
                className="mt-1 w-full rounded-lg border border-input bg-background px-2.5 py-1.5 text-[13px]"
              />
            </label>
            <Button type="submit" size="sm" className="w-full">
              Apply
            </Button>
          </form>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
