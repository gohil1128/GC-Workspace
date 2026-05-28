"use client";
import * as React from "react";
import { usePathname } from "next/navigation";

// Re-triggers a subtle fade-in-up each time the route changes,
// giving the app a fluid, premium feel on navigation.
export function PageTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="animate-page">
      {children}
    </div>
  );
}
