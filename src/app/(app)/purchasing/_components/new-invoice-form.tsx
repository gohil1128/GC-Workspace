"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createInvoiceAction } from "@/modules/invoices/actions";
import { toast } from "@/components/ui/use-toast";

type Supplier = { id: string; name: string };

export function NewInvoiceForm({
  suppliers,
  locationName,
  defaultDate,
}: {
  suppliers: Supplier[];
  locationName: string;
  defaultDate: string;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [supplierId, setSupplierId] = React.useState("");
  const [openPos, setOpenPos] = React.useState<{ id: string; orderedAt: string; totalCents: number }[]>([]);
  const [poId, setPoId] = React.useState<string>("");

  React.useEffect(() => {
    if (!supplierId) { setOpenPos([]); setPoId(""); return; }
    fetch(`/api/purchasing/invoices/open-pos?supplierId=${supplierId}`)
      .then((r) => r.ok ? r.json() : { pos: [] })
      .then((d) => setOpenPos(d.pos))
      .catch(() => setOpenPos([]));
  }, [supplierId]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        if (poId) fd.set("poId", poId);
        start(async () => {
          try {
            await createInvoiceAction(fd);
          } catch (err: any) {
            if (err?.digest?.startsWith("NEXT_REDIRECT")) return;
            toast({ title: "Could not create invoice", description: String(err?.message ?? err), variant: "destructive" });
          }
        });
      }}
      className="grid gap-4"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="supplierId">Supplier</Label>
          <Select name="supplierId" value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger id="supplierId"><SelectValue placeholder="Pick supplier" /></SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>Store</Label>
          <Input value={locationName} disabled />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="poId">Create from PO (optional)</Label>
          <Select value={poId} onValueChange={setPoId} disabled={!supplierId}>
            <SelectTrigger><SelectValue placeholder={supplierId ? (openPos.length === 0 ? "No open POs" : "Pick a PO to copy items") : "Pick a supplier first"} /></SelectTrigger>
            <SelectContent>
              {openPos.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  #{p.id.slice(-6).toUpperCase()} · {new Date(p.orderedAt).toLocaleDateString()} · ${(p.totalCents/100).toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="invoiceNumber">Invoice Number</Label>
          <Input id="invoiceNumber" name="invoiceNumber" required autoFocus />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="invoiceDate">Invoice Date</Label>
          <Input id="invoiceDate" name="invoiceDate" type="date" required defaultValue={defaultDate} />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="dateReceived">Date Received</Label>
          <Input id="dateReceived" name="dateReceived" type="date" required defaultValue={defaultDate} />
        </div>
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="internalMemo">Internal Memo</Label>
        <Textarea id="internalMemo" name="internalMemo" rows={3} />
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => router.push("/purchasing/invoices")}>Reset</Button>
        <Button type="submit" disabled={pending || !supplierId}>{pending ? "Creating..." : "Create"}</Button>
      </div>
    </form>
  );
}
