"use client";
import * as React from "react";
import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createRecipeAction } from "@/modules/recipes/actions";
import { toast } from "@/components/ui/use-toast";

export function NewRecipeButton() {
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const router = useRouter();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="h-3.5 w-3.5" /> New recipe</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>New recipe</DialogTitle></DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget);
            start(async () => {
              try {
                await createRecipeAction(fd);
              } catch (err: any) {
                if (err?.digest?.startsWith("NEXT_REDIRECT")) {
                  router.refresh();
                  return;
                }
                toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
              }
            });
          }}
          className="grid gap-3"
        >
          <div className="grid gap-1.5">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="category">Category</Label>
              <Input id="category" name="category" placeholder="Mains, Drinks, ..." />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="menuPriceDollars">Menu price ($)</Label>
              <Input id="menuPriceDollars" name="menuPriceDollars" type="number" step="0.01" min="0" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="yieldQty">Yield qty</Label>
              <Input id="yieldQty" name="yieldQty" type="number" step="0.01" min="0.01" defaultValue={1} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="yieldUnit">Yield unit</Label>
              <Input id="yieldUnit" name="yieldUnit" defaultValue="ea" />
            </div>
          </div>
          <input type="hidden" name="isActive" value="true" />
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" disabled={pending}>{pending ? "Saving..." : "Create & edit BOM"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
