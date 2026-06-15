"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

type Result = {
  days: { created: number; updated: number; total: number };
  items: { created: number; updated: number; total: number };
  uniqueItems: string[];
  errors: { row: number; reason: string }[];
};

type Event = { id: string; name: string; color: string | null };

export function SquareItemsImporter({
  events,
  defaultEventId,
}: {
  events: Event[];
  defaultEventId?: string;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [eventId, setEventId] = React.useState<string>(defaultEventId ?? "none");
  const [result, setResult] = React.useState<Result | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!(fd.get("file") instanceof File)) return;
    fd.set("eventId", eventId);
    setError(null);
    setResult(null);
    start(async () => {
      const res = await fetch("/api/imports/square-items", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Upload failed");
        toast({ title: "Import failed", description: data?.error ?? "", variant: "destructive" });
        return;
      }
      setResult(data as Result);
      toast({
        title: "Items import complete",
        description: `${data.items.created + data.items.updated} item rollups · ${data.uniqueItems.length} unique items`,
      });
      router.refresh();
    });
  };

  const selectedEvent = events.find((e) => e.id === eventId);

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="sqi-file">Per-item CSV file</Label>
        <input
          id="sqi-file"
          type="file"
          name="file"
          accept=".csv,text/csv"
          className="text-sm"
          required
        />
      </div>

      {events.length > 0 && (
        <div className="grid gap-1.5">
          <Label htmlFor="sqi-event">Tag every row with an event</Label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger id="sqi-event"><SelectValue placeholder="None" /></SelectTrigger>
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
          {selectedEvent && (
            <span className="text-2xs text-muted-foreground">
              Daily totals + per-item rollups will all be filterable as &quot;{selectedEvent.name}&quot;.
            </span>
          )}
        </div>
      )}

      <Button type="submit" size="sm" variant="brand" disabled={pending}>
        <Upload className="h-3.5 w-3.5" /> {pending ? "Uploading..." : "Upload per-item CSV"}
      </Button>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-2 text-xs whitespace-pre-wrap">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-md border bg-muted/30 p-2 text-xs space-y-1.5">
          <div className="flex items-center gap-1 text-success font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {result.days.total} day{result.days.total === 1 ? "" : "s"} · {result.items.total} item rollups · {result.uniqueItems.length} unique items
            {selectedEvent && <span className="text-muted-foreground"> · tagged &quot;{selectedEvent.name}&quot;</span>}
          </div>
          <div className="flex flex-wrap gap-1">
            {result.uniqueItems.map((name) => (
              <Badge key={name} variant="muted" className="text-2xs gap-1">
                <Sparkles className="h-2.5 w-2.5" /> {name}
              </Badge>
            ))}
          </div>
          {result.errors?.length > 0 && (
            <div className="text-destructive">
              <span className="font-medium">{result.errors.length} error{result.errors.length === 1 ? "" : "s"}</span>
              <ul className="list-disc list-inside">
                {result.errors.slice(0, 5).map((e, i) => (
                  <li key={i}>Row {e.row}: {e.reason}</li>
                ))}
                {result.errors.length > 5 && <li>...and {result.errors.length - 5} more</li>}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="text-2xs text-muted-foreground leading-relaxed">
        Use this for Square Dashboard → Reports → <em>Sales Items</em> → Export. Each row is one line item from one transaction; we aggregate to <strong>day-level totals</strong> AND <strong>per-item rollups</strong> so you can see which items moved.
      </div>
    </form>
  );
}
