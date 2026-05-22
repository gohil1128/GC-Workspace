"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronsUpDown, MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { switchLocationAction } from "@/modules/auth/actions";

type Loc = { id: string; name: string; kind: "STORE" | "EVENT" };

export function LocationSwitcher({ active, options }: { active: Loc; options: Loc[] }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  const change = (id: string) => {
    if (id === active.id) return;
    start(async () => {
      await switchLocationAction(id);
      router.refresh();
    });
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" disabled={pending} className="gap-2">
          <MapPin className="h-3.5 w-3.5" />
          <span className="font-medium">{active.name}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel>Switch location</DropdownMenuLabel>
        {options.map((l) => (
          <DropdownMenuItem key={l.id} onClick={() => change(l.id)} className="justify-between">
            <span>{l.name}</span>
            <div className="flex items-center gap-2">
              <span className="text-2xs uppercase text-muted-foreground">{l.kind}</span>
              {l.id === active.id && <Check className="h-3.5 w-3.5" />}
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
