"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateInvoiceAction } from "@/modules/invoices/actions";
import { toast } from "@/components/ui/use-toast";

type Initial = {
  supplierName: string;
  locationName: string;
  createdByName: string;
  createdAt: string;
  invoiceNumber: string;
  invoiceDate: string;
  dateReceived: string;
  internalMemo: string;
  subtotalDollars: number;
  gstDollars: number;
  pstDollars: number;
  shippingDollars: number;
  rebateDollars: number;
  totalDollars: number;
  numberOfItems: number;
  qtyReceived: number;
};

const fmt = (n: number) => `$${n.toFixed(2)}`;

export function InvoiceDetailForm({ invoiceId, initial, readOnly }: { invoiceId: string; initial: Initial; readOnly: boolean }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [invoiceNumber, setInvoiceNumber] = React.useState(initial.invoiceNumber);
  const [invoiceDate, setInvoiceDate] = React.useState(initial.invoiceDate);
  const [dateReceived, setDateReceived] = React.useState(initial.dateReceived);
  const [internalMemo, setInternalMemo] = React.useState(initial.internalMemo);
  const [gst, setGst] = React.useState(String(initial.gstDollars));
  const [pst, setPst] = React.useState(String(initial.pstDollars));
  const [shipping, setShipping] = React.useState(String(initial.shippingDollars));
  const [rebate, setRebate] = React.useState(String(initial.rebateDollars));

  const liveTotal =
    initial.subtotalDollars +
    (Number(gst) || 0) +
    (Number(pst) || 0) +
    (Number(shipping) || 0) -
    (Number(rebate) || 0);

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const fd = new FormData();
    fd.set("invoiceNumber", invoiceNumber);
    fd.set("invoiceDate", invoiceDate);
    fd.set("dateReceived", dateReceived);
    fd.set("internalMemo", internalMemo);
    fd.set("gstDollars", gst);
    fd.set("pstDollars", pst);
    fd.set("shippingDollars", shipping);
    fd.set("rebateDollars", rebate);
    start(async () => {
      try {
        await updateInvoiceAction(invoiceId, fd);
        toast({ title: "Invoice updated" });
        router.refresh();
      } catch (err: any) {
        toast({ title: "Save failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  return (
    <form onSubmit={save} className="grid gap-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
        <Read label="Supplier" value={initial.supplierName} />
        <Read label="Store" value={initial.locationName} />
        <Read label="Created by" value={`${initial.createdByName} · ${initial.createdAt}`} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="grid gap-1.5">
          <Label htmlFor="invNum">Invoice Number</Label>
          <Input id="invNum" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} disabled={readOnly} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="invDate">Invoice Date</Label>
          <Input id="invDate" type="date" value={invoiceDate} onChange={(e) => setInvoiceDate(e.target.value)} disabled={readOnly} required />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="dr">Date Received</Label>
          <Input id="dr" type="date" value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} disabled={readOnly} required />
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
        <Read label="Sub Total" value={fmt(initial.subtotalDollars)} bold />
        <Field id="gst" label="GST" value={gst} onChange={setGst} disabled={readOnly} />
        <Field id="pst" label="PST" value={pst} onChange={setPst} disabled={readOnly} />
        <Field id="ship" label="Shipping" value={shipping} onChange={setShipping} disabled={readOnly} />
        <Field id="rebate" label="Rebate/Discount" value={rebate} onChange={setRebate} disabled={readOnly} />
        <Read label="Total" value={fmt(liveTotal)} bold accent />
        <Read label="Items / Qty Received" value={`${initial.numberOfItems} · ${initial.qtyReceived.toFixed(2)}`} />
      </div>

      <div className="grid gap-1.5">
        <Label htmlFor="memo">Internal Memo</Label>
        <Textarea id="memo" rows={2} value={internalMemo} onChange={(e) => setInternalMemo(e.target.value)} disabled={readOnly} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={pending || readOnly}>{pending ? "Saving..." : "Update"}</Button>
      </div>
    </form>
  );
}

function Field({ id, label, value, onChange, disabled }: { id: string; label: string; value: string; onChange: (v: string) => void; disabled: boolean }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} type="number" step="0.01" min="0" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="num text-right h-8" />
    </div>
  );
}

function Read({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={`text-sm num h-8 inline-flex items-center ${bold ? "font-semibold" : ""} ${accent ? "text-primary" : ""}`}>{value}</span>
    </div>
  );
}
