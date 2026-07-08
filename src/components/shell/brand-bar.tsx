"use client";
import * as React from "react";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

// The top row of the header — logo on the left, utility cluster (passed as
// children) on the right. Mirrors the CLEARVIEW blue brand bar.
export function BrandBar({ businessName, children }: { businessName: string; children: React.ReactNode }) {
  const [logoFailed, setLogoFailed] = React.useState(false);
  return (
    <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
      <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
        {!logoFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/logo.png" alt={businessName} className="max-h-9 w-auto" onError={() => setLogoFailed(true)} />
        ) : (
          <>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-brand-foreground shadow-soft">
              <UtensilsCrossed className="h-4 w-4" />
            </div>
            <span className="text-sm font-semibold tracking-tight hidden sm:block">{businessName}</span>
          </>
        )}
      </Link>
      <div className="ml-auto flex items-center gap-1.5">{children}</div>
    </div>
  );
}
