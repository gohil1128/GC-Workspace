import { PageHeader } from "@/components/page-header";
import { getScope } from "@/lib/scope";
import { isSectionLocked } from "@/modules/section-lock/actions";
import { SectionPinGate } from "@/components/section-pin-gate";

export const dynamic = "force-dynamic";

export default async function EventsLayout({ children }: { children: React.ReactNode }) {
  const scope = await getScope();
  if (await isSectionLocked(scope.businessId, "EVENTS")) {
    return (
      <div>
        <PageHeader title="Events" description="Section protected by PIN" />
        <SectionPinGate
          title="Events are locked"
          blurb="Enter the 4-digit PIN to view each event's sales, costs and P&L."
        />
      </div>
    );
  }
  return <>{children}</>;
}
