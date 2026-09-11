"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock, Plus } from "lucide-react";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { can, ROLE_LABELS, type Capability } from "@/lib/permissions";

/*
  Web navigation (design revision: 216px left sidebar).
  Primary sections are a flat vertical list; the active section expands to show
  its sub-pages so nothing in the app becomes unreachable — the mockup's eight
  items don't cover every route this app actually has.
  Below `lg` the sidebar is hidden and MobileTabBar takes over.
*/

type Sub = { href: string; label: string; cap: Capability };
type Item = { href: string; label: string; cap: Capability; subs?: Sub[] };

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Overview", cap: "overview" },
  { href: "/events", label: "Events", cap: "events" },
  { href: "/reports", label: "Profit & loss", cap: "financials" },
  {
    href: "/purchasing/invoices",
    label: "Invoices",
    cap: "purchasing",
    subs: [
      { href: "/purchasing/invoices/new", label: "New invoice", cap: "purchasing" },
      { href: "/purchasing", label: "Purchase orders", cap: "purchasing" },
      { href: "/purchasing/new", label: "New purchase order", cap: "purchasing" },
    ],
  },
  {
    href: "/cash",
    label: "Cash closes",
    cap: "cash",
    subs: [{ href: "/cash/new", label: "New cash close", cap: "cash" }],
  },
  {
    href: "/inventory",
    label: "Inventory",
    cap: "inventory",
    subs: [
      // Deliberately its own capability: recording a count is the one thing in
      // this section a staff member does, and it exposes no costs.
      { href: "/inventory/counts", label: "Counts", cap: "inventoryCount" },
      { href: "/inventory/variance", label: "Variance", cap: "inventory" },
      { href: "/recipes", label: "Recipes", cap: "inventory" },
    ],
  },
  {
    href: "/labor",
    label: "Labor",
    cap: "labor",
    subs: [
      { href: "/labor/employees", label: "Employees", cap: "labor" },
      { href: "/labor/report", label: "Labor report", cap: "labor" },
    ],
  },
  { href: "/expenses", label: "Expenses", cap: "expenses" },
  {
    href: "/settings",
    label: "Settings",
    cap: "settings",
    subs: [
      { href: "/settings/users", label: "Team", cap: "settings" },
      { href: "/settings/integrations", label: "Integrations", cap: "settings" },
      { href: "/settings/exports", label: "Data export", cap: "settings" },
    ],
  },
];

/** Which nav destinations can sit behind the PIN. */
const LOCKABLE: Record<string, string | undefined> = {
  "/reports": "REPORTS",
  "/events": "EVENTS",
  "/recipes": "RECIPES",
};

export type SideNavEvent = { id: string; name: string; color: string | null };

export function SideNav({
  role,
  lockedSections,
  events,
  userName,
  openInvoices,
}: {
  role: Role;
  /** Sections currently behind the PIN — badged so the lock isn't a surprise. */
  lockedSections: readonly string[];
  events: SideNavEvent[];
  userName: string;
  /** Drives the count badge on Invoices; hidden at zero. */
  openInvoices: number;
}) {
  const pathname = usePathname();
  /*
    A section shows if the role can reach the section itself OR any of its
    sub-pages. Staff can open /inventory/counts but not /inventory, so the
    section has to appear and point at the count page — filtering on the
    parent alone would make the one inventory page they may use unreachable.
  */
  const items = ITEMS.flatMap((i) => {
    const subs = (i.subs ?? []).filter((s) => can(role, s.cap));
    const self = can(role, i.cap);
    if (!self && subs.length === 0) return [];
    return [{ ...i, href: self ? i.href : subs[0].href, subs }];
  });

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
                  <span className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate">{i.label}</span>
                    {i.href in LOCKABLE && lockedSections.includes(LOCKABLE[i.href]!) && (
                      <Lock className="h-3 w-3 shrink-0 text-warning" aria-label="Locked" />
                    )}
                  </span>
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
                      {s.href === "/recipes" && lockedSections.includes("RECIPES") && (
                        <Lock className="h-3 w-3 text-warning" aria-label="Locked" />
                      )}
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
            <Link
              key={e.id}
              href={`/events/${e.id}`}
              className="flex items-center gap-2 rounded transition-colors hover:text-foreground"
            >
              <span
                className="h-2 w-2 shrink-0 rounded-[2px]"
                style={{ backgroundColor: e.color ?? "hsl(var(--muted-foreground))" }}
              />
              <span className="truncate" title={e.name}>
                {e.name}
              </span>
            </Link>
          ))}
        </div>
        {can(role, "settings") && (
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
          <div className="text-muted-foreground">{ROLE_LABELS[role]}</div>
        </div>
      </div>
    </aside>
  );
}
