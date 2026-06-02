"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createExpenseAction } from "@/modules/expenses/actions";
import { toast } from "@/components/ui/use-toast";

const CATEGORIES = [
  { value: "RENT", label: "Rent" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "MARKETING", label: "Marketing" },
  { value: "CONTRACTOR", label: "Contractor / Freelancer" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "REPAIRS", label: "Repairs" },
  { value: "ADMIN", label: "Admin / Office" },
  { value: "OTHER", label: "Other" },
];

export function NewExpenseButton({ events }: { events: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, start] = React.useTransition();
  const today = new Date().toISOString().slice(0, 10);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      try {
        await createExpenseAction(fd);
        toast({ title: "Expense logged" });
        setOpen(false);
        router.refresh();
      } catch (err: any) {
        toast({ title: "Failed", description: String(err?.message ?? err), variant: "destructive" });
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="brand"><Plus className="h-3.5 w-3.5" /> New expense</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Log an expense</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="ex-category">Category</Label>
              <Select name="category" defaultValue="OTHER">
                <SelectTrigger id="ex-category"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="ex-date">Date</Label>
              <Input id="ex-date" name="businessDate" type="date" required defaultValue={today} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="ex-amount">Amount ($)</Label>
            <Input id="ex-amount" name="amountDollars" type="number" step="0.01" min="0.01" required autoFocus />
          </div>
          {events.length > 0 && (
            <div className="grid gap-1.5">
              <Label htmlFor="ex-event">Event (optional)</Label>
              <Select name="eventId" defaultValue="">
                <SelectTrigger id="ex-event"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="">None</SelectItem>
                  {events.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="grid gap-1.5">
            <Label htmlFor="ex-desc">Description (optional)</Label>
            <Textarea id="ex-desc" name="description" rows={2} placeholder="e.g. Instagram ad campaign, monthly rent..." />
          </div>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant="brand" disabled={pending}>{pending ? "Saving..." : "Log expense"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
