"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Calendar, Check, ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { setActiveEventAction } from "@/modules/events/actions";

type Ev = {
  id: string;
  name: string;
  color: string | null;
  startDate: Date | string;
  endDate: Date | string;
};

export function EventSwitcher({ events, activeEventId }: { events: Ev[]; activeEventId: string | null }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const active = events.find((e) => e.id === activeEventId);

  const change = (id: string | null) => {
    start(async () => {
      await setActiveEventAction(id);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending} className="gap-2">
          {active ? (
            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: active.color ?? "hsl(var(--muted-foreground))" }} />
          ) : (
            <Calendar className="h-3.5 w-3.5" />
          )}
          <span className="font-medium max-w-[140px] truncate">{active ? active.name : "All events"}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel>Filter by event</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => change(null)} className="justify-between">
          <span>All events</span>
          {!activeEventId && <Check className="h-3.5 w-3.5" />}
        </DropdownMenuItem>
        {events.length > 0 && <DropdownMenuSeparator />}
        {events.map((e) => {
          const start = typeof e.startDate === "string" ? e.startDate.slice(0, 10) : e.startDate.toISOString().slice(0, 10);
          const end = typeof e.endDate === "string" ? e.endDate.slice(0, 10) : e.endDate.toISOString().slice(0, 10);
          return (
            <DropdownMenuItem key={e.id} onClick={() => change(e.id)} className="justify-between">
              <span className="flex items-center gap-2 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: e.color ?? "hsl(var(--muted-foreground))" }} />
                <span className="truncate">{e.name}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="text-2xs text-muted-foreground">{start === end ? start : `${start} → ${end}`}</span>
                {e.id === activeEventId && <Check className="h-3.5 w-3.5" />}
              </span>
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
