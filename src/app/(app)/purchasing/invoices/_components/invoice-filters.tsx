"use client";
import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Supplier = { id: string; name: string };

export function InvoiceFilters({ suppliers }: { suppliers: Supplier[] }) {
  const router = useRouter();
  const sp = useSearchParams();

  const [supplierId, setSupplierId] = React.useState(sp.get("supplier") ?? "all");
  const [status, setStatus] = React.useState(sp.get("status") ?? "all");
  const [number, setNumber] = React.useState(sp.get("number") ?? "");
  const [from, setFrom] = React.useState(sp.get("from") ?? "");
  const [to, setTo] = React.useState(sp.get("to") ?? "");

  const apply = (e?: React.FormEvent) => {
    e?.preventDefault();
    const params = new URLSearchParams();
    if (supplierId && supplierId !== "all") params.set("supplier", supplierId);
    if (status && status !== "all") params.set("status", status);
    if (number.trim()) params.set("number", number.trim());
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const qs = params.toString();
    router.push(qs ? `/purchasing/invoices?${qs}` : "/purchasing/invoices");
  };

  const clear = () => {
    setSupplierId("all"); setStatus("all"); setNumber(""); setFrom(""); setTo("");
    router.push("/purchasing/invoices");
  };

  const activeCount =
    (supplierId !== "all" ? 1 : 0) +
    (status !== "all" ? 1 : 0) +
    (number.trim() ? 1 : 0) +
    (from ? 1 : 0) +
    (to ? 1 : 0);

  return (
    <form onSubmit={apply} className="rounded-lg border bg-muted/20 p-3 grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
      <div className="grid gap-1 col-span-2 md:col-span-2">
        <Label htmlFor="f-number" className="text-xs">Invoice number</Label>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input id="f-number" className="pl-7 h-8" value={number} onChange={(e) => setNumber(e.target.value)} placeholder="e.g. INV-0421" />
        </div>
      </div>
      <div className="grid gap-1">
        <Label className="text-xs">Supplier</Label>
        <Select value={supplierId} onValueChange={setSupplierId}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All suppliers</SelectItem>
            {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1">
        <Label className="text-xs">Status</Label>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1">
        <Label htmlFor="f-from" className="text-xs">From</Label>
        <Input id="f-from" type="date" className="h-8" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="grid gap-1">
        <Label htmlFor="f-to" className="text-xs">To</Label>
        <Input id="f-to" type="date" className="h-8" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <div className="col-span-2 md:col-span-6 flex justify-end gap-2 pt-1">
        {activeCount > 0 && (
          <Button type="button" size="sm" variant="ghost" onClick={clear}>
            <X className="h-3.5 w-3.5" /> Clear ({activeCount})
          </Button>
        )}
        <Button type="submit" size="sm">Apply filters</Button>
      </div>
    </form>
  );
}
