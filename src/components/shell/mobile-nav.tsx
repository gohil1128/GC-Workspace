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
  return (
    <>
      <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setOpen(true)} aria-label="Open menu">
        <Menu className="h-4 w-4" />
      </Button>
      {open && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur md:hidden">
          <div className="flex h-14 items-center justify-between border-b px-4">
            <span className="text-sm font-semibold">Menu</span>
            <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close menu">
              <X className="h-4 w-4" />
            </Button>
          </div>
          <nav className="flex flex-col gap-1 p-4">
            {NAV.filter((n) => !n.ownerOnly || role === "OWNER").map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={cn(
                  "rounded-md px-3 py-2 text-base",
                  pathname.startsWith(n.href) ? "bg-secondary text-secondary-foreground" : "text-foreground"
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
