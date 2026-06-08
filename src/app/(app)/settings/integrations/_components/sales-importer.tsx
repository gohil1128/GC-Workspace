"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

type Event = { id: string; name: string; color: string | null };

export function SalesImporter({ events }: { events: Event[] }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const [eventId, setEventId] = React.useState<string>("none");
  const [result, setResult] = React.useState<{ created: number; updated: number; errors: number } | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!(fd.get("file") instanceof File)) return;
    fd.set("eventId", eventId);
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
      <div className="grid gap-1.5">
        <Label htmlFor="sg-file">CSV file</Label>
        <input id="sg-file" ref={fileRef} type="file" name="file" accept=".csv,text/csv" className="text-sm" required />
      </div>
      {events.length > 0 && (
        <div className="grid gap-1.5">
          <Label htmlFor="sg-event">Tag every row with an event (optional)</Label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger id="sg-event">
              <SelectValue placeholder="None" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No event tag</SelectItem>
              {events.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  <span className="inline-flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color ?? "hsl(var(--muted-foreground))" }} />
                    {e.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button type="submit" size="sm" disabled={pending}>
        <Upload className="h-3.5 w-3.5" /> {pending ? "Uploading..." : "Upload sales CSV"}
      </Button>
      {result && (
        <div className="text-2xs text-muted-foreground">
          {result.created} created · {result.updated} updated · {result.errors} errors
        </div>
      )}
      <div className="text-2xs text-muted-foreground">
        Columns: <code className="rounded bg-muted px-1 py-0.5">date, net_sales, tax, tips, guests</code>
      </div>
    </form>
  );
}
