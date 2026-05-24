import Link from "next/link";
import { getScope } from "@/lib/scope";
import { listRecipes } from "@/modules/recipes/queries";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney, formatPercent, safeDivide } from "@/lib/money";
import { NewRecipeButton } from "./_components/new-recipe";
import { DeleteButton } from "@/components/delete-button";
import { deleteRecipeAction } from "@/modules/recipes/actions";

export const dynamic = "force-dynamic";

export default async function RecipesPage() {
  const scope = await getScope();
  const recipes = await listRecipes(scope.businessId);
  return (
    <div>
      <PageHeader title="Recipes" description={`${recipes.length} menu items`} actions={<NewRecipeButton />} />
      <div className="p-4 sm:p-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Menu Price</TableHead>
                <TableHead className="text-right">Plate Cost</TableHead>
                <TableHead className="text-right">Food Cost %</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {recipes.map((r) => {
                const pct = safeDivide(r.plateCostCents, r.menuPriceCents) * 100;
                const tone = pct > 35 ? "danger" : pct > 30 ? "warning" : "success";
                return (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link href={`/recipes/${r.id}`} className="hover:underline">{r.name}</Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.category ?? "—"}</TableCell>
                    <TableCell className="text-right num">{formatMoney(r.menuPriceCents)}</TableCell>
                    <TableCell className="text-right num">{formatMoney(r.plateCostCents)}</TableCell>
                    <TableCell className="text-right num">
                      <Badge variant={tone as any}>{formatPercent(pct)}</Badge>
                    </TableCell>
                    <TableCell className="text-right">{r.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}</TableCell>
                    <TableCell>
                      <DeleteButton action={deleteRecipeAction.bind(null, r.id)} itemLabel="recipe" itemName={r.name} />
                    </TableCell>
                  </TableRow>
                );
              })}
              {recipes.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No recipes yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
