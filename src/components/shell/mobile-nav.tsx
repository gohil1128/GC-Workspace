"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/inventory", label: "Inventory" },
  { href: "/recipes", label: "Recipes" },
  { href: "/purchasing", label: "Purchasing" },
  { href: "/labor", label: "Labor" },
  { href: "/cash", label: "Cash" },
  { href: "/reports", label: "Reports" },
  { href: "/settings", label: "Settings", ownerOnly: true },
];

export function MobileNav({ role }: { role: "OWNER" | "MANAGER" }) {
  const [open, setOpen] = React.useState(false);
  const pathname = usePathname();
  React.useEffect(() => setOpen(false), [pathname]);
  // Lock body scroll while the drawer is open so the page behind doesn't move.
  React.useEffect(() => {
    if (typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = open ? "hidden" : prev;
    return () => { document.body.style.overflow = prev; };
  }, [open]);
  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="h-4 w-4" />
      </Button>
      {open && (
        <div className="fixed inset-0 z-[100] flex flex-col bg-background md:hidden">
          <div className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
            <span className="text-sm font-semibold">Menu</span>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="flex flex-col gap-1 p-4 overflow-y-auto flex-1">
            {NAV.filter((n) => !n.ownerOnly || role === "OWNER").map((n) => (
              <Link
                key={n.href}
                href={n.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "rounded-md px-3 py-2.5 text-base",
                  pathname.startsWith(n.href) ? "bg-secondary text-secondary-foreground" : "text-foreground hover:bg-secondary/60"
                )}
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </>
  );
}
