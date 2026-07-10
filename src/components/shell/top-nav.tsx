"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Lock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

type Sub = { href: string; label: string; note?: string };
type Section = { label: string; href: string; ownerOnly?: boolean; children?: Sub[] };

// CLEARVIEW-style top sections. A section with `children` opens a dropdown of
// subsections; without, it links straight to `href`.
const SECTIONS: Section[] = [
  { label: "Dashboard", href: "/dashboard" },
  {
    label: "Sales",
    href: "/reports",
    children: [
      { href: "/reports", label: "Reports", note: "Daily, weekly, variance" },
      { href: "/settings/integrations", label: "Import sales (CSV)", note: "Square uploads" },
    ],
  },
  {
    label: "Cash",
    href: "/cash",
    children: [
      { href: "/cash", label: "Cash closes", note: "History of daily closes" },
      { href: "/cash/new", label: "New cash close", note: "Count today's drawer" },
    ],
  },
  {
    label: "Purchasing",
    href: "/purchasing/invoices",
    children: [
      { href: "/purchasing/invoices", label: "Invoices", note: "Supplier bills" },
      { href: "/purchasing/invoices/new", label: "New invoice", note: "Enter a bill" },
      { href: "/purchasing", label: "Purchase orders", note: "Reorder builder" },
    ],
  },
  {
    label: "Inventory",
    href: "/inventory",
    children: [
      { href: "/inventory", label: "Ingredients", note: "Stock, units, volume" },
      { href: "/inventory/counts", label: "Counts", note: "Weekly count" },
      { href: "/inventory/variance", label: "Variance", note: "Theoretical vs actual" },
      { href: "/recipes", label: "Recipes", note: "Menu items & plate cost" },
    ],
  },
  {
    label: "Labor",
    href: "/labor",
    children: [
      { href: "/labor", label: "Schedule", note: "Weekly shifts" },
      { href: "/labor/employees", label: "Employees", note: "Staff & wages" },
      { href: "/labor/report", label: "Labor report", note: "Scheduled vs actual" },
    ],
  },
  { label: "Expenses", href: "/expenses" },
  {
    label: "Settings",
    href: "/settings",
    ownerOnly: true,
    children: [
      { href: "/settings", label: "Business & events", note: "Locations, events, fees" },
      { href: "/settings/users", label: "Team", note: "Invite & roles" },
      { href: "/settings/integrations", label: "Integrations", note: "CSV imports, data" },
    ],
  },
];

function useActive(href: string) {
  const pathname = usePathname();
  return pathname === href || pathname.startsWith(href + "/");
}

export function TopNav({ role, recipesLocked }: { role: "OWNER" | "MANAGER"; recipesLocked: boolean }) {
  const pathname = usePathname();
  const sections = SECTIONS.filter((s) => !s.ownerOnly || role === "OWNER");

  // A section is "active" when the current path matches it or any of its subs.
  const isSectionActive = (s: Section) => {
    const hrefs = [s.href, ...(s.children?.map((c) => c.href) ?? [])];
    return hrefs.some((h) => pathname === h || pathname.startsWith(h + "/"));
  };

  return (
    <nav className="flex items-stretch gap-0.5 overflow-x-auto scroll-fluid px-2 sm:px-4">
      {sections.map((s) => {
        const active = isSectionActive(s);
        if (!s.children) {
          return (
            <Link
              key={s.label}
              href={s.href}
              className={cn(
                "relative inline-flex shrink-0 items-center px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap",
                active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {s.label}
              {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />}
            </Link>
          );
        }
        return (
          <DropdownMenu key={s.label}>
            <DropdownMenuTrigger asChild>
              <button
                className={cn(
                  "group relative inline-flex shrink-0 items-center gap-1 px-3.5 py-2.5 text-sm font-medium transition-colors whitespace-nowrap outline-none",
                  active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {s.label}
                <ChevronDown className="h-3.5 w-3.5 opacity-60 transition-transform group-data-[state=open]:rotate-180" />
                {active && <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-60">
              {s.children.map((c) => (
                <SubItem key={c.href} sub={c} recipesLocked={recipesLocked} />
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </nav>
  );
}

function SubItem({ sub, recipesLocked }: { sub: Sub; recipesLocked: boolean }) {
  const active = useActive(sub.href);
  return (
    <DropdownMenuItem asChild>
      <Link href={sub.href} className={cn("flex flex-col items-start gap-0.5 cursor-pointer", active && "bg-accent")}>
        <span className="flex items-center gap-1.5 text-sm font-medium">
          {sub.label}
          {sub.href === "/recipes" && recipesLocked && <Lock className="h-3 w-3 text-warning" />}
        </span>
        {sub.note && <span className="text-2xs text-muted-foreground">{sub.note}</span>}
      </Link>
    </DropdownMenuItem>
  );
}
