import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { getCashCloseByDate, getSalesForDate, listDepositsForDate } from "@/modules/cash/queries";
import { listActiveEvents, getActiveEvent } from "@/modules/events/queries";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { fromCents } from "@/lib/money";
import { addDays, fmtDate } from "@/lib/date";
import { CashEntry } from "../_components/cash-entry";

export const dynamic = "force-dynamic";

export default async function NewClosePage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const sp = await searchParams;
  const scope = await getScope();
  const dateStr = sp.date ?? new Date().toISOString().slice(0, 10);
  const [sales, existing, deposits, events, activeEvent] = await Promise.all([
    getSalesForDate(scope.locationId, dateStr),
    getCashCloseByDate(scope.locationId, dateStr),
    listDepositsForDate(scope.locationId, dateStr),
    listActiveEvents(scope.businessId),
    getActiveEvent(scope.businessId),
  ]);

  const prev = fmtDateForInput(addDays(new Date(dateStr), -1));
  const next = fmtDateForInput(addDays(new Date(dateStr), 1));

  return (
    <div>
      <PageHeader
        title="Daily entry"
        description={`${scope.locationName} · ${fmtDate(new Date(dateStr))}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link href={`/cash/new?date=${prev}`}>‹ Prev</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={`/cash/new?date=${next}`}>Next ›</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href="/cash"><ArrowLeft className="h-3.5 w-3.5" /> All closes</Link></Button>
          </>
        }
      />
      <div className="p-4 sm:p-6">
        <CashEntry
          businessDate={dateStr}
          locationName={scope.locationName}
          netSalesDollars={sales ? fromCents(sales.netSalesCents) : 0}
          events={events.map((e) => ({ id: e.id, name: e.name, color: e.color }))}
          activeEventId={activeEvent?.id ?? null}
          existing={existing ? {
            id: existing.id,
            openingDollars: fromCents(existing.openingCents),
            closingDollars: fromCents(existing.closingCents),
            cashDollars: fromCents(existing.cashCents),
            creditDollars: fromCents(existing.creditCents),
            safeCountDollars: fromCents(existing.safeCountCents),
            paidInDollars: fromCents(existing.paidInCents),
            paidOutDollars: fromCents(existing.paidOutCents),
            expectedDollars: fromCents(existing.expectedCents),
            overShortDollars: fromCents(existing.overShortCents),
            weather: existing.weather ?? "",
            specialEvents: existing.specialEvents ?? "",
            eventId: existing.eventId,
            notes: existing.notes ?? "",
            closedByName: existing.closedBy.name,
            verifiedByName: existing.verifiedBy?.name ?? null,
            verifiedAt: existing.verifiedAt?.toISOString() ?? null,
            createdAt: existing.createdAt.toISOString(),
          } : null}
          deposits={deposits.map((d) => ({
            id: d.id,
            sequence: d.sequence,
            amountDollars: fromCents(d.amountCents),
            bagCode: d.bagCode,
            preparedBy: d.preparedBy,
            notes: d.notes,
          }))}
        />
      </div>
    </div>
  );
}

function fmtDateForInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}
