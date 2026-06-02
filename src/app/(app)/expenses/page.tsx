import { getScope } from "@/lib/scope";
import { listExpenses, EXPENSE_CATEGORIES } from "@/modules/expenses/queries";
import { listVendors, getMonthlyFeePaymentStatus } from "@/modules/vendors/queries";
import { listActiveEvents } from "@/modules/events/queries";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";
import { deleteExpenseAction } from "@/modules/expenses/actions";
import { formatMoney } from "@/lib/money";
import { fmtDate } from "@/lib/date";
import { Sparkles } from "lucide-react";
import { NewExpenseButton } from "./_components/new-expense-button";
import { VendorsSection } from "./_components/vendor-card";
import type { ExpenseCategory } from "@prisma/client";

export const dynamic = "force-dynamic";

const CAT_LABEL: Record<ExpenseCategory, string> = Object.fromEntries(
  EXPENSE_CATEGORIES.map((c) => [c.value, c.label])
) as Record<ExpenseCategory, string>;

export default async function ExpensesPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: ExpenseCategory; from?: string; to?: string }>;
}) {
  const sp = await searchParams;
  const scope = await getScope();
  const [expenses, vendors, events] = await Promise.all([
    listExpenses(scope.locationId, { category: sp.category, from: sp.from, to: sp.to }),
    listVendors(scope.businessId),
    listActiveEvents(scope.businessId),
  ]);

  // "Has this vendor been paid this calendar month?" lookup
  const now = new Date();
  const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const paymentMap = await getMonthlyFeePaymentStatus(vendors.map((v) => v.id), yearMonth);
  const paymentRecord: Record<string, { paid: boolean; amountCents: number }> = {};
  for (const [k, v] of paymentMap.entries()) paymentRecord[k] = v;

  const total = expenses.reduce((a, e) => a + e.amountCents, 0);

  return (
    <div>
      <PageHeader
        title="Operating expenses"
        description={`${expenses.length} entries · ${formatMoney(total)} total`}
        actions={<NewExpenseButton events={events.map((e) => ({ id: e.id, name: e.name }))} />}
      />
      <div className="p-4 sm:p-8 space-y-6 animate-fade">
        <VendorsSection
          vendors={vendors.map((v) => ({
            id: v.id, name: v.name, role: v.role, country: v.country,
            monthlyFeeCents: v.monthlyFeeCents, currency: v.currency,
            defaultCategory: v.defaultCategory, isFlatFee: v.isFlatFee,
            notes: v.notes, isActive: v.isActive,
          }))}
          payments={paymentRecord}
          yearMonth={yearMonth}
        />

        <div className="space-y-2">
          <h2 className="text-2xs uppercase tracking-wider font-semibold text-muted-foreground px-1">All expenses</h2>
          <div className="rounded-2xl border bg-card shadow-card overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Vendor / Event</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Added by</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {expenses.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-muted-foreground">{fmtDate(e.businessDate)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="muted">{CAT_LABEL[e.category]}</Badge>
                        {e.isIncentive && (
                          <Badge variant="warning" className="gap-1"><Sparkles className="h-3 w-3" /> Incentive</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{e.description ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-0.5">
                        {e.vendor && (
                          <span className="text-xs">
                            <Badge variant="brand">{e.vendor.name}</Badge>
                          </span>
                        )}
                        {e.event && (
                          <span className="inline-flex items-center gap-1.5 text-xs">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: e.event.color ?? "hsl(var(--muted-foreground))" }} />
                            {e.event.name}
                          </span>
                        )}
                        {!e.vendor && !e.event && <span className="text-muted-foreground text-xs">—</span>}
                      </div>
                    </TableCell>
                    <TableCell className="text-right num font-medium">{formatMoney(e.amountCents)}</TableCell>
                    <TableCell className="text-muted-foreground text-xs">{e.createdBy.name}</TableCell>
                    <TableCell>
                      <DeleteButton
                        action={deleteExpenseAction.bind(null, e.id)}
                        itemLabel="expense"
                        itemName={`${CAT_LABEL[e.category]} · ${formatMoney(e.amountCents)}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
                {expenses.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-12">
                      No expenses logged yet. Add a vendor above, or click <span className="font-medium">New expense</span>.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>
    </div>
  );
}
