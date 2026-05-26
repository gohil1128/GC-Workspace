"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock, Unlock, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { setRecipesPinAction, removeRecipesPinAction, lockRecipesAction } from "@/modules/recipes-lock/actions";
import { toast } from "@/components/ui/use-toast";

export function RecipesLockCard({ hasPin }: { hasPin: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [pin, setPin] = React.useState("");

  const setPinSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      toast({ title: "PIN must be 4 digits", variant: "destructive" });
      return;
    }
    const fd = new FormData(); fd.set("pin", pin);
    start(async () => {
      try {
        await setRecipesPinAction(fd);
        toast({ title: hasPin ? "PIN updated" : "PIN set — recipes are now locked" });
        setPin("");
        router.refresh();
      } catch (err: any) {
        toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  const removePin = () => {
    start(async () => {
      try {
        await removeRecipesPinAction();
        toast({ title: "PIN removed — recipes are now open" });
        router.refresh();
      } catch (err: any) {
        toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  const lockNow = () => {
    start(async () => {
      try {
        await lockRecipesAction();
        toast({ title: "Recipes locked" });
        router.refresh();
      } catch (err: any) {
        toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        {hasPin ? (
          <><Lock className="h-4 w-4 text-warning" /><Badge variant="warning">PIN protected</Badge></>
        ) : (
          <><Unlock className="h-4 w-4 text-muted-foreground" /><Badge variant="muted">Open</Badge></>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        When a PIN is set, the Recipes section requires the PIN to view. Unlocks stay open for 60 minutes.
      </p>
      <form onSubmit={setPinSubmit} className="grid gap-2 sm:grid-cols-[auto_auto] items-end">
        <div className="grid gap-1.5">
          <Label htmlFor="recipes-pin">{hasPin ? "Change PIN (4 digits)" : "Set PIN (4 digits)"}</Label>
          <Input
            id="recipes-pin"
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
            className="num text-center tracking-[0.4em] w-32"
          />
        </div>
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={pending || pin.length !== 4}>
            {hasPin ? "Update PIN" : "Set PIN"}
          </Button>
          {hasPin && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={lockNow} disabled={pending}>
                <Lock className="h-3.5 w-3.5" /> Lock now
              </Button>
              <Button type="button" variant="ghost" size="sm" onClick={removePin} disabled={pending}>
                <Trash2 className="h-3.5 w-3.5" /> Remove PIN
              </Button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
