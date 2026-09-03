"use client";
import * as React from "react";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";

// Logo lockup at the left of the single-row header. Falls back to a mark +
// wordmark if the logo asset is missing.
export function BrandBar({ businessName }: { businessName: string }) {
  const [logoFailed, setLogoFailed] = React.useState(false);
  return (
    <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
      {!logoFailed ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src="/logo.png"
          alt={businessName}
          className="h-10 w-auto sm:h-11"
          onError={() => setLogoFailed(true)}
        />
      ) : (
        <>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-brand-foreground">
            <UtensilsCrossed className="h-4 w-4" />
          </div>
          <span className="hidden font-display text-sm font-semibold tracking-tight sm:block">
            {businessName}
          </span>
        </>
      )}
    </Link>
  );
}
