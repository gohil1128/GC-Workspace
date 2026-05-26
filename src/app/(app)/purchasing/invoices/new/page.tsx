import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getScope } from "@/lib/scope";
import { listSuppliersForInvoice } from "@/modules/invoices/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NewInvoiceForm } from "../../_components/new-invoice-form";

export const dynamic = "force-dynamic";

export default async function NewInvoicePage() {
  const scope = await getScope();
  const suppliers = await listSuppliersForInvoice(scope.businessId);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div>
      <PageHeader
        title="Create invoice"
        description={`Recording a new supplier bill at ${scope.locationName}`}
        actions={
          <Button asChild variant="outline" size="sm"><Link href="/purchasing/invoices"><ArrowLeft className="h-3.5 w-3.5" /> All invoices</Link></Button>
        }
      />
      <div className="p-4 sm:p-6">
        <Card className="max-w-3xl">
          <CardHeader><CardTitle>Invoice details</CardTitle></CardHeader>
          <CardContent>
            <NewInvoiceForm
              suppliers={suppliers}
              locationName={scope.locationName}
              defaultDate={today}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
