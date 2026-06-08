"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";

type Result = {
  created: number;
  updated: number;
  errors: { row: number; reason: string }[];
  cashClosesTouched: number;
  detected: Record<string, string | null>;
};

type Event = { id: string; name: string; color: string | null };

export function SquareImporter({ events }: { events: Event[] }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [result, setResult] = React.useState<Result | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [eventId, setEventId] = React.useState<string>("none");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!(fd.get("file") instanceof File)) return;
    fd.set("eventId", eventId);
    setError(null);
    setResult(null);
    start(async () => {
      const res = await fetch("/api/imports/square", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error ?? "Upload failed");
        if (data?.detectedColumns) {
          setError(`${data.error}\n\nColumns we saw in your file:\n${data.detectedColumns.join(", ")}`);
        }
        toast({ title: "Import failed", description: data?.error ?? "Unknown error", variant: "destructive" });
        return;
      }
      setResult(data as Result);
      toast({
        title: "Square import complete",
        description: `${data.created} created · ${data.updated} updated · ${data.errors?.length ?? 0} errors`,
      });
      router.refresh();
    });
  };

  const selectedEvent = events.find((e) => e.id === eventId);

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="sq-file">CSV file</Label>
        <input id="sq-file" type="file" name="file" accept=".csv,text/csv" className="text-sm" required />
      </div>

      {events.length > 0 && (
        <div className="grid gap-1.5">
          <Label htmlFor="sq-event">Tag every row with an event (optional)</Label>
          <Select value={eventId} onValueChange={setEventId}>
            <SelectTrigger id="sq-event">
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
          {selectedEvent && (
            <span className="text-2xs text-muted-foreground">
              All imported days will be filterable as &quot;{selectedEvent.name}&quot; from the top-bar event picker.
            </span>
          )}
        </div>
      )}

      <Button type="submit" size="sm" variant="brand" disabled={pending}>
        <Upload className="h-3.5 w-3.5" /> {pending ? "Uploading..." : "Upload Square CSV"}
      </Button>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-2 text-xs whitespace-pre-wrap">
          {error}
        </div>
      )}

      {result && (
        <div className="rounded-md border bg-muted/30 p-2 text-xs space-y-1">
          <div className="flex items-center gap-1 text-success font-medium">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {result.created} created · {result.updated} updated · {result.cashClosesTouched} cash closes updated
            {selectedEvent && <span className="text-muted-foreground"> · tagged &quot;{selectedEvent.name}&quot;</span>}
          </div>
          <div className="text-muted-foreground">
            <span className="font-medium">Detected columns:</span> Date: <code>{result.detected.dateCol ?? "—"}</code>,
            Net: <code>{result.detected.netCol ?? result.detected.grossCol ?? "—"}</code>,
            Tax: <code>{result.detected.taxCol ?? "—"}</code>,
            Cash: <code>{result.detected.cashCol ?? "—"}</code>,
            Card: <code>{result.detected.cardCol ?? "—"}</code>,
            Tips: <code>{result.detected.tipsCol ?? "—"}</code>,
            Guests: <code>{result.detected.guestsCol ?? "—"}</code> <span className="text-2xs">(1 transaction = 1 guest)</span>
          </div>
          {result.errors?.length > 0 && (
            <div className="text-destructive">
              <span className="font-medium">{result.errors.length} error{result.errors.length === 1 ? "" : "s"}:</span>
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

      <div className="text-2xs text-muted-foreground">
        Tip: in Square Dashboard → Reports → Sales Summary → set the date range → click <em>Export</em> → choose <em>Daily</em> grouping. Upload that CSV here.
      </div>
    </form>
  );
}
