import Link from "next/link";
import { Plus, FileBarChart, ClipboardList } from "lucide-react";
import { getScope } from "@/lib/scope";
import { listIngredients } from "@/modules/inventory/queries";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import { NewIngredientButton } from "./_components/new-ingredient";
import { DeleteButton } from "@/components/delete-button";
import { deleteIngredientAction } from "@/modules/inventory/actions";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const scope = await getScope();
  const items = await listIngredients(scope.businessId);
  const lowCount = items.filter((i) => i.onHand <= i.reorderPoint && i.reorderPoint > 0).length;
  return (
    <div>
      <PageHeader
        title="Inventory"
        description={`${items.length} ingredients · ${lowCount} below reorder point`}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link href="/inventory/counts"><ClipboardList className="h-3.5 w-3.5" /> Counts</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href="/inventory/variance"><FileBarChart className="h-3.5 w-3.5" /> Variance</Link></Button>
            <NewIngredientButton />
          </>
        }
      />
      <div className="p-4 sm:p-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">On Hand</TableHead>
                <TableHead className="text-right">Par</TableHead>
                <TableHead className="text-right">Reorder Pt</TableHead>
                <TableHead className="text-right">Last Cost</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((i) => {
                const low = i.onHand <= i.reorderPoint && i.reorderPoint > 0;
                return (
                  <TableRow key={i.id}>
                    <TableCell className="font-medium">
                      <Link href={`/inventory/${i.id}`} className="hover:underline">{i.name}</Link>
                      {i.sku && <span className="text-2xs text-muted-foreground ml-2">{i.sku}</span>}
                    </TableCell>
                    <TableCell className="text-muted-foreground">{i.category ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground">{i.supplier?.name ?? "—"}</TableCell>
                    <TableCell className={`text-right num ${low ? "text-destructive font-medium" : ""}`}>
                      {i.onHand.toFixed(2)} {i.unit}
                    </TableCell>
                    <TableCell className="text-right num text-muted-foreground">{i.parLevel.toFixed(2)}</TableCell>
                    <TableCell className="text-right num text-muted-foreground">{i.reorderPoint.toFixed(2)}</TableCell>
                    <TableCell className="text-right num">{formatMoney(i.lastCostCents)}</TableCell>
                    <TableCell className="text-right">
                      {low ? <Badge variant="danger">Low</Badge> : <Badge variant="muted">OK</Badge>}
                    </TableCell>
                    <TableCell>
                      <DeleteButton
                        action={deleteIngredientAction.bind(null, i.id)}
                        itemLabel="ingredient"
                        itemName={i.name}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">No ingredients yet. Click &quot;New ingredient&quot;.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
