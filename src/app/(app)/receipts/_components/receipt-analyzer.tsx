"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Upload, Sparkles, AlertCircle, Save, X, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/components/ui/use-toast";
import { createExpenseAction } from "@/modules/expenses/actions";

type LineItem = {
  name: string;
  qty: number;
  unit: string;
  totalDollars: number;
  perUnitDollars: number;
  category: string;
};

type Analysis = {
  merchant: string | null;
  receiptDate: string | null;
  currency: string;
  lineItems: LineItem[];
  subtotalDollars: number | null;
  taxDollars: number | null;
  totalDollars: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  notes: string | null;
};

const EXPENSE_CATEGORIES = [
  { value: "RENT", label: "Rent" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "MARKETING", label: "Marketing" },
  { value: "CONTRACTOR", label: "Contractor" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "REPAIRS", label: "Repairs" },
  { value: "ADMIN", label: "Admin / Office" },
  { value: "OTHER", label: "Other (supplies, food cost...)" },
];

// Map the AI's product category to a sensible default expense category.
function defaultExpenseCategory(items: LineItem[]): string {
  if (items.some((i) => i.category === "EQUIPMENT")) return "EQUIPMENT";
  if (items.some((i) => i.category === "CLEANING")) return "REPAIRS";
  return "OTHER";
}

