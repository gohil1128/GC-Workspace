"use client";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { UtensilsCrossed } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { loginAction } from "@/modules/auth/actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in..." : "Sign in"}
    </Button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState(loginAction, null as { error?: string } | null);
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center text-center pb-4">
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded bg-primary text-primary-foreground">
            <UtensilsCrossed className="h-5 w-5" />
          </div>
          <CardTitle className="text-base">God&apos;s Chai Operations</CardTitle>
          <CardDescription>Sign in to your back-office</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" autoComplete="email" required defaultValue="owner@demo.test" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" name="password" type="password" autoComplete="current-password" required defaultValue="demo1234" />
            </div>
            {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
            <Submit />
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2">
              <Link href="/forgot-password" className="hover:text-foreground">Forgot password?</Link>
              <span>Demo: owner@demo.test / demo1234</span>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
