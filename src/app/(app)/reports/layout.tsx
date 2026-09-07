import { PageHeader } from "@/components/page-header";
import { getScope } from "@/lib/scope";
import { isSectionLocked } from "@/modules/section-lock/actions";
import { SectionPinGate } from "@/components/section-pin-gate";

export const dynamic = "force-dynamic";

export default async function ReportsLayout({ children }: { children: React.ReactNode }) {
  const scope = await getScope();
  if (await isSectionLocked(scope.businessId, "REPORTS")) {
    return (
      <div>
        <PageHeader title="Profit & loss" description="Section protected by PIN" />
        <SectionPinGate
          title="Profit & loss is locked"
          blurb="Enter the 4-digit PIN to view margins, spend and the event matrices."
        />
      </div>
    );
  }
  return <>{children}</>;
}
