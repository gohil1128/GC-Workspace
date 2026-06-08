"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";

type Result = {
  created: number;
  updated: number;
  errors: { row: number; reason: string }[];
  cashClosesTouched: number;
  detected: Record<string, string | null>;
};

export function SquareImporter() {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [result, setResult] = React.useState<Result | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (!(fd.get("file") instanceof File)) return;
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

  return (
    <form onSubmit={onSubmit} className="grid gap-3">
      <input type="file" name="file" accept=".csv,text/csv" className="text-sm" required />
      <Button type="submit" size="sm" disabled={pending}>
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
