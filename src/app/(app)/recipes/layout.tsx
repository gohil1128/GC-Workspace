import { PageHeader } from "@/components/page-header";
import { getScope } from "@/lib/scope";
import { isSectionLocked, isSectionUnlockedByPin } from "@/modules/section-lock/actions";
import { SectionPinGate } from "@/components/section-pin-gate";
import { SectionLockButton } from "@/components/section-lock-button";

export const dynamic = "force-dynamic";

export default async function RecipesLayout({ children }: { children: React.ReactNode }) {
  const scope = await getScope();
  if (await isSectionLocked(scope.businessId, "RECIPES")) {
    return (
      <div>
        <PageHeader title="Recipes" description="Section protected by PIN" />
        <SectionPinGate
          title="Recipes are locked"
          blurb="Enter the 4-digit PIN to view recipes and BOM costs."
        />
      </div>
    );
  }
  // Only when it is open because of the PIN — a section nobody locked has
  // nothing to re-lock and should not carry the control.
  const canRelock = await isSectionUnlockedByPin(scope.businessId, "RECIPES");
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
