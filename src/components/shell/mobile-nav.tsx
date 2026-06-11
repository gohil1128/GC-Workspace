"use client";
import * as React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu, X, UtensilsCrossed,
  LayoutDashboard, Package, ChefHat, ShoppingCart, Clock, Banknote, Receipt, BarChart3, Settings, Lock, ScanLine,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/recipes", label: "Recipes", icon: ChefHat },
  { href: "/purchasing", label: "Purchasing", icon: ShoppingCart },
  { href: "/labor", label: "Labor", icon: Clock },
  { href: "/cash", label: "Cash", icon: Banknote },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/receipts", label: "AI receipts", icon: ScanLine },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings, ownerOnly: true },
];

export function MobileNav({
  role,
  businessName,
  recipesLocked,
}: {
  role: "OWNER" | "MANAGER";
  businessName: string;
  recipesLocked: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  const [mounted, setMounted] = React.useState(false);
  const [logoFailed, setLogoFailed] = React.useState(false);
  const pathname = usePathname();

  React.useEffect(() => setMounted(true), []);
  // Close when the route changes
  React.useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll while open
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    if (open) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Close on Escape
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="h-4 w-4" />
      </Button>

      {mounted && open && createPortal(
        <div className="md:hidden">
          {/* Backdrop */}
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[9998] bg-black/60"
          />
          {/* Slide-in drawer */}
          <aside
            role="dialog"
            aria-modal="true"
            className="fixed top-0 bottom-0 left-0 z-[9999] flex w-[78%] max-w-xs flex-col border-r bg-card shadow-2xl"
          >
            <div className="flex h-14 shrink-0 items-center justify-between gap-2 border-b bg-card px-3">
              <div className="flex items-center gap-2 min-w-0">
                {!logoFailed ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src="/logo.png"
                    alt={businessName}
                    className="h-10 w-auto"
                    onError={() => setLogoFailed(true)}
                  />
                ) : (
                  <>
                    <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground shrink-0">
                      <UtensilsCrossed className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-semibold truncate">{businessName}</span>
                  </>
                )}
              </div>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <nav className="flex flex-col gap-0.5 p-2 overflow-y-auto flex-1">
              {NAV.filter((n) => !n.ownerOnly || role === "OWNER").map((n) => {
                const active = pathname === n.href || pathname.startsWith(n.href + "/");
                const Icon = n.icon;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                      active
                        ? "bg-secondary text-secondary-foreground"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1">{n.label}</span>
                    {n.href === "/recipes" && recipesLocked && (
                      <Lock className="h-3 w-3 text-warning" aria-label="PIN protected" />
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="border-t p-3 text-2xs text-muted-foreground">v0.1 · Restaurant Ops MVP</div>
          </aside>
        </div>,
        document.body
      )}
    </>
  );
}
