import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import { getScope } from "@/lib/scope";
import { listInvoices } from "@/modules/invoices/queries";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";
import { deleteInvoiceAction } from "@/modules/invoices/actions";
import { ReopenInvoiceButton } from "../_components/reopen-invoice-button";
import { formatMoney } from "@/lib/money";
import { fmtDate } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  const scope = await getScope();
  const invoices = await listInvoices(scope.locationId);
  const totalSpend = invoices.reduce((a, i) => a + i.totalCents, 0);
  return (
    <div>
      <PageHeader
        title="Invoices"
        description={`${invoices.length} invoices · ${formatMoney(totalSpend)} total`}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link href="/purchasing">Purchase Orders</Link></Button>
            <Button asChild size="sm"><Link href="/purchasing/invoices/new"><Plus className="h-3.5 w-3.5" /> New invoice</Link></Button>
          </>
        }
      />
      <div className="p-4 sm:p-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created by</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">
                    <Link href={`/purchasing/invoices/${i.id}`} className="hover:underline">
                      {i.invoiceNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{i.supplier.name}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(i.invoiceDate)}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(i.dateReceived)}</TableCell>
                  <TableCell className="text-right num">{i._count.items}</TableCell>
                  <TableCell className="text-right num">{formatMoney(i.subtotalCents)}</TableCell>
                  <TableCell className="text-right num font-medium">{formatMoney(i.totalCents)}</TableCell>
                  <TableCell>
                    {i.closedAt ? (
                      <div className="flex items-center gap-1.5">
                        <Badge variant="success">Closed</Badge>
                        <ReopenInvoiceButton id={i.id} />
                      </div>
                    ) : (
                      <Badge variant="muted">Open</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs">{i.createdBy.name}</TableCell>
                  <TableCell>
                    <DeleteButton
                      action={deleteInvoiceAction.bind(null, i.id)}
                      itemLabel="invoice"
                      itemName={`${i.invoiceNumber} (${i.supplier.name})`}
                      confirmText={`This will delete invoice ${i.invoiceNumber} and REVERSE its inventory impact (subtract ${i._count.items} items' quantities from on-hand).`}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {invoices.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-10">
                    <FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    No invoices yet. Click <span className="font-medium">New invoice</span> to create one.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
