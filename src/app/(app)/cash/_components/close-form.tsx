"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { saveCashCloseAction } from "@/modules/cash/actions";
import { toast } from "@/components/ui/use-toast";

const DEFAULT_CHECKLIST = [
  "Till counted with manager",
  "Safe count verified",
  "Deposit slip prepared",
  "Reports printed",
  "Drawer locked",
];

type Initial = {
  openingDollars: number; closingDollars: number; safeCountDollars: number;
  depositDollars: number; paidInDollars: number; paidOutDollars: number;
  expectedDollars: number; notes: string; checklist: { label: string; done: boolean }[] | null;
};

export function CloseForm({ businessDate, netSalesDollars, initial }: {
  businessDate: string; netSalesDollars: number; initial: Initial | null;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const [opening, setOpening] = React.useState(String(initial?.openingDollars ?? 300));
  const [closing, setClosing] = React.useState(String(initial?.closingDollars ?? 0));
  const [safe, setSafe] = React.useState(String(initial?.safeCountDollars ?? 0));
  const [deposit, setDeposit] = React.useState(String(initial?.depositDollars ?? 0));
  const [paidIn, setPaidIn] = React.useState(String(initial?.paidInDollars ?? 0));
  const [paidOut, setPaidOut] = React.useState(String(initial?.paidOutDollars ?? 0));
  const [notes, setNotes] = React.useState(initial?.notes ?? "");
  const [checklist, setChecklist] = React.useState<{ label: string; done: boolean }[]>(
    initial?.checklist ?? DEFAULT_CHECKLIST.map((l) => ({ label: l, done: false }))
  );

  // expected = opening + cash sales (we approximate cash sales as ~40% of net) + paidIn − paidOut
  // For simplicity in MVP, expected is fully editable but we suggest from sales.
  const suggestedExpected = (Number(opening) || 0) + netSalesDollars * 0.4 + (Number(paidIn) || 0) - (Number(paidOut) || 0);
  const [expected, setExpected] = React.useState(
    initial?.expectedDollars !== undefined ? String(initial.expectedDollars) : suggestedExpected.toFixed(2)
  );

  const overShortDollars = (Number(closing) || 0) + (Number(deposit) || 0) - (Number(opening) || 0) - (Number(expected) || 0);
  const overShortCents = Math.round(overShortDollars * 100);
  const flag = Math.abs(overShortCents) > 2000;

  const submit = () => {
    start(async () => {
      try {
        await saveCashCloseAction({
          businessDate,
          openingDollars: Number(opening),
          closingDollars: Number(closing),
          safeCountDollars: Number(safe),
          depositDollars: Number(deposit),
          paidInDollars: Number(paidIn),
          paidOutDollars: Number(paidOut),
          expectedDollars: Number(expected),
          checklist,
          notes,
        });
      } catch (err: any) {
        if (err?.digest?.startsWith("NEXT_REDIRECT")) return;
        toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Counts ({businessDate})</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <Field id="opening" label="Opening till ($)" value={opening} setter={setOpening} />
            <Field id="closing" label="Closing till ($)" value={closing} setter={setClosing} />
            <Field id="safe" label="Safe count ($)" value={safe} setter={setSafe} />
            <Field id="deposit" label="Deposit ($)" value={deposit} setter={setDeposit} />
            <Field id="paidIn" label="Paid-in ($)" value={paidIn} setter={setPaidIn} />
            <Field id="paidOut" label="Paid-out ($)" value={paidOut} setter={setPaidOut} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="expected">Expected closing ($)</Label>
            <Input id="expected" type="number" step="0.01" min="0" value={expected} onChange={(e) => setExpected(e.target.value)} />
            <span className="text-2xs text-muted-foreground">Suggested from sales: ${suggestedExpected.toFixed(2)} (approx 40% cash)</span>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <Card>
          <CardHeader><CardTitle>Over/Short</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-semibold num text-center py-3">
              <span className={overShortCents < 0 ? "text-destructive" : overShortCents > 0 ? "text-warning" : "text-success"}>
                {formatMoney(overShortCents, { signed: true })}
              </span>
            </div>
            {flag && <Badge variant="danger">Over $20 — review</Badge>}
            <div className="text-2xs text-muted-foreground">
              Closing + Deposit − Opening − Expected
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Shift close checklist</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {checklist.map((c, i) => (
              <label key={i} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={c.done}
                  onChange={(e) => {
                    const next = [...checklist];
                    next[i] = { ...next[i], done: e.target.checked };
                    setChecklist(next);
                  }}
                />
                <span className={c.done ? "line-through text-muted-foreground" : ""}>{c.label}</span>
              </label>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button className="w-full" onClick={submit} disabled={pending}>{pending ? "Saving..." : "Save close"}</Button>
        </div>
      </div>
    </div>
  );
}

function Field({ id, label, value, setter }: { id: string; label: string; value: string; setter: (v: string) => void }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="number" step="0.01" min="0" value={value} onChange={(e) => setter(e.target.value)} />
    </div>
  );
}
