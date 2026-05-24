"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { wipeBusinessDataAction } from "@/modules/admin/actions";
import { toast } from "@/components/ui/use-toast";

type Counts = {
  ingredients: number;
  recipes: number;
  suppliers: number;
  employees: number;
  pos: number;
  sales: number;
  cashCloses: number;
};

export function DangerZone({ counts }: { counts: Counts }) {
  const [open, setOpen] = React.useState(false);
  const [typed, setTyped] = React.useState("");
  const [pending, start] = React.useTransition();
  const router = useRouter();
  const canWipe = typed.trim().toUpperCase() === "WIPE";

  const totalRows =
    counts.ingredients + counts.recipes + counts.suppliers + counts.employees + counts.pos + counts.sales + counts.cashCloses;

  const submit = () => {
    if (!canWipe) return;
    start(async () => {
      try {
        await wipeBusinessDataAction();
        toast({ title: "All data cleared", description: "You can start fresh now." });
        setOpen(false);
        setTyped("");
        router.refresh();
      } catch (err: any) {
        toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  return (
    <div className="grid gap-3 sm:grid-cols-[1fr_auto] items-start">
      <div>
        <h3 className="text-sm font-medium">Wipe all demo / operational data</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Removes every ingredient, recipe, supplier, employee, sale, count, PO, shift, and cash close
          across all your locations. Your business, locations, and user accounts stay intact so you can
          start fresh with real data.
        </p>
        <p className="text-2xs text-muted-foreground mt-1">
          Currently: {counts.ingredients} ingredients · {counts.recipes} recipes · {counts.suppliers} suppliers ·
          {" "}{counts.employees} employees · {counts.pos} POs · {counts.sales} sales days · {counts.cashCloses} cash closes
          {" "}({totalRows.toLocaleString()} total)
        </p>
      </div>
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)} disabled={totalRows === 0}>
        <Trash2 className="h-3.5 w-3.5" /> Wipe all data
      </Button>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setTyped(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Wipe all data?
            </DialogTitle>
            <DialogDescription>
              This will permanently delete <span className="font-semibold">{totalRows.toLocaleString()} records</span> across
              ingredients, recipes, suppliers, employees, POs, shifts, sales, counts, and cash closes for every location.
              <br /><br />
              Your business, locations, and login accounts will be kept.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5">
            <Label htmlFor="confirm-wipe">
              Type <span className="font-mono font-semibold">WIPE</span> to confirm
            </Label>
            <Input
              id="confirm-wipe"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder="WIPE"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={pending}>Cancel</Button>
            <Button type="button" variant="destructive" onClick={submit} disabled={!canWipe || pending}>
              {pending ? "Wiping..." : "Yes, wipe everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
