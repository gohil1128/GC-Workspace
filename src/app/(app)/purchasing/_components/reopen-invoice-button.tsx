"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { closeInvoiceAction } from "@/modules/invoices/actions";
import { toast } from "@/components/ui/use-toast";

export function ReopenInvoiceButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="h-6 px-2 text-2xs"
      disabled={pending}
      onClick={(e) => {
        e.stopPropagation();
        start(async () => {
          try {
            await closeInvoiceAction(id);
            toast({ title: "Invoice re-opened" });
            router.refresh();
          } catch (err: any) {
            toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
          }
        });
      }}
    >
      <Unlock className="h-3 w-3" /> Re-open
    </Button>
  );
}
