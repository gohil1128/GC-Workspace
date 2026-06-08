"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ChefHat,
  ShoppingCart,
  Clock,
  Banknote,
  Receipt,
  BarChart3,
  Settings,
  UtensilsCrossed,
  Lock,
  ScanLine,
} from "lucide-react";
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

export function Sidebar({ role, businessName, recipesLocked }: { role: "OWNER" | "MANAGER"; businessName: string; recipesLocked: boolean }) {
  const pathname = usePathname();
  const [logoFailed, setLogoFailed] = React.useState(false);
  return (
    <aside className="hidden md:flex md:w-60 lg:w-64 shrink-0 flex-col border-r bg-card/60">
      <div className="flex h-16 items-center px-5">
        {!logoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src="/logo.png"
            alt={businessName}
            className="max-h-11 w-auto"
            onError={() => setLogoFailed(true)}
          />
        ) : (
          <div className="flex items-center gap-2.5 w-full">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-soft">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <div className="flex flex-col leading-tight min-w-0">
              <span className="text-sm font-semibold truncate tracking-tight">{businessName}</span>
              <span className="text-2xs text-muted-foreground">Operations</span>
            </div>
          </div>
        )}
      </div>
      <nav className="flex flex-col gap-1 px-3 pt-2">
        {NAV.filter((n) => !n.ownerOnly || role === "OWNER").map((n) => {
          const active = pathname === n.href || pathname.startsWith(n.href + "/");
          const Icon = n.icon;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150",
                active
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground"
              )}
            >
              {active && <span className="absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand" />}
              <Icon className={cn("h-[1.05rem] w-[1.05rem] transition-colors", active ? "text-brand" : "text-muted-foreground group-hover:text-foreground")} />
              <span className="flex-1">{n.label}</span>
              {n.href === "/recipes" && recipesLocked && (
                <Lock className="h-3 w-3 text-warning" aria-label="PIN protected" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto p-4 text-2xs text-muted-foreground/70">
        God&apos;s Chai Ops · v1.0
      </div>
    </aside>
  );
}
