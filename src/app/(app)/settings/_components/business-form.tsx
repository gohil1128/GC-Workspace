"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { updateBusinessAction } from "@/modules/admin/actions";
import { toast } from "@/components/ui/use-toast";

type Props = {
  initial: { name: string; foodTargetPct: number; laborTargetPct: number };
};

export function BusinessForm({ initial }: Props) {
  const [pending, start] = React.useTransition();
  const router = useRouter();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          try {
            await updateBusinessAction(fd);
            toast({ title: "Business updated" });
            router.refresh();
          } catch (err: any) {
            toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
          }
        });
      }}
      className="grid gap-3"
    >
      <div className="grid gap-1.5">
        <Label htmlFor="biz-name">Business name</Label>
        <Input id="biz-name" name="name" required defaultValue={initial.name} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="biz-food">Food cost target (%)</Label>
          <Input id="biz-food" name="foodTargetPct" type="number" min="0" max="100" defaultValue={initial.foodTargetPct} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="biz-labor">Labor cost target (%)</Label>
          <Input id="biz-labor" name="laborTargetPct" type="number" min="0" max="100" defaultValue={initial.laborTargetPct} />
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving..." : "Save"}</Button>
      </div>
    </form>
  );
}
