"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ChefHat,
  ShoppingCart,
  Clock,
  Banknote,
  BarChart3,
  Settings,
  UtensilsCrossed,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/recipes", label: "Recipes", icon: ChefHat },
  { href: "/purchasing", label: "Purchasing", icon: ShoppingCart },
  { href: "/labor", label: "Labor", icon: Clock },
  { href: "/cash", label: "Cash", icon: Banknote },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/settings", label: "Settings", icon: Settings, ownerOnly: true },
];

export function Sidebar({ role }: { role: "OWNER" | "MANAGER" }) {
  const pathname = usePathname();
  return (
    <aside className="hidden md:flex md:w-56 lg:w-60 shrink-0 flex-col border-r bg-card">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
          <UtensilsCrossed className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Northwind Eats</span>
          <span className="text-2xs text-muted-foreground">Operations</span>
        </div>
      </div>
      <nav className="flex flex-col gap-0.5 p-2">
        {NAV.filter((n) => !n.ownerOnly || role === "OWNER").map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-secondary text-secondary-foreground"
                  : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {n.label}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-3 text-2xs text-muted-foreground">
        v0.1 · Restaurant Ops MVP
      </div>
    </aside>
  );
}
