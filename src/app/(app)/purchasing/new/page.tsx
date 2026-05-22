import { getScope } from "@/lib/scope";
import { getReorderSuggestions, listSuppliers } from "@/modules/purchasing/queries";
import { PageHeader } from "@/components/page-header";
import { ReorderBuilder } from "./_components/reorder-builder";

export const dynamic = "force-dynamic";

export default async function NewPoPage() {
  const scope = await getScope();
  const [groups, suppliers] = await Promise.all([
    getReorderSuggestions(scope.businessId),
    listSuppliers(scope.businessId),
  ]);
  return (
    <div>
      <PageHeader title="New purchase order" description="Reorder suggestions are grouped by supplier" />
      <div className="p-4 sm:p-6">
        <ReorderBuilder
          groups={groups.map((g) => ({
            supplier: g.supplier ? { id: g.supplier.id, name: g.supplier.name, leadTimeDays: g.supplier.leadTimeDays } : null,
            items: g.items.map((s) => ({
              ingredientId: s.ingredient.id,
              name: s.ingredient.name,
              unit: s.ingredient.unit,
              onHand: s.ingredient.onHand,
              parLevel: s.ingredient.parLevel,
              reorderPoint: s.ingredient.reorderPoint,
              suggested: s.suggested,
              lastCostCents: s.ingredient.lastCostCents,
            })),
          }))}
          allSuppliers={suppliers.map((s) => ({ id: s.id, name: s.name }))}
        />
      </div>
    </div>
  );
}
