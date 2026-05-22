import { redirect } from "next/navigation";
import { getScope } from "@/lib/scope";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SalesImporter } from "./_components/sales-importer";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const scope = await getScope();
  if (scope.role !== "OWNER") redirect("/dashboard");
  return (
    <div>
      <PageHeader title="Integrations" description="CSV import works · external APIs are wired as placeholders" />
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Sales CSV import <Badge variant="success" className="ml-2">Live</Badge></CardTitle>
            <CardDescription>Columns: date, net_sales, tax, guests</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesImporter />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>POS sync <Badge variant="muted" className="ml-2">Placeholder</Badge></CardTitle>
            <CardDescription>Connect Square or Toast to sync net sales automatically</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" disabled>Connect Square</Button>
            <Button variant="outline" size="sm" disabled>Connect Toast</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>QuickBooks export <Badge variant="muted" className="ml-2">Placeholder</Badge></CardTitle>
            <CardDescription>Push sales + purchase data into QuickBooks Online</CardDescription>
          </CardHeader>
          <CardContent><Button variant="outline" size="sm" disabled>Connect QuickBooks</Button></CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Payroll export <Badge variant="muted" className="ml-2">Placeholder</Badge></CardTitle>
            <CardDescription>Export hours into Gusto or ADP</CardDescription>
          </CardHeader>
          <CardContent><Button variant="outline" size="sm" disabled>Connect Gusto</Button></CardContent>
        </Card>
      </div>
    </div>
  );
}
