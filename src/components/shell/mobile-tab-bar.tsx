"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, BarChart3, Wallet, FileText, Menu,
  Boxes, Users, Receipt, Settings as SettingsIcon, ChefHat, X,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Primary destinations get a thumb-reachable bottom bar; everything else
// lives behind "More". Five slots is the practical maximum before targets
// get too narrow to hit reliably.
const TABS = [
  { href: "/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/cash", label: "Cash", icon: Wallet },
  { href: "/purchasing/invoices", label: "Invoices", icon: FileText },
] as const;

const MORE = [
  { href: "/inventory", label: "Ingredients", icon: Boxes },
  { href: "/inventory/counts", label: "Counts", icon: Boxes },
  { href: "/inventory/variance", label: "Variance", icon: BarChart3 },
  { href: "/recipes", label: "Recipes", icon: ChefHat },
  { href: "/labor", label: "Schedule", icon: Users },
  { href: "/labor/report", label: "Labor report", icon: BarChart3 },
  { href: "/labor/employees", label: "Employees", icon: Users },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/purchasing", label: "Purchase orders", icon: FileText },
  { href: "/purchasing/new", label: "New purchase order", icon: FileText },
] as const;

const OWNER_MORE = [
  { href: "/settings", label: "Business & events", icon: SettingsIcon },
  { href: "/settings/users", label: "Team", icon: Users },
  { href: "/settings/integrations", label: "Integrations", icon: SettingsIcon },
  { href: "/settings/exports", label: "Data export", icon: FileText },
] as const;

export function MobileTabBar({ role }: { role: "OWNER" | "MANAGER" }) {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = React.useState(false);
  const sheetRef = React.useRef<HTMLDivElement | null>(null);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  // Close the sheet on navigation.
  React.useEffect(() => { setMoreOpen(false); }, [pathname]);

  // Lock the page while the sheet is open, otherwise a swipe on the dim overlay
  // scrolls the content behind it. Preserving/restoring scrollTop avoids the
  // jump-to-top that a bare `overflow:hidden` causes on iOS.
  React.useEffect(() => {
    if (!moreOpen) return;
    const y = window.scrollY;
    const { body } = document;
    const prev = { position: body.style.position, top: body.style.top, width: body.style.width };
    body.style.position = "fixed";
    body.style.top = `-${y}px`;
    body.style.width = "100%";
    return () => {
      body.style.position = prev.position;
      body.style.top = prev.top;
      body.style.width = prev.width;
      window.scrollTo(0, y);
    };
  }, [moreOpen]);

  // Move focus into the sheet on open and hand it back on close — but only on a
  // real open->close transition. Running the restore branch on mount stole focus
  // to the More button on every page load.
  const wasOpen = React.useRef(false);
  React.useEffect(() => {
    if (moreOpen) {
      // after the open transition commits, so the target is focusable
      requestAnimationFrame(() =>
        sheetRef.current?.querySelector<HTMLElement>("a, button")?.focus(),
      );
    } else if (wasOpen.current) {
      triggerRef.current?.focus({ preventScroll: true });
    }
    wasOpen.current = moreOpen;
  }, [moreOpen]);

  // Trap Tab inside the sheet while it is open.
  React.useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !sheetRef.current) return;
      const f = Array.from(
        sheetRef.current.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"),
      ).filter((el) => el.offsetParent !== null);
      if (f.length === 0) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  // Escape closes the sheet.
  React.useEffect(() => {
    if (!moreOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setMoreOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [moreOpen]);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  // Pick a single winner: the longest matching href. Otherwise /inventory and
  // /inventory/counts both render as the current page.
  const bestMatch = [...TABS, ...MORE, ...OWNER_MORE]
    .map((x) => x.href)
    .filter((h) => isActive(h))
    .sort((a, b) => b.length - a.length)[0];
  const isCurrent = (href: string) => href === bestMatch;
  const moreItems = role === "OWNER" ? [...MORE, ...OWNER_MORE] : MORE;
  const moreActive = moreItems.some((m) => isActive(m.href)) && !TABS.some((t) => isActive(t.href));

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 z-50 overscroll-contain bg-espresso/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMoreOpen(false)}
          aria-hidden
        />
      )}

      {/* "More" sheet */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 max-h-[80dvh] overflow-y-auto overscroll-contain rounded-t-bento-lg border-t border-border bg-card px-4 pt-5 transition-[transform,visibility] duration-200 lg:hidden",
          "pb-[calc(1.25rem+env(safe-area-inset-bottom,0px))]",
          // invisible removes the 12 links from the tab order while still
          // allowing the slide transition; aria-hidden alone left them focusable.
          moreOpen ? "visible translate-y-0" : "invisible pointer-events-none translate-y-full",
        )}
        ref={sheetRef}
        role="dialog"
        aria-modal={moreOpen}
        aria-hidden={!moreOpen}
        aria-label="More sections"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-display text-lg font-semibold">More</span>
          <button
            onClick={() => setMoreOpen(false)}
            className="grid h-9 w-9 place-items-center rounded-full border border-border"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          {moreItems.map((m) => {
            const Icon = m.icon;
            return (
              <Link
                key={m.href}
                href={m.href}
                aria-current={isCurrent(m.href) ? "page" : undefined}
                className={cn(
                  "touch-target flex items-center gap-2.5 rounded-2xl border px-3.5 py-3 text-[13px] font-medium",
                  isCurrent(m.href)
                    ? "border-espresso bg-espresso text-espresso-foreground"
                    : "border-border bg-card",
                )}
              >
                <Icon className="h-4 w-4 shrink-0 opacity-70" />
                <span className="truncate">{m.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Fixed bottom bar — hidden once the desktop pill nav has room. */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-border glass px-2 pb-[env(safe-area-inset-bottom,0px)] lg:hidden"
        aria-label="Primary"
      >
        <div className="mx-auto flex max-w-lg items-stretch">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = isActive(t.href);
            return (
              <Link
                key={t.href}
                href={t.href}
                aria-current={isCurrent(t.href) ? "page" : undefined}
                className={cn(
                  "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
                  active ? "text-brand-ink" : "text-muted-foreground",
                )}
              >
                <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors", active && "bg-brand/12")}>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                {t.label}
              </Link>
            );
          })}
          <button
            ref={triggerRef}
            onClick={() => setMoreOpen((v) => !v)}
            aria-expanded={moreOpen}
            className={cn(
              "flex flex-1 flex-col items-center justify-center gap-1 py-2 text-[10px] font-medium transition-colors",
              moreActive || moreOpen ? "text-brand-ink" : "text-muted-foreground",
            )}
          >
            <span className={cn("grid h-8 w-14 place-items-center rounded-full transition-colors", (moreActive || moreOpen) && "bg-brand/12")}>
              <Menu className="h-[18px] w-[18px]" />
            </span>
            More
          </button>
        </div>
      </nav>
    </>
  );
}
