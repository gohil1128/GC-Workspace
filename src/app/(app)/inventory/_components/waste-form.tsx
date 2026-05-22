"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { recordWasteAction } from "@/modules/inventory/actions";
import { toast } from "@/components/ui/use-toast";

export function WasteForm({ ingredientId }: { ingredientId: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const form = new FormData(e.currentTarget);
        form.set("ingredientId", ingredientId);
        start(async () => {
          try {
            await recordWasteAction(form);
            toast({ title: "Waste recorded" });
            (e.target as HTMLFormElement).reset();
            router.refresh();
          } catch (err: any) {
            toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
          }
        });
      }}
      className="grid gap-3"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="qty">Quantity wasted</Label>
        <Input id="qty" name="qty" type="number" step="0.01" min="0.01" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" name="note" rows={2} placeholder="Spoiled, broken, comp..." />
      </div>
      <Button type="submit" size="sm" disabled={pending} variant="destructive">{pending ? "Saving..." : "Record waste"}</Button>
    </form>
  );
}
