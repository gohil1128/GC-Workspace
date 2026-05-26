import Link from "next/link";
import { Plus, Users, FileText } from "lucide-react";
import { getScope } from "@/lib/scope";
import { listPurchaseOrders } from "@/modules/purchasing/queries";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import { fmtDate } from "@/lib/date";

export const dynamic = "force-dynamic";

const statusVariant = (s: string) =>
  s === "DRAFT" ? "muted" : s === "SENT" ? "default" : s === "RECEIVED" ? "success" : "danger";

export default async function PurchasingPage() {
  const scope = await getScope();
  const pos = await listPurchaseOrders(scope.locationId);
  return (
    <div>
      <PageHeader
        title="Purchasing"
        description={`${pos.length} purchase orders · ${pos.filter((p) => p.status === "DRAFT" || p.status === "SENT").length} open`}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link href="/purchasing/invoices"><FileText className="h-3.5 w-3.5" /> Invoices</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href="/purchasing/suppliers"><Users className="h-3.5 w-3.5" /> Suppliers</Link></Button>
            <Button asChild size="sm"><Link href="/purchasing/invoices/new"><Plus className="h-3.5 w-3.5" /> New invoice</Link></Button>
          </>
        }
      />
      <div className="p-4 sm:p-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>PO</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ordered</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Created by</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pos.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link href={`/purchasing/${p.id}`} className="hover:underline">#{p.id.slice(-6).toUpperCase()}</Link>
                  </TableCell>
                  <TableCell>{p.supplier.name}</TableCell>
                  <TableCell><Badge variant={statusVariant(p.status) as any}>{p.status}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(p.orderedAt)}</TableCell>
                  <TableCell className="text-muted-foreground">{p.expectedAt ? fmtDate(p.expectedAt) : "—"}</TableCell>
                  <TableCell className="text-right num">{p.items.length}</TableCell>
                  <TableCell className="text-right num">{formatMoney(p.totalCents)}</TableCell>
                  <TableCell className="text-muted-foreground">{p.createdBy.name}</TableCell>
                </TableRow>
              ))}
              {pos.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No purchase orders yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
