"use client";
import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { requestPasswordResetAction } from "@/modules/auth/actions";

function Submit() {
  const { pending } = useFormStatus();
  return <Button type="submit" className="w-full" disabled={pending}>{pending ? "Sending..." : "Send reset link"}</Button>;
}

export default function ForgotPasswordPage() {
  const [state, formAction] = useFormState(requestPasswordResetAction, null as { error?: string; ok?: boolean } | null);
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Reset password</CardTitle>
          <CardDescription>
            We&apos;ll send a reset link to your email. <span className="text-warning">(Placeholder — no email sent in demo.)</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" name="email" type="email" required />
            </div>
            {state?.error && <p className="text-xs text-destructive">{state.error}</p>}
            {state?.ok && <p className="text-xs text-success">If that email exists, a reset link is on the way.</p>}
            <Submit />
            <Link href="/login" className="text-xs text-muted-foreground hover:text-foreground text-center pt-2">Back to sign in</Link>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
