import { PageHeader } from "@/components/page-header";
import { getScope } from "@/lib/scope";
import { isSectionLocked, isSectionUnlockedByPin } from "@/modules/section-lock/actions";
import { SectionPinGate } from "@/components/section-pin-gate";
import { SectionLockButton } from "@/components/section-lock-button";

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
  // Only when it is open because of the PIN — a section nobody locked has
  // nothing to re-lock and should not carry the control.
  const canRelock = await isSectionUnlockedByPin(scope.businessId, "EVENTS");
  return (
    <>
      {canRelock && (
        <div className="mx-auto flex max-w-[1400px] justify-end px-4 pt-3 sm:px-6 lg:px-8">
          <SectionLockButton />
        </div>
      )}
      {children}
    </>
  );
}
