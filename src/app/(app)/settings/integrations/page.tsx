import { redirect } from "next/navigation";
import { getScope } from "@/lib/scope";
import { listActiveEvents } from "@/modules/events/queries";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SalesImporter } from "./_components/sales-importer";
import { SquareImporter } from "./_components/square-importer";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const scope = await getScope();
  if (scope.role !== "OWNER") redirect("/dashboard");
  const events = await listActiveEvents(scope.businessId);
  const eventProps = events.map((e) => ({ id: e.id, name: e.name, color: e.color }));
  return (
    <div>
      <PageHeader title="Integrations" description="CSV import works · external APIs are wired as placeholders" />
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Square sales import <Badge variant="success" className="ml-2">Live</Badge></CardTitle>
            <CardDescription>
              Upload Square&apos;s &quot;Sales Summary by Day&quot; CSV. Auto-detects Date, Net Sales,
              Gross Sales, Tax, Cash, Card, and Guests columns; cash/card totals also pre-fill the
              matching day&apos;s cash close.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SquareImporter events={eventProps} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Generic sales CSV <Badge variant="success" className="ml-2">Live</Badge></CardTitle>
            <CardDescription>Manual format · Columns: date, net_sales, tax, guests</CardDescription>
          </CardHeader>
          <CardContent>
            <SalesImporter events={eventProps} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Square POS sync <Badge variant="muted" className="ml-2">Coming soon</Badge></CardTitle>
            <CardDescription>Direct OAuth sync (no CSV upload needed) — requires Square developer approval</CardDescription>
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
