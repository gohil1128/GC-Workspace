"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

export function SalesImporter() {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [result, setResult] = React.useState<{ created: number; updated: number; errors: number } | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!(fd.get("file") instanceof File)) return;
    start(async () => {
      const res = await fetch("/api/imports/sales", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Import failed", description: data?.error ?? "Unknown error", variant: "destructive" });
        return;
      }
      setResult({ created: data.created, updated: data.updated, errors: data.errors?.length ?? 0 });
      toast({ title: "Import complete", description: `${data.created} created, ${data.updated} updated, ${data.errors?.length ?? 0} errors` });
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input ref={fileRef} type="file" name="file" accept=".csv,text/csv" className="text-sm" required />
      <Button type="submit" size="sm" disabled={pending}>
        <Upload className="h-3.5 w-3.5" /> {pending ? "Uploading..." : "Upload sales CSV"}
      </Button>
      {result && (
        <div className="text-2xs text-muted-foreground">
          {result.created} created · {result.updated} updated · {result.errors} errors
        </div>
      )}
      <div className="text-2xs text-muted-foreground">
        Sample row: <code className="rounded bg-muted px-1 py-0.5">2026-05-20,2450.00,210.00,118</code>
      </div>
    </form>
  );
}
