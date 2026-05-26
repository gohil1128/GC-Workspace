import { PageHeader } from "@/components/page-header";
import { getScope } from "@/lib/scope";
import { isRecipesLocked } from "@/modules/recipes-lock/actions";
import { PinGate } from "./_components/pin-gate";

export const dynamic = "force-dynamic";

export default async function RecipesLayout({ children }: { children: React.ReactNode }) {
  const scope = await getScope();
  const locked = await isRecipesLocked(scope.businessId);
  if (locked) {
    return (
      <div>
        <PageHeader title="Recipes" description="Section protected by PIN" />
        <PinGate />
      </div>
    );
  }
  return <>{children}</>;
}
