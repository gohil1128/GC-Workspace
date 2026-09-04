import Link from "next/link";
import { SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

// Rendered inside the app shell, so the sidebar and tab bar stay available —
// a mistyped or deleted record shouldn't strand you outside the navigation.
export default function AppNotFound() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8">
      <div className="bento mx-auto max-w-md p-10 text-center">
        <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-accent">
          <SearchX className="h-5 w-5 text-muted-foreground" />
        </span>
        <h1 className="text-lg font-semibold">We couldn&apos;t find that</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The record may have been deleted, or the link is out of date.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button asChild size="sm"><Link href="/dashboard">Dashboard</Link></Button>
          <Button asChild size="sm" variant="outline"><Link href="/purchasing/invoices">Invoices</Link></Button>
        </div>
      </div>
    </div>
  );
}
