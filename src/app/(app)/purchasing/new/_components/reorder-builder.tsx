"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatMoney, fromCents } from "@/lib/money";
import { createPoAction } from "@/modules/purchasing/actions";
import { toast } from "@/components/ui/use-toast";

type Item = {
  ingredientId: string;
  name: string;
  unit: string;
  onHand: number;
  parLevel: number;
  reorderPoint: number;
  suggested: number;
  lastCostCents: number;
};
type Group = { supplier: { id: string; name: string; leadTimeDays: number } | null; items: Item[] };

export function ReorderBuilder({ groups, allSuppliers }: { groups: Group[]; allSuppliers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [state, setState] = React.useState(() =>
    groups.map((g) => ({
      ...g,
      supplierId: g.supplier?.id ?? "",
      expectedAt: "",
      notes: "",
      items: g.items.map((i) => ({ ...i, qty: i.suggested, unitCostDollars: fromCents(i.lastCostCents).toString() })),
    }))
  );

  const totalCents = (items: typeof state[0]["items"]) =>
    items.reduce((a, i) => a + Math.round(i.qty * Math.round(Number(i.unitCostDollars || 0) * 100)), 0);

  const updateQty = (gi: number, ii: number, q: string) => {
    setState((s) => {
      const next = [...s];
      next[gi].items[ii] = { ...next[gi].items[ii], qty: Number(q) || 0 };
      return next;
    });
  };

  const updateCost = (gi: number, ii: number, v: string) => {
    setState((s) => {
      const next = [...s];
      next[gi].items[ii] = { ...next[gi].items[ii], unitCostDollars: v };
      return next;
    });
  };

  const updateSupplier = (gi: number, id: string) => {
    setState((s) => {
      const next = [...s];
      next[gi] = { ...next[gi], supplierId: id };
      return next;
    });
  };

  const createOne = (gi: number) => {
    const grp = state[gi];
    if (!grp.supplierId) {
      toast({ title: "Pick a supplier", variant: "destructive" });
      return;
    }
    const items = grp.items
      .filter((i) => i.qty > 0)
      .map((i) => ({
        ingredientId: i.ingredientId,
        qtyOrdered: i.qty,
        unit: i.unit,
        unitCostDollars: Number(i.unitCostDollars || 0),
      }));
    if (items.length === 0) {
      toast({ title: "No items with quantity > 0", variant: "destructive" });
      return;
    }
    start(async () => {
      try {
        await createPoAction({
          supplierId: grp.supplierId,
          expectedAt: grp.expectedAt || null,
          notes: grp.notes || null,
          items,
        });
      } catch (err: any) {
        if (err?.digest?.startsWith("NEXT_REDIRECT")) return;
        toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  if (state.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nothing to reorder</CardTitle>
          <CardDescription>All ingredients are above their reorder point.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <div className="grid gap-4">
      {state.map((g, gi) => (
        <Card key={gi}>
          <CardHeader className="flex-row items-start justify-between space-y-0 gap-4">
            <div>
              <CardTitle>{g.supplier?.name ?? "Unassigned"}</CardTitle>
              <CardDescription>
                {g.items.length} item{g.items.length === 1 ? "" : "s"} suggested
                {g.supplier?.leadTimeDays ? ` · ${g.supplier.leadTimeDays}d lead time` : ""}
              </CardDescription>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Total</div>
              <div className="text-lg font-semibold num">{formatMoney(totalCents(g.items))}</div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="grid gap-1.5">
                <Label>Supplier</Label>
                <Select value={g.supplierId} onValueChange={(v) => updateSupplier(gi, v)}>
                  <SelectTrigger><SelectValue placeholder="Choose supplier" /></SelectTrigger>
                  <SelectContent>
                    {allSuppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-1.5">
                <Label>Expected date</Label>
                <Input
                  type="date"
                  value={g.expectedAt}
                  onChange={(e) => setState((s) => { const n = [...s]; n[gi] = { ...n[gi], expectedAt: e.target.value }; return n; })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Notes</Label>
                <Textarea
                  rows={1}
                  value={g.notes}
                  onChange={(e) => setState((s) => { const n = [...s]; n[gi] = { ...n[gi], notes: e.target.value }; return n; })}
                />
              </div>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="text-right">On Hand</TableHead>
                    <TableHead className="text-right">Reorder Pt</TableHead>
                    <TableHead className="text-right">Par</TableHead>
                    <TableHead className="text-right w-32">Qty</TableHead>
                    <TableHead className="text-right w-32">$/unit</TableHead>
                    <TableHead className="text-right">Line $</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {g.items.map((it, ii) => (
                    <TableRow key={it.ingredientId}>
                      <TableCell className="font-medium">{it.name} <span className="text-2xs text-muted-foreground">({it.unit})</span></TableCell>
                      <TableCell className="text-right num text-destructive">{it.onHand.toFixed(2)}</TableCell>
                      <TableCell className="text-right num text-muted-foreground">{it.reorderPoint.toFixed(2)}</TableCell>
                      <TableCell className="text-right num text-muted-foreground">{it.parLevel.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Input type="number" step="0.01" min="0" value={it.qty} onChange={(e) => updateQty(gi, ii, e.target.value)} className="h-8 text-right num" />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input type="number" step="0.01" min="0" value={it.unitCostDollars} onChange={(e) => updateCost(gi, ii, e.target.value)} className="h-8 text-right num" />
                      </TableCell>
                      <TableCell className="text-right num">{formatMoney(Math.round(it.qty * Math.round(Number(it.unitCostDollars || 0) * 100)))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => createOne(gi)} disabled={pending}>{pending ? "Creating..." : "Create PO"}</Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
