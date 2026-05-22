"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { saveCountAction } from "@/modules/inventory/actions";
import { toast } from "@/components/ui/use-toast";

type Item = { id: string; name: string; unit: string; onHand: number };

export function CountEntryGrid({ ingredients }: { ingredients: Item[] }) {
  const [values, setValues] = React.useState<Record<string, string>>({});
  const [notes, setNotes] = React.useState("");
  const [pending, start] = React.useTransition();
  const router = useRouter();

  const filledCount = Object.values(values).filter((v) => v !== "" && !isNaN(Number(v))).length;

  const submit = () => {
    const lines = Object.entries(values)
      .filter(([, v]) => v !== "" && !isNaN(Number(v)))
      .map(([ingredientId, v]) => ({ ingredientId, qtyCounted: Number(v) }));
    if (lines.length === 0) {
      toast({ title: "Enter at least one count", variant: "destructive" });
      return;
    }
    const fd = new FormData();
    fd.set("payload", JSON.stringify({ type: "WEEKLY", notes: notes || null, lines }));
    start(async () => {
      try {
        await saveCountAction(fd);
      } catch (err: any) {
        if (err?.digest?.startsWith("NEXT_REDIRECT")) {
          router.push("/inventory/variance");
          return;
        }
        toast({ title: "Failed to save count", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">{filledCount} of {ingredients.length} counted</div>
      <div className="rounded-md border max-h-[500px] overflow-y-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ingredient</TableHead>
              <TableHead className="text-right">Theoretical</TableHead>
              <TableHead className="text-right w-32">Actual</TableHead>
              <TableHead className="text-right">Variance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {ingredients.map((i) => {
              const v = values[i.id];
              const num = v === "" || v === undefined ? null : Number(v);
              const variance = num === null || isNaN(num) ? null : num - i.onHand;
              return (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">{i.name}</TableCell>
                  <TableCell className="text-right num text-muted-foreground">{i.onHand.toFixed(2)} {i.unit}</TableCell>
                  <TableCell className="text-right">
                    <Input
                      type="number"
                      step="0.01"
                      inputMode="decimal"
                      value={v ?? ""}
                      onChange={(e) => setValues({ ...values, [i.id]: e.target.value })}
                      className="h-8 text-right num"
                    />
                  </TableCell>
                  <TableCell className={`text-right num ${variance === null ? "text-muted-foreground" : variance < 0 ? "text-destructive" : variance > 0 ? "text-warning" : "text-success"}`}>
                    {variance === null || isNaN(variance) ? "—" : `${variance > 0 ? "+" : ""}${variance.toFixed(2)}`}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="notes">Notes (optional)</Label>
        <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => setValues({})} disabled={pending}>Clear</Button>
        <Button onClick={submit} disabled={pending}>{pending ? "Saving..." : `Save count (${filledCount})`}</Button>
      </div>
    </div>
  );
}
