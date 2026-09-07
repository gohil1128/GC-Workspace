"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Lock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { unlockSectionsAction } from "@/modules/section-lock/actions";
import { toast } from "@/components/ui/use-toast";

/**
 * Shown in place of a locked section. One gate for all of them — unlocking
 * opens every locked section for the hour, so the copy says so rather than
 * implying this PIN only opens the page you happen to be on.
 */
export function SectionPinGate({ title, blurb }: { title: string; blurb: string }) {
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
        const res = await unlockSectionsAction(fd);
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
    <div className="flex justify-center px-4 pt-12">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{blurb}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="section-pin">PIN</Label>
              <Input
                id="section-pin"
                inputMode="numeric"
                pattern="\d{4}"
                maxLength={4}
                autoFocus
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="num text-center text-2xl tracking-[0.5em]"
                required
              />
            </div>
            <Button type="submit" disabled={pending || pin.length !== 4}>
              {pending ? "Unlocking…" : "Unlock"}
            </Button>
            <p className="text-center text-2xs text-muted-foreground">
              Opens every locked section for 60 minutes.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
