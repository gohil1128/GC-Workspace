"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { unlockRecipesAction } from "@/modules/recipes-lock/actions";
import { toast } from "@/components/ui/use-toast";

export function PinGate() {
  const router = useRouter();
  const [pin, setPin] = React.useState("");
  const [pending, start] = React.useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{4}$/.test(pin)) {
      toast({ title: "Enter the 4-digit PIN", variant: "destructive" });
      return;
    }
    const fd = new FormData();
    fd.set("pin", pin);
    start(async () => {
      try {
        const res = await unlockRecipesAction(fd);
        if (res && "error" in res && res.error) {
          toast({ title: res.error, variant: "destructive" });
          setPin("");
          return;
        }
        router.refresh();
      } catch (err: any) {
        toast({ title: "Unlock failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex justify-center pt-12 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle>Recipes are locked</CardTitle>
          <CardDescription>Enter the 4-digit PIN to view recipes and BOM costs.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="pin">PIN</Label>
              <Input
                id="pin"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="text-center text-2xl tracking-[0.5em] num"
                required
              />
            </div>
            <Button type="submit" disabled={pending || pin.length !== 4}>{pending ? "Unlocking..." : "Unlock"}</Button>
            <p className="text-2xs text-muted-foreground text-center">Stays unlocked for 60 minutes.</p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
