import { getScope } from "@/lib/scope";
import { listSuppliers } from "@/modules/purchasing/queries";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NewSupplierButton } from "./_components/new-supplier";
import { DeleteButton } from "@/components/delete-button";
import { deleteSupplierAction } from "@/modules/purchasing/actions";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const scope = await getScope();
  const suppliers = await listSuppliers(scope.businessId);
  return (
    <div>
      <PageHeader title="Suppliers" description={`${suppliers.length} suppliers`} actions={<NewSupplierButton />} />
      <div className="p-4 sm:p-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Terms</TableHead>
                <TableHead className="text-right">Lead Time</TableHead>
                <TableHead className="text-right">Ingredients</TableHead>
                <TableHead className="text-right">POs</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {suppliers.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {[s.email, s.phone].filter(Boolean).join(" · ") || "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{s.terms ?? "—"}</TableCell>
                  <TableCell className="text-right num">{s.leadTimeDays}d</TableCell>
                  <TableCell className="text-right num">{s._count.ingredients}</TableCell>
                  <TableCell className="text-right num">{s._count.purchaseOrders}</TableCell>
                  <TableCell>
                    <DeleteButton
                      action={deleteSupplierAction.bind(null, s.id)}
                      itemLabel="supplier"
                      itemName={s.name}
                      confirmText={`This will permanently remove ${s.name}. Ingredients linked to them will keep existing (just with no supplier), but any of their purchase orders will be deleted.`}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {suppliers.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">No suppliers yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
