"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Web navigation (design revision: 216px left sidebar).
  Primary sections are a flat vertical list; the active section expands to show
  its sub-pages so nothing in the app becomes unreachable — the mockup's eight
  items don't cover every route this app actually has.
  Below `lg` the sidebar is hidden and MobileTabBar takes over.
*/

type Sub = { href: string; label: string };
type Item = { href: string; label: string; ownerOnly?: boolean; subs?: Sub[] };

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Overview" },
  { href: "/reports", label: "Profit & loss" },
  {
    href: "/purchasing/invoices",
    label: "Invoices",
    subs: [
      { href: "/purchasing/invoices/new", label: "New invoice" },
      { href: "/purchasing", label: "Purchase orders" },
      { href: "/purchasing/new", label: "New purchase order" },
    ],
  },
  { href: "/cash", label: "Cash closes", subs: [{ href: "/cash/new", label: "New cash close" }] },
  {
    href: "/inventory",
    label: "Inventory",
    subs: [
      { href: "/inventory/counts", label: "Counts" },
      { href: "/inventory/variance", label: "Variance" },
      { href: "/recipes", label: "Recipes" },
    ],
  },
  {
    href: "/labor",
    label: "Labor",
    subs: [
      { href: "/labor/employees", label: "Employees" },
      { href: "/labor/report", label: "Labor report" },
    ],
  },
  { href: "/expenses", label: "Expenses" },
  {
    href: "/settings",
    label: "Settings",
    ownerOnly: true,
    subs: [
      { href: "/settings/users", label: "Team" },
      { href: "/settings/integrations", label: "Integrations" },
      { href: "/settings/exports", label: "Data export" },
    ],
  },
];

export type SideNavEvent = { id: string; name: string; color: string | null };

export function SideNav({
  role,
  recipesLocked,
  events,
  userName,
  openInvoices,
}: {
  role: "OWNER" | "MANAGER";
  recipesLocked: boolean;
  events: SideNavEvent[];
  userName: string;
  /** Drives the count badge on Invoices; hidden at zero. */
  openInvoices: number;
}) {
  const pathname = usePathname();
  const items = ITEMS.filter((i) => !i.ownerOnly || role === "OWNER");

  const within = (href: string) => pathname === href || pathname.startsWith(href + "/");
  // "Invoices" shouldn't light up while you're on /purchasing (purchase orders),
  // so a section is active when it or one of its own subs matches.
  const sectionActive = (i: Item) =>
    within(i.href) || (i.subs ?? []).some((s) => within(s.href));

  const initial = userName.trim().charAt(0).toUpperCase() || "U";

  return (
    <aside className="sticky top-0 hidden h-[100dvh] w-[216px] shrink-0 flex-col gap-1.5 overflow-y-auto overscroll-contain border-r border-input px-[18px] py-[26px] lg:flex">
      <Link href="/dashboard" className="logo-plate mb-[22px] ml-1.5 self-start">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="God's Chai" className="h-[52px] w-auto" />
      </Link>

      <nav className="flex flex-col gap-1.5" aria-label="Sections">
        {items.map((i) => {
          const active = sectionActive(i);
          return (
            <div key={i.href} className="flex flex-col gap-1">
              <Link
                href={i.href}
                aria-current={pathname === i.href ? "page" : undefined}
                className={cn(
                  "rounded-[10px] px-3 py-2.5 text-[13px] transition-colors",
                  active
                    ? "bg-espresso font-semibold text-espresso-foreground"
                    : "text-secondary-foreground hover:bg-accent",
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className="truncate">{i.label}</span>
                  {i.href === "/purchasing/invoices" && openInvoices > 0 && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-[7px] py-px text-[10px] font-semibold leading-[1.4]",
                        active ? "bg-espresso-foreground text-espresso" : "bg-brand text-brand-foreground",
                      )}
                    >
                      {openInvoices > 99 ? "99+" : openInvoices}
                      <span className="sr-only"> open invoices</span>
                    </span>
                  )}
                </span>
              </Link>
              {active && i.subs && (
                <div className="ml-3 flex flex-col gap-0.5 border-l border-border pl-2.5">
                  {i.subs.map((s) => (
                    <Link
                      key={s.href}
                      href={s.href}
                      aria-current={pathname === s.href ? "page" : undefined}
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                        within(s.href)
                          ? "font-semibold text-brand-ink"
                          : "text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {s.label}
                      {s.href === "/recipes" && recipesLocked && <Lock className="h-3 w-3 text-warning" />}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Events legend — real events, coloured to match their dots elsewhere. */}
      <div className="mt-auto border-t border-input pt-4">
        <div className="text-2xs uppercase tracking-[0.08em] text-muted-foreground">Events</div>
        <div className="mt-2.5 flex flex-col gap-2 text-[13px]">
          {events.length === 0 && <span className="text-xs text-muted-foreground">None yet</span>}
          {events.slice(0, 5).map((e) => (
            <span key={e.id} className="flex items-center gap-2">
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: e.color ?? "hsl(var(--muted-foreground))" }}
              />
              <span className="truncate" title={e.name}>
                {e.name}
              </span>
            </span>
          ))}
        </div>
        {role === "OWNER" && (
          <Link href="/settings" className="mt-3 flex items-center gap-1 text-xs font-medium text-brand-ink hover:underline">
            <Plus className="h-3 w-3" /> New event
          </Link>
        )}
      </div>

      <div className="mt-[22px] flex items-center gap-2.5 border-t border-input pt-4">
        <span className="grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full bg-espresso text-xs font-semibold text-espresso-foreground">
          {initial}
        </span>
        <div className="min-w-0 text-xs">
          <div className="truncate font-semibold">{userName}</div>
          <div className="text-muted-foreground">{role === "OWNER" ? "Owner" : "Manager"}</div>
        </div>
      </div>
    </aside>
  );
}
