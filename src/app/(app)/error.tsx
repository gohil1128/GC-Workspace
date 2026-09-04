"use client";
import * as React from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Surfaced in the browser console and the server logs via the digest.
    console.error("App route error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-16 sm:px-6 lg:px-8">
      <div className="bento mx-auto max-w-md p-10 text-center">
        <span className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-destructive-muted">
          <AlertTriangle className="h-5 w-5 text-destructive" />
        </span>
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page failed to load. Retrying often clears it.
        </p>
        {error.digest && (
          <p className="mt-3 text-2xs text-muted-foreground">
            Reference <span className="num">{error.digest}</span>
          </p>
        )}
        <Button onClick={reset} size="sm" className="mt-6">
          <RotateCw className="h-3.5 w-3.5" /> Try again
        </Button>
      </div>
    </div>
  );
}
