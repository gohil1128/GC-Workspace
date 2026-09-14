"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutGrid, TrendingUp, FileText, ShoppingBag, Wallet, Boxes, Users,
  CalendarDays, Settings as SettingsIcon,
} from "lucide-react";
import type { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import { can, ROLE_LABELS, type Capability } from "@/lib/permissions";

/*
  The soft-glass icon rail: a floating frosted column of circular buttons.

  Icon-only is the design, but an icon alone is not a label — each button keeps
  a visually-hidden name and a title, so the rail is navigable by screen reader
  and hoverable for anyone who does not recognise a glyph. The same capability
  filter the old sidebar used decides what appears, so nothing became reachable
  or unreachable by restyling the nav.
*/

type Item = { href: string; label: string; icon: typeof LayoutGrid; cap: Capability };

const ITEMS: Item[] = [
  { href: "/dashboard", label: "Overview", icon: LayoutGrid, cap: "overview" },
  { href: "/events", label: "Events", icon: CalendarDays, cap: "events" },
  { href: "/reports", label: "Profit & loss", icon: TrendingUp, cap: "financials" },
  { href: "/sales", label: "Sales", icon: ShoppingBag, cap: "financials" },
  { href: "/purchasing/invoices", label: "Invoices", icon: FileText, cap: "purchasing" },
  { href: "/cash", label: "Cash closes", icon: Wallet, cap: "cash" },
  { href: "/inventory", label: "Inventory", icon: Boxes, cap: "inventory" },
  { href: "/inventory/counts", label: "Counts", icon: Boxes, cap: "inventoryCount" },
  { href: "/labor", label: "Labor", icon: Users, cap: "labor" },
];

const SETTINGS: Item = {
  href: "/settings",
  label: "Settings",
  icon: SettingsIcon,
  cap: "settings",
};

export function IconRail({ role, userName }: { role: Role; userName: string }) {
  const pathname = usePathname();

  // A staff member can reach /inventory/counts but not /inventory, so the two
  // are separate entries and only the permitted one renders.
  const items = ITEMS.filter(
    (i) => can(role, i.cap) && !(i.href === "/inventory/counts" && can(role, "inventory")),
  );
  const showSettings = can(role, SETTINGS.cap);

  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  // Longest match wins, so /inventory/counts does not also light up /inventory.
  const current = [...items, ...(showSettings ? [SETTINGS] : [])]
    .map((i) => i.href)
    .filter(active)
    .sort((a, b) => b.length - a.length)[0];

  const initial = userName.trim().charAt(0).toUpperCase() || "U";

  return (
    <nav
      aria-label="Sections"
      className="glass-pill fixed left-[18px] top-[18px] z-40 hidden h-[calc(100dvh-36px)] w-16 flex-col items-center gap-2 rounded-[32px] px-3 py-4 lg:flex"
    >
      <Link href="/dashboard" className="logo-plate mb-2 shrink-0" aria-label="God's Chai — Overview">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" aria-hidden className="h-7 w-auto" />
      </Link>

      {items.map((i) => (
        <RailButton key={i.href} item={i} current={current === i.href} />
      ))}

      {showSettings && (
        <>
          <span aria-hidden className="my-1 h-px w-6 shrink-0 bg-foreground/15" />
          <RailButton item={SETTINGS} current={current === SETTINGS.href} />
        </>
      )}

      <span
        className="mt-auto grid h-10 w-10 shrink-0 place-items-center rounded-full bg-brand text-sm font-semibold text-brand-foreground"
        title={`${userName} · ${ROLE_LABELS[role]}`}
      >
        {initial}
        <span className="sr-only">
          Signed in as {userName}, {ROLE_LABELS[role]}
        </span>
      </span>
    </nav>
  );
}

function RailButton({ item, current }: { item: Item; current: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      title={item.label}
      aria-current={current ? "page" : undefined}
      className={cn(
        "grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-colors",
        current
          ? "border-espresso bg-espresso text-espresso-foreground shadow-[0_10px_20px_-10px_hsl(var(--ink-800)/0.85)]"
          : "border-white/70 bg-white/50 text-secondary-foreground hover:bg-white/80 dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20",
      )}
    >
      <Icon className="h-[17px] w-[17px]" aria-hidden />
      <span className="sr-only">{item.label}</span>
    </Link>
  );
}
