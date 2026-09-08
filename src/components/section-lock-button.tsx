"use client";
import * as React from "react";
import { Lock } from "lucide-react";
import { lockSectionsAction } from "@/modules/section-lock/actions";

/**
 * Minimal re-lock control, shown inside a section that is only open because
 * the PIN was entered. Deliberately small and quiet: it is a way out, not a
 * feature to advertise, and it sits above the page's own masthead so it never
 * competes with the page title.
 *
 * Locking closes every unlocked section at once, which is the same scope the
 * unlock had — so the label says "Lock sections", not "Lock this page".
 */
export function SectionLockButton() {
  const [pending, start] = React.useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await lockSectionsAction();
          // Same reason as the gate: locking is a cookie deletion, and a
          // client refresh can render from a payload that still carries it.
          window.location.reload();
        })
      }
      className="touch-target inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-2xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:opacity-60"
    >
      <Lock className="h-3 w-3" aria-hidden />
      {pending ? "Locking…" : "Lock sections"}
    </button>
  );
}