export function ReceiptAnalyzer({ events }: { events: { id: string; name: string }[] }) {
  const router = useRouter();
  const [file, setFile] = React.useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const [analysis, setAnalysis] = React.useState<Analysis | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [expenseCategory, setExpenseCategory] = React.useState<string>("OTHER");
  const [expenseEvent, setExpenseEvent] = React.useState<string>("");

  React.useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f ?? null);
    setAnalysis(null);
    setError(null);
  };

  const analyze = () => {
    if (!file) return;
    setError(null);
    setAnalysis(null);
    const fd = new FormData();
    fd.set("file", file);
    start(async () => {
      try {
        const res = await fetch("/api/ai/analyze-receipt", { method: "POST", body: fd });
        const data = await res.json();
        if (!res.ok) {
          setError(data?.error ?? "Failed to analyze receipt");
          toast({ title: "Analysis failed", description: data?.error ?? "", variant: "destructive" });
          return;
        }
        setAnalysis(data.analysis);
        setExpenseCategory(defaultExpenseCategory(data.analysis.lineItems));
        toast({ title: "Receipt analyzed", description: `${data.analysis.lineItems.length} line items extracted` });
      } catch (err: any) {
        const msg = err?.message ?? "Network error";
        setError(msg);
        toast({ title: "Analysis failed", description: msg, variant: "destructive" });
      }
    });
  };

  const reset = () => {
    setFile(null);
    setAnalysis(null);
    setError(null);
  };

  const saveAsExpense = async () => {
    if (!analysis) return;
    setSaving(true);
    try {
      const fd = new FormData();
      fd.set("category", expenseCategory);
      fd.set("businessDate", analysis.receiptDate ?? new Date().toISOString().slice(0, 10));
      fd.set("amountDollars", String(analysis.totalDollars));
      const desc = [
        analysis.merchant ? `${analysis.merchant} receipt` : "Receipt",
        `${analysis.lineItems.length} items`,
        analysis.lineItems.slice(0, 3).map((i) => i.name).join(", "),
      ]
        .filter(Boolean)
        .join(" · ");
      fd.set("description", desc);
      if (expenseEvent) fd.set("eventId", expenseEvent);
      await createExpenseAction(fd);
      toast({ title: "Saved as expense", description: `$${analysis.totalDollars.toFixed(2)} logged` });
      reset();
      router.push("/expenses");
    } catch (err: any) {
      toast({ title: "Save failed", description: String(err?.message ?? err), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      {/* LEFT: upload */}
      <div className="space-y-4">
        <div className="rounded-2xl border bg-card shadow-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <div className="text-sm font-semibold">Upload receipt</div>
              <div className="text-2xs text-muted-foreground">PNG, JPG, or WebP · up to 8 MB</div>
            </div>
          </div>
          <Label htmlFor="receipt-file" className="sr-only">Receipt image</Label>
          <input
            id="receipt-file"
            type="file"
            accept="image/*"
            capture="environment"
            onChange={onFileChange}
            className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-xs file:font-medium hover:file:bg-accent/80"
          />
          {previewUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={previewUrl}
              alt="Receipt preview"
              className="w-full max-h-[420px] object-contain rounded-lg border bg-muted/30"
            />
          )}
          <div className="flex gap-2">
            <Button onClick={analyze} disabled={!file || pending} variant="brand" size="sm" className="flex-1">
              <Sparkles className="h-3.5 w-3.5" />
              {pending ? "Analyzing..." : "Analyze with AI"}
            </Button>
            {file && (
              <Button onClick={reset} variant="ghost" size="sm" disabled={pending}>
                <X className="h-3.5 w-3.5" /> Clear
              </Button>
            )}
          </div>
          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 text-destructive p-2.5 text-xs flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="whitespace-pre-wrap">{error}</div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border bg-muted/30 p-4 text-2xs text-muted-foreground space-y-1.5">
          <div className="font-medium text-foreground">How it works</div>
          <p>
            We send your receipt photo to Claude (Anthropic). It reads every line, extracts quantity ·
            unit · total, then calculates the per-unit cost (per lb, per gallon, per piece, etc.) — the
            number you actually need for menu pricing.
          </p>
          <p>You can save the total as an expense in one click, or copy per-unit costs into Inventory.</p>
        </div>
      </div>

      {/* RIGHT: results */}
      <div className="space-y-4">
        {!analysis && !pending && (
          <div className="rounded-2xl border bg-card shadow-card p-10 text-center text-sm text-muted-foreground min-h-[400px] flex flex-col items-center justify-center">
            <Upload className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <div>Upload a receipt to see line items and per-unit costs here.</div>
          </div>
        )}

        {pending && (
          <div className="rounded-2xl border bg-card shadow-card p-10 text-center text-sm text-muted-foreground min-h-[400px] flex flex-col items-center justify-center">
            <div className="animate-pulse">
              <Sparkles className="h-10 w-10 text-brand mb-3 mx-auto" />
            </div>
            <div className="font-medium text-foreground">Reading your receipt...</div>
            <div className="text-xs mt-1">Usually takes 10–30 seconds</div>
          </div>
        )}

        {analysis && (
          <>
            <div className="rounded-2xl border bg-card shadow-card p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs text-muted-foreground">Detected</div>
                  <div className="text-lg font-semibold tracking-tight">
                    {analysis.merchant ?? "Receipt"}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {analysis.receiptDate && <span>{analysis.receiptDate}</span>}
                    {analysis.receiptDate && <span>·</span>}
                    <span>{analysis.lineItems.length} line items</span>
                    <span>·</span>
                    <Badge
                      variant={
                        analysis.confidence === "HIGH"
                          ? "success"
                          : analysis.confidence === "MEDIUM"
                            ? "warning"
                            : "destructive"
                      }
                    >
                      {analysis.confidence} confidence
                    </Badge>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={reset}>
                  <RotateCcw className="h-3.5 w-3.5" /> New
                </Button>
              </div>

              {analysis.notes && (
                <div className="rounded-md border border-warning/40 bg-warning/10 text-warning-foreground p-2 text-xs">
                  <span className="font-medium">Note:</span> {analysis.notes}
                </div>
              )}

              <div className="overflow-hidden rounded-xl border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead>Unit</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right font-semibold">Per unit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {analysis.lineItems.map((i, idx) => (
                      <TableRow key={idx}>
                        <TableCell>
                          <div className="font-medium">{i.name}</div>
                          <div className="text-2xs text-muted-foreground">{i.category.replace("_", " ").toLowerCase()}</div>
                        </TableCell>
                        <TableCell className="text-right num">{i.qty}</TableCell>
                        <TableCell className="text-muted-foreground">{i.unit}</TableCell>
                        <TableCell className="text-right num">${i.totalDollars.toFixed(2)}</TableCell>
                        <TableCell className="text-right num font-semibold text-brand">
                          ${i.perUnitDollars.toFixed(4)}<span className="text-muted-foreground font-normal text-2xs">/{i.unit}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <div className="text-2xs text-muted-foreground uppercase tracking-wider">Subtotal</div>
                  <div className="num font-semibold">
                    {analysis.subtotalDollars != null ? `$${analysis.subtotalDollars.toFixed(2)}` : "—"}
                  </div>
                </div>
                <div className="rounded-lg bg-muted/40 p-2.5">
                  <div className="text-2xs text-muted-foreground uppercase tracking-wider">Tax</div>
                  <div className="num font-semibold">
                    {analysis.taxDollars != null ? `$${analysis.taxDollars.toFixed(2)}` : "—"}
                  </div>
                </div>
                <div className="rounded-lg bg-brand/10 p-2.5">
                  <div className="text-2xs text-brand uppercase tracking-wider">Total</div>
                  <div className="num font-semibold text-brand">${analysis.totalDollars.toFixed(2)}</div>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border bg-card shadow-card p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Save className="h-4 w-4 text-brand" />
                <div className="text-sm font-semibold">Save total as expense</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="rcpt-category">Category</Label>
                  <Select value={expenseCategory} onValueChange={setExpenseCategory}>
                    <SelectTrigger id="rcpt-category"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EXPENSE_CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {events.length > 0 && (
                  <div className="grid gap-1.5">
                    <Label htmlFor="rcpt-event">Event (optional)</Label>
                    <Select value={expenseEvent} onValueChange={setExpenseEvent}>
                      <SelectTrigger id="rcpt-event"><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">None</SelectItem>
                        {events.map((e) => (
                          <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              <Button onClick={saveAsExpense} disabled={saving} variant="brand" size="sm" className="w-full">
                <Save className="h-3.5 w-3.5" />
                {saving ? "Saving..." : `Log $${analysis.totalDollars.toFixed(2)} as expense`}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
