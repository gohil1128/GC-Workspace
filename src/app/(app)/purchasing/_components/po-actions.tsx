"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { setPoStatusAction, receivePoAction } from "@/modules/purchasing/actions";
import { toast } from "@/components/ui/use-toast";

type Item = { id: string; name: string; qtyOrdered: number; qtyReceived: number; unit: string };

export function PoActions({ poId, status }: { poId: string; status: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [openReceive, setOpenReceive] = React.useState(false);
  const [items, setItems] = React.useState<Item[]>([]);
  const [receipts, setReceipts] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (openReceive) {
      fetch(`/api/purchasing/${poId}/items`).then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setItems(data.items);
          const init: Record<string, string> = {};
          for (const it of data.items) init[it.id] = String(Math.max(it.qtyOrdered - it.qtyReceived, 0));
          setReceipts(init);
        }
      });
    }
  }, [openReceive, poId]);

  const mark = (next: "SENT" | "CANCELLED") => {
    start(async () => {
      try {
        await setPoStatusAction(poId, next);
        toast({ title: `Marked ${next.toLowerCase()}` });
        router.refresh();
      } catch (err: any) {
        toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  const submitReceive = () => {
    const payload = {
      receipts: Object.entries(receipts).map(([itemId, q]) => ({ itemId, qtyReceived: Number(q) || 0 })),
    };
    start(async () => {
      try {
        await receivePoAction(poId, payload);
        toast({ title: "Receipt recorded" });
        setOpenReceive(false);
        router.refresh();
      } catch (err: any) {
        toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      {status === "DRAFT" && (
        <>
          <Button size="sm" variant="outline" disabled={pending} onClick={() => mark("CANCELLED")}>Cancel</Button>
          <Button size="sm" disabled={pending} onClick={() => mark("SENT")}>Mark sent</Button>
        </>
      )}
      {(status === "SENT" || status === "DRAFT") && (
        <Dialog open={openReceive} onOpenChange={setOpenReceive}>
          <DialogTrigger asChild><Button size="sm" variant="success">Receive</Button></DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader><DialogTitle>Receive items</DialogTitle></DialogHeader>
            <div className="rounded-md border max-h-[400px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ingredient</TableHead>
                    <TableHead className="text-right">Ordered</TableHead>
                    <TableHead className="text-right">Already Received</TableHead>
                    <TableHead className="text-right w-32">Receive now</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.name}</TableCell>
                      <TableCell className="text-right num">{it.qtyOrdered.toFixed(2)} {it.unit}</TableCell>
                      <TableCell className="text-right num text-muted-foreground">{it.qtyReceived.toFixed(2)}</TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number" step="0.01" min="0" className="h-8 text-right num"
                          value={receipts[it.id] ?? ""}
                          onChange={(e) => setReceipts({ ...receipts, [it.id]: e.target.value })}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpenReceive(false)}>Cancel</Button>
              <Button onClick={submitReceive} disabled={pending}>{pending ? "Saving..." : "Confirm receipt"}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
