"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveCashCloseAction, addDepositAction, deleteDepositAction, verifyCloseAction } from "@/modules/cash/actions";
import { toast } from "@/components/ui/use-toast";

type Existing = {
  id: string;
  openingDollars: number; closingDollars: number; cashDollars: number; creditDollars: number;
  safeCountDollars: number; paidInDollars: number; paidOutDollars: number;
  expectedDollars: number; overShortDollars: number;
  weather: string; specialEvents: string; eventId: string | null;
  notes: string;
  closedByName: string; verifiedByName: string | null; verifiedAt: string | null;
  createdAt: string;
};
type Deposit = {
  id: string; sequence: number | null; amountDollars: number;
  bagCode: string | null; preparedBy: string | null; notes: string | null;
};
type Event = { id: string; name: string; color: string | null };

const fmt = (n: number) => `$${n.toFixed(2)}`;

export function CashEntry({
  businessDate, locationName, netSalesDollars, events, activeEventId, existing, deposits,
}: {
  businessDate: string; locationName: string; netSalesDollars: number;
  events: Event[]; activeEventId: string | null;
  existing: Existing | null; deposits: Deposit[];
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();

  const [opening, setOpening] = React.useState(String(existing?.openingDollars ?? 300));
  const [closing, setClosing] = React.useState(String(existing?.closingDollars ?? 0));
  const [cash, setCash] = React.useState(String(existing?.cashDollars ?? 0));
  const [credit, setCredit] = React.useState(String(existing?.creditDollars ?? 0));
  const [safe, setSafe] = React.useState(String(existing?.safeCountDollars ?? 0));
  const [paidIn, setPaidIn] = React.useState(String(existing?.paidInDollars ?? 0));
  const [paidOut, setPaidOut] = React.useState(String(existing?.paidOutDollars ?? 0));
  const [weather, setWeather] = React.useState(existing?.weather ?? "");
  const [specialEvents, setSpecialEvents] = React.useState(existing?.specialEvents ?? "");
  const [eventId, setEventId] = React.useState(existing?.eventId ?? activeEventId ?? "");
  const [notes, setNotes] = React.useState(existing?.notes ?? "");

  const expectedSuggestion = netSalesDollars; // exclusive of tax for simplicity
  const [expected, setExpected] = React.useState(
    existing ? String(existing.expectedDollars) : expectedSuggestion.toFixed(2)
  );

  const depositTotal = deposits.reduce((a, d) => a + d.amountDollars, 0);

  const totalCashCredit = (Number(cash) || 0) + (Number(credit) || 0);
  const overShort = totalCashCredit + depositTotal - (Number(opening) || 0) - (Number(expected) || 0);
  const overShortCents = Math.round(overShort * 100);
  const flag = Math.abs(overShortCents) > 2000;

  const saveClose = () => {
    start(async () => {
      try {
        await saveCashCloseAction({
          businessDate,
          openingDollars: Number(opening),
          closingDollars: Number(closing) || totalCashCredit,
          cashDollars: Number(cash),
          creditDollars: Number(credit),
          safeCountDollars: Number(safe),
          depositDollars: depositTotal,
          paidInDollars: Number(paidIn),
          paidOutDollars: Number(paidOut),
          expectedDollars: Number(expected),
          weather, specialEvents,
          eventId: eventId || null,
          notes,
          checklist: [],
        });
      } catch (err: any) {
        if (err?.digest?.startsWith("NEXT_REDIRECT")) return;
        toast({ title: "Save failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  const verify = () => {
    if (!existing) return;
    start(async () => {
      try {
        await verifyCloseAction(existing.id);
        toast({ title: existing.verifiedByName ? "Verification removed" : "Verified" });
        router.refresh();
      } catch (err: any) {
        toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  return (
    <>
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deposit">Cash Deposit{deposits.length > 0 ? ` (${deposits.length})` : ""}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>General information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {existing?.verifiedByName ? (
                  <div className="rounded border border-success/30 bg-success/10 text-success px-3 py-2 text-xs flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified by {existing.verifiedByName} on {existing.verifiedAt && new Date(existing.verifiedAt).toLocaleString()}
                    <Button type="button" variant="ghost" size="sm" onClick={verify} disabled={pending} className="ml-auto h-6 text-2xs">Unverify</Button>
                  </div>
                ) : existing ? (
                  <div className="rounded border bg-muted/40 text-muted-foreground px-3 py-2 text-xs flex items-center gap-2">
                    Not yet verified.
                    <Button type="button" size="sm" variant="success" onClick={verify} disabled={pending} className="ml-auto h-6 text-2xs">
                      <CheckCircle2 className="h-3 w-3" /> Verify entry
                    </Button>
                  </div>
                ) : null}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="grid gap-1.5">
                    <Label htmlFor="weather">Weather</Label>
                    <Input id="weather" placeholder="Sunny, Rainy, Snowy..." value={weather} onChange={(e) => setWeather(e.target.value)} />
                  </div>
                  <div className="grid gap-1.5">
                    <Label htmlFor="event">Event tag</Label>
                    <Select value={eventId || "none"} onValueChange={(v) => setEventId(v === "none" ? "" : v)}>
                      <SelectTrigger id="event"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {events.map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            <span className="flex items-center gap-2">
                              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: e.color ?? "hsl(var(--muted-foreground))" }} />
                              {e.name}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="se">Special events / menu specials</Label>
                  <Textarea id="se" rows={2} value={specialEvents} onChange={(e) => setSpecialEvents(e.target.value)} placeholder="e.g. Strawberry Turnover, Spicy Teen burger, $6 Buddy bundle" />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <Field id="opening" label="Opening till" value={opening} setter={setOpening} />
                  <Field id="cash" label="Cash collected" value={cash} setter={setCash} />
                  <Field id="credit" label="Credit / Debit" value={credit} setter={setCredit} />
                  <Field id="safe" label="Safe count" value={safe} setter={setSafe} />
                  <Field id="paidIn" label="Paid-in" value={paidIn} setter={setPaidIn} />
                  <Field id="paidOut" label="Paid-out" value={paidOut} setter={setPaidOut} />
                  <Field id="expected" label="Expected" value={expected} setter={setExpected} hint={`Suggested ${fmt(expectedSuggestion)}`} />
                </div>

                <div className="grid gap-1.5">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
                </div>

                {existing && (
                  <div className="text-2xs text-muted-foreground border-t pt-2">
                    Created by {existing.closedByName} on {new Date(existing.createdAt).toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>

            <BalancingOverview
              cash={Number(cash) || 0}
              credit={Number(credit) || 0}
              deposits={depositTotal}
              opening={Number(opening) || 0}
              expected={Number(expected) || 0}
              overShort={overShort}
              flag={flag}
            />
          </div>

          <div className="flex justify-end">
            <Button onClick={saveClose} disabled={pending}>{pending ? "Saving..." : (existing ? "Update entry" : "Create entry")}</Button>
          </div>
        </TabsContent>

        <TabsContent value="deposit" className="space-y-4 mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Cash deposits ({deposits.length})</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <AddDeposit businessDate={businessDate} />
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead className="text-right">Cash</TableHead>
                        <TableHead>Bag Code</TableHead>
                        <TableHead>Prepared By</TableHead>
                        <TableHead>Notes</TableHead>
                        <TableHead className="w-12" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {deposits.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell className="num text-muted-foreground">{d.sequence ?? "—"}</TableCell>
                          <TableCell className="text-right num font-medium">{fmt(d.amountDollars)}</TableCell>
                          <TableCell className="font-mono text-xs">{d.bagCode ?? "—"}</TableCell>
                          <TableCell>{d.preparedBy ?? "—"}</TableCell>
                          <TableCell className="text-muted-foreground text-xs">{d.notes ?? "—"}</TableCell>
                          <TableCell>
                            <DeleteDepositButton id={d.id} />
                          </TableCell>
                        </TableRow>
                      ))}
                      {deposits.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">
                            No deposits recorded yet for {businessDate}.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <BalancingOverview
              cash={Number(cash) || 0}
              credit={Number(credit) || 0}
              deposits={depositTotal}
              opening={Number(opening) || 0}
              expected={Number(expected) || 0}
              overShort={overShort}
              flag={flag}
            />
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

function Field({ id, label, value, setter, hint }: { id: string; label: string; value: string; setter: (v: string) => void; hint?: string }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id} className="text-xs">{label}</Label>
      <Input id={id} type="number" step="0.01" min="0" value={value} onChange={(e) => setter(e.target.value)} className="num text-right h-8" />
      {hint && <span className="text-2xs text-muted-foreground">{hint}</span>}
    </div>
  );
}

function BalancingOverview({ cash, credit, deposits, opening, expected, overShort, flag }: { cash: number; credit: number; deposits: number; opening: number; expected: number; overShort: number; flag: boolean }) {
  const total = cash + credit;
  return (
    <Card>
      <CardHeader><CardTitle>Balancing overview</CardTitle></CardHeader>
      <CardContent className="space-y-1.5 text-sm">
        <Row label="Cash collected" value={fmt(cash)} />
        <Row label="Credit / Debit" value={fmt(credit)} />
        <Row label="Total Cash + Credit" value={fmt(total)} bold />
        <Row label="Deposits" value={fmt(deposits)} />
        <Row label="Opening till" value={fmt(opening)} />
        <Row label="Expected" value={fmt(expected)} />
        <div className="border-t pt-2 flex items-center justify-between">
          <span className="font-medium">Over / Short</span>
          <span className={`font-semibold num ${overShort < 0 ? "text-destructive" : overShort > 0 ? "text-warning" : "text-success"}`}>
            {overShort >= 0 ? "+" : ""}{fmt(overShort)}
          </span>
        </div>
        {flag && <Badge variant="danger">Over $20 — review</Badge>}
      </CardContent>
    </Card>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={`num ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

function AddDeposit({ businessDate }: { businessDate: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [amount, setAmount] = React.useState("");
  const [bagCode, setBagCode] = React.useState("");
  const [preparedBy, setPreparedBy] = React.useState("");
  const [notes, setNotes] = React.useState("");

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!isFinite(n) || n <= 0) {
      toast({ title: "Enter a valid cash amount", variant: "destructive" });
      return;
    }
    start(async () => {
      try {
        await addDepositAction({
          businessDate,
          amountDollars: n,
          bagCode: bagCode || null,
          preparedBy: preparedBy || null,
          notes: notes || null,
          sequence: null,
        });
        toast({ title: "Deposit added" });
        setAmount(""); setBagCode(""); setPreparedBy(""); setNotes("");
        router.refresh();
      } catch (err: any) {
        toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  return (
    <form onSubmit={add} className="rounded-md border bg-muted/30 p-3 grid grid-cols-1 md:grid-cols-[auto_auto_1fr_1fr_auto] gap-3 items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="amt" className="text-xs">Cash *</Label>
        <Input id="amt" type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className="num text-right w-32 h-8" required />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="bag" className="text-xs">Bag Code</Label>
        <Input id="bag" value={bagCode} onChange={(e) => setBagCode(e.target.value)} className="w-32 h-8 font-mono" placeholder="F3159311" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="prep" className="text-xs">Prepared By</Label>
        <Input id="prep" value={preparedBy} onChange={(e) => setPreparedBy(e.target.value)} className="h-8" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="dnotes" className="text-xs">Notes</Label>
        <Input id="dnotes" value={notes} onChange={(e) => setNotes(e.target.value)} className="h-8" />
      </div>
      <Button type="submit" size="sm" disabled={pending}><Plus className="h-3.5 w-3.5" /> Add deposit</Button>
    </form>
  );
}

function DeleteDepositButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  return (
    <Button
      size="icon"
      variant="ghost"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            await deleteDepositAction(id);
            toast({ title: "Deposit removed" });
            router.refresh();
          } catch (err: any) {
            toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
          }
        })
      }
      aria-label="Delete deposit"
    >
      <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
    </Button>
  );
}
