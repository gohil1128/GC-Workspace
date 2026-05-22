"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Trash2, Plus } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import { updateBomAction } from "@/modules/recipes/actions";
import { toast } from "@/components/ui/use-toast";

type Item = { ingredientId: string; name: string; unit: string; qty: number; avgCostCents: number };
type Catalog = { id: string; name: string; unit: string; avgCostCents: number }[];

export function BomEditor({ recipeId, initial, catalog }: { recipeId: string; initial: Item[]; catalog: Catalog }) {
  const [items, setItems] = React.useState<Item[]>(initial);
  const [pickerId, setPickerId] = React.useState<string>("");
  const [pending, start] = React.useTransition();
  const router = useRouter();

  const totalCents = items.reduce((acc, it) => acc + Math.round(it.qty * it.avgCostCents), 0);

  const add = () => {
    if (!pickerId) return;
    if (items.some((i) => i.ingredientId === pickerId)) return;
    const cat = catalog.find((c) => c.id === pickerId);
    if (!cat) return;
    setItems([...items, { ingredientId: cat.id, name: cat.name, unit: cat.unit, qty: 0, avgCostCents: cat.avgCostCents }]);
    setPickerId("");
  };

  const remove = (id: string) => setItems(items.filter((i) => i.ingredientId !== id));

  const setQty = (id: string, qty: string) => {
    const n = Number(qty);
    setItems(items.map((i) => (i.ingredientId === id ? { ...i, qty: isNaN(n) ? 0 : n } : i)));
  };

  const save = () =>
    start(async () => {
      try {
        await updateBomAction(recipeId, {
          items: items.map((i) => ({ ingredientId: i.ingredientId, qty: i.qty, unit: i.unit })),
        });
        toast({ title: "BOM saved" });
        router.refresh();
      } catch (err: any) {
        toast({ title: "Save failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });

  return (
    <div className="space-y-3">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ingredient</TableHead>
              <TableHead className="text-right w-32">Qty</TableHead>
              <TableHead>Unit</TableHead>
              <TableHead className="text-right">Unit Cost</TableHead>
              <TableHead className="text-right">Line $</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((it) => (
              <TableRow key={it.ingredientId}>
                <TableCell className="font-medium">{it.name}</TableCell>
                <TableCell className="text-right">
                  <Input type="number" step="0.001" min="0" value={it.qty} onChange={(e) => setQty(it.ingredientId, e.target.value)} className="h-8 text-right num" />
                </TableCell>
                <TableCell className="text-muted-foreground">{it.unit}</TableCell>
                <TableCell className="text-right num">{formatMoney(it.avgCostCents)}</TableCell>
                <TableCell className="text-right num">{formatMoney(Math.round(it.qty * it.avgCostCents))}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => remove(it.ingredientId)} aria-label="Remove">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-6">No ingredients yet. Add one below.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[200px]">
          <Select value={pickerId} onValueChange={setPickerId}>
            <SelectTrigger><SelectValue placeholder="Pick an ingredient to add" /></SelectTrigger>
            <SelectContent>
              {catalog
                .filter((c) => !items.some((i) => i.ingredientId === c.id))
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.unit}) · {formatMoney(c.avgCostCents)}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={add} disabled={!pickerId}><Plus className="h-3.5 w-3.5" /> Add</Button>
        <div className="ml-auto flex items-center gap-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Plate cost (live): </span>
            <span className="font-semibold num">{formatMoney(totalCents)}</span>
          </div>
          <Button onClick={save} disabled={pending}>{pending ? "Saving..." : "Save BOM"}</Button>
        </div>
      </div>
    </div>
  );
}
