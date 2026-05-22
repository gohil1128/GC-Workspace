import { getScope } from "@/lib/scope";
import { getSalesForDate, getCashCloseByDate } from "@/modules/cash/queries";
import { PageHeader } from "@/components/page-header";
import { CloseForm } from "../_components/close-form";
import { fromCents } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function NewClosePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const scope = await getScope();
  const dateStr = sp.date ?? new Date().toISOString().slice(0, 10);
  const [sales, existing] = await Promise.all([
    getSalesForDate(scope.locationId, dateStr),
    getCashCloseByDate(scope.locationId, dateStr),
  ]);
  return (
    <div>
      <PageHeader title={existing ? "Edit cash close" : "New cash close"} description="Record till counts, deposits, and over/short" />
      <div className="p-4 sm:p-6">
        <CloseForm
          businessDate={dateStr}
          netSalesDollars={sales ? fromCents(sales.netSalesCents) : 0}
          initial={existing ? {
            openingDollars: fromCents(existing.openingCents),
            closingDollars: fromCents(existing.closingCents),
            safeCountDollars: fromCents(existing.safeCountCents),
            depositDollars: fromCents(existing.depositCents),
            paidInDollars: fromCents(existing.paidInCents),
            paidOutDollars: fromCents(existing.paidOutCents),
            expectedDollars: fromCents(existing.expectedCents),
            notes: existing.notes ?? "",
            checklist: (existing.checklistJson as any) ?? null,
          } : null}
        />
      </div>
    </div>
  );
}
