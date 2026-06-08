import { getScope } from "@/lib/scope";
import { listActiveEvents } from "@/modules/events/queries";
import { PageHeader } from "@/components/page-header";
import { ReceiptAnalyzer } from "./_components/receipt-analyzer";

export const dynamic = "force-dynamic";

export default async function ReceiptsPage() {
  const scope = await getScope();
  const events = await listActiveEvents(scope.businessId);
  return (
    <div>
      <PageHeader
        title="AI receipt scanner"
        description="Upload a supplier or grocery receipt — AI extracts every line item and calculates per-unit cost"
      />
      <div className="p-4 sm:p-8 animate-fade">
        <ReceiptAnalyzer events={events.map((e) => ({ id: e.id, name: e.name }))} />
      </div>
    </div>
  );
}
