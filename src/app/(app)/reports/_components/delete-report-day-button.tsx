"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { deleteImportedDayAction } from "@/modules/imports/actions";

export function DeleteReportDayButton({ iso, label }: { iso: string; label: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();

  const onDelete = () => {
    start(async () => {
      try {
        const res = await deleteImportedDayAction(iso);
        toast({
          title: "Sales report deleted",
          description: `${label} removed · ${res.salesDeleted} day record, ${res.itemsDeleted} item rollups`,
        });
        setOpen(false);
        router.refresh();
      } catch (err: any) {
        toast({ title: "Delete failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        size="icon"
        variant="ghost"
        className="h-7 w-7"
        onClick={() => setOpen(true)}
        aria-label={`Delete sales report for ${label}`}
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            Delete {label} sales report?
          </DialogTitle>
          <DialogDescription>
            This permanently removes the sales total and any per-item rollups for{" "}
            <span className="font-medium text-foreground">{label}</span> at this location.
            Cash closes and invoices are not affected. This cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
          <Button variant="destructive" onClick={onDelete} disabled={pending}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
            Delete report
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
