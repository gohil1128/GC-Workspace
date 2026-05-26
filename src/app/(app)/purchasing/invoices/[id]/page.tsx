import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Lock, Unlock } from "lucide-react";
import { getScope } from "@/lib/scope";
import { getInvoice } from "@/modules/invoices/queries";
import { closeInvoiceAction, deleteInvoiceAction } from "@/modules/invoices/actions";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DeleteButton } from "@/components/delete-button";
import { fmtDate, fmtDateTime } from "@/lib/date";
import { fromCents } from "@/lib/money";
import { InvoiceDetailForm } from "../../_components/invoice-detail-form";
import { InvoiceItemsTable } from "../../_components/invoice-items-table";
import { CloseInvoiceButton } from "../../_components/close-invoice-button";

export const dynamic = "force-dynamic";

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await getScope();
  const inv = await getInvoice(scope.locationId, id);
  if (!inv) notFound();

  const numberOfItems = inv.items.length;
  const qtyReceived = inv.items.reduce((a, it) => a + it.qty, 0);

  return (
    <div>
      <PageHeader
        title={`Invoice ${inv.invoiceNumber}`}
        description={`${inv.supplier.name} · ${inv.location.name} · created ${fmtDateTime(inv.createdAt)} by ${inv.createdBy.name}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link href="/purchasing/invoices"><ArrowLeft className="h-3.5 w-3.5" /> All invoices</Link></Button>
            <CloseInvoiceButton id={inv.id} closed={!!inv.closedAt} />
            <DeleteButton
              action={deleteInvoiceAction.bind(null, inv.id)}
              itemLabel="invoice"
              itemName={`${inv.invoiceNumber} (${inv.supplier.name})`}
              confirmText={`This will delete invoice ${inv.invoiceNumber} and reverse ${numberOfItems} inventory items added by it.`}
              variant="outline"
              size="sm"
            >
              <span>Delete</span>
            </DeleteButton>
          </>
        }
      />
      <div className="p-4 sm:p-6 space-y-4">
        {inv.closedAt && (
          <div className="rounded-lg border border-success/40 bg-success/10 text-success px-3 py-2 text-xs flex items-center gap-2">
            <Lock className="h-3.5 w-3.5" /> Closed {fmtDateTime(inv.closedAt)} — re-open to edit.
          </div>
        )}

        <Card>
          <CardHeader><CardTitle>Invoice header & totals</CardTitle></CardHeader>
          <CardContent>
            <InvoiceDetailForm
              invoiceId={inv.id}
              readOnly={!!inv.closedAt}
              initial={{
                supplierName: inv.supplier.name,
                locationName: inv.location.name,
                createdByName: inv.createdBy.name,
                createdAt: fmtDateTime(inv.createdAt),
                invoiceNumber: inv.invoiceNumber,
                invoiceDate: inv.invoiceDate.toISOString().slice(0, 10),
                dateReceived: inv.dateReceived.toISOString().slice(0, 10),
                internalMemo: inv.internalMemo ?? "",
                subtotalDollars: fromCents(inv.subtotalCents),
                gstDollars: fromCents(inv.gstCents),
                pstDollars: fromCents(inv.pstCents),
                shippingDollars: fromCents(inv.shippingCents),
                rebateDollars: fromCents(inv.rebateCents),
                totalDollars: fromCents(inv.totalCents),
                numberOfItems,
                qtyReceived,
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Line items</CardTitle></CardHeader>
          <CardContent>
            <InvoiceItemsTable
              invoiceId={inv.id}
              readOnly={!!inv.closedAt}
              items={inv.items.map((it) => ({
                id: it.id,
                ingredientName: it.ingredient.name,
                category: it.ingredient.category ?? null,
                qty: it.qty,
                unit: it.unit,
                unitCostDollars: fromCents(it.unitCostCents),
                lineTotalDollars: fromCents(it.lineTotalCents),
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
