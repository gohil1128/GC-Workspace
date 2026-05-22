"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createEmployeeAction } from "@/modules/labor/actions";
import { toast } from "@/components/ui/use-toast";

export function NewEmployeeButton() {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5" /> New employee</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New employee</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              try {
                await createEmployeeAction(fd);
                toast({ title: "Employee added" });
                setOpen(false);
                router.refresh();
              } catch (err: any) { toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" }); }
            });
          }}
          className="grid gap-3"
        >
          <div className="grid gap-1.5"><Label htmlFor="name">Name</Label><Input id="name" name="name" required /></div>
          <div className="grid gap-1.5"><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5"><Label htmlFor="position">Position</Label><Input id="position" name="position" required placeholder="Cook, Server, ..." /></div>
            <div className="grid gap-1.5"><Label htmlFor="hourlyRateDollars">Wage ($/hr)</Label><Input id="hourlyRateDollars" name="hourlyRateDollars" type="number" step="0.01" min="0" required /></div>
          </div>
          <input type="hidden" name="isActive" value="true" />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
