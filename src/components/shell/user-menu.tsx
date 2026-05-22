"use client";
import { LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { signOutAction } from "@/modules/auth/actions";

export function UserMenu({ name, email, role }: { name: string; email: string; role: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
            {name.slice(0, 1).toUpperCase()}
          </div>
          <span className="hidden sm:inline">{name}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="normal-case tracking-normal">
          <div className="flex flex-col">
            <span className="text-sm font-medium text-foreground">{name}</span>
            <span className="text-2xs text-muted-foreground">{email}</span>
            <span className="text-2xs uppercase text-muted-foreground mt-1">{role}</span>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem disabled>
          <UserIcon className="h-3.5 w-3.5" /> Account
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => signOutAction()}>
          <LogOut className="h-3.5 w-3.5" /> Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
