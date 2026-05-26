"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { closeInvoiceAction } from "@/modules/invoices/actions";
import { toast } from "@/components/ui/use-toast";

export function CloseInvoiceButton({ id, closed }: { id: string; closed: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <Button
      size="sm"
      variant={closed ? "outline" : "success"}
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await closeInvoiceAction(id);
            toast({ title: closed ? "Invoice re-opened" : "Invoice closed" });
            router.refresh();
          } catch (err: any) {
            toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
          }
        })
      }
    >
      {closed ? <><Unlock className="h-3.5 w-3.5" /> Re-open</> : <><Lock className="h-3.5 w-3.5" /> Close invoice</>}
    </Button>
  );
}
