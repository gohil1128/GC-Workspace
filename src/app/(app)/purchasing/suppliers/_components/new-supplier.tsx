"use client";
import * as React from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupplierAction } from "@/modules/purchasing/actions";
import { toast } from "@/components/ui/use-toast";

export function NewSupplierButton() {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5" /> New supplier</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New supplier</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              try {
                await createSupplierAction(fd);
                toast({ title: "Supplier created" });
                setOpen(false);
                router.refresh();
              } catch (err: any) {
                toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
              }
            });
          }}
          className="grid gap-3"
        >
          <div className="grid gap-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" /></div>
            <div className="grid gap-1.5"><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label htmlFor="terms">Terms</Label><Input id="terms" name="terms" placeholder="Net 30" /></div>
            <div className="grid gap-1.5"><Label htmlFor="leadTimeDays">Lead time (days)</Label><Input id="leadTimeDays" name="leadTimeDays" type="number" min="0" defaultValue={2} /></div>
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
