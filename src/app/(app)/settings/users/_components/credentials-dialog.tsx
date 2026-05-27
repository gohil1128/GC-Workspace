"use client";
import * as React from "react";
import { Copy, Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

// Modal that shows generated email + password and lets the owner copy them.
// Closing the dialog dismisses — the password is never shown again.
export function CredentialsDialog({
  email, password, onClose, title,
}: {
  email: string; password: string; onClose: () => void; title: string;
}) {
  const [copied, setCopied] = React.useState<"creds" | "password" | "email" | null>(null);

  const copy = async (text: string, which: "creds" | "password" | "email") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      toast({ title: "Copied to clipboard" });
      setTimeout(() => setCopied(null), 2000);
    } catch {
      toast({ title: "Copy failed — long-press to select instead", variant: "destructive" });
    }
  };

  const both = `Email: ${email}\nPassword: ${password}`;

  return (
    <Dialog open onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Share these credentials with your team member through any private channel
            (text, signal, etc.). <span className="font-semibold text-foreground">You won&apos;t be able to see the password again</span> — copy it now.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Field label="Email" value={email} onCopy={() => copy(email, "email")} copied={copied === "email"} />
          <Field label="Password" value={password} onCopy={() => copy(password, "password")} copied={copied === "password"} mono />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => copy(both, "creds")}>
            {copied === "creds" ? <><Check className="h-3.5 w-3.5" /> Copied both</> : <><Copy className="h-3.5 w-3.5" /> Copy both</>}
          </Button>
          <Button onClick={onClose}>Done</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, value, onCopy, copied, mono }: { label: string; value: string; onCopy: () => void; copied: boolean; mono?: boolean }) {
  return (
    <div>
      <div className="text-2xs uppercase tracking-wide text-muted-foreground mb-1">{label}</div>
      <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-2 py-1.5">
        <code className={`flex-1 text-sm break-all ${mono ? "font-mono" : ""}`}>{value}</code>
        <Button size="sm" variant="ghost" onClick={onCopy} className="h-7">
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
    </div>
  );
}
