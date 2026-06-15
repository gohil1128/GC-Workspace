import { redirect } from "next/navigation";
import { getScope } from "@/lib/scope";
import { listActiveEvents } from "@/modules/events/queries";
import { listImportedDays } from "@/modules/imports/queries";
import { fmtDate } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SalesImporter } from "./_components/sales-importer";
import { SquareImporter } from "./_components/square-importer";
import { SquareItemsImporter } from "./_components/square-items-importer";
import { SquareItemSummaryImporter } from "./_components/square-item-summary-importer";
import { ImportedDataManager } from "./_components/imported-data-manager";

export const dynamic = "force-dynamic";

export default async function IntegrationsPage() {
  const scope = await getScope();
  if (scope.role !== "OWNER") redirect("/dashboard");
  const events = await listActiveEvents(scope.businessId);
  const eventProps = events.map((e) => ({ id: e.id, name: e.name, color: e.color }));
  const broadway = events.find((e) => /broadway/i.test(e.name));
  const defaultEventId = broadway?.id;

  const importedDays = await listImportedDays(scope.locationId);
  const managerDays = importedDays.map((d) => ({
    iso: d.iso,
    label: fmtDate(d.businessDate),
    netSalesDollars: d.netSalesCents / 100,
    guestCount: d.guestCount,
    itemCount: d.itemCount,
    itemQty: d.itemQty,
    source: d.source,
    event: d.event,
  }));
  // Group imported days by event for the quick-delete chips.
  const eventGroupMap = new Map<string, { id: string; name: string; color: string | null; days: number; netDollars: number }>();
  for (const d of importedDays) {
    if (!d.event) continue;
    const g = eventGroupMap.get(d.event.id) ?? { id: d.event.id, name: d.event.name, color: d.event.color, days: 0, netDollars: 0 };
    g.days += 1;
    g.netDollars += d.netSalesCents / 100;
    eventGroupMap.set(d.event.id, g);
  }
  const eventGroups = [...eventGroupMap.values()];
  return (
    <div>
      <PageHeader title="Integrations" description="CSV import works · external APIs are wired as placeholders" />
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="lg:col-span-2 border-brand/50">
          <CardHeader>
            <CardTitle>
              Square per-item CSV
              <Badge variant="success" className="ml-2">Live</Badge>
              <Badge variant="brand" className="ml-2">Recommended</Badge>
            </CardTitle>
            <CardDescription>
              Upload Square&apos;s <em>Sales by Item</em> CSV — one row per line item per transaction.
              We aggregate daily totals AND keep a per-item breakdown so the dashboard can show
              <strong> what sold and how much</strong>. If the file has a Card Brand column we also
              split <strong>cash vs card</strong> and pre-fill that day&apos;s cash close.
              {broadway && <span className="block mt-1 text-brand">Defaults to your &quot;{broadway.name}&quot; event.</span>}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SquareItemsImporter events={eventProps} defaultEventId={defaultEventId} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Square Item Sales Summary CSV
              <Badge variant="success" className="ml-2">Live</Badge>
            </CardTitle>
            <CardDescription>
              Upload Square&apos;s <em>Item Sales</em> export — one row per item with totals
              over a date range. Since this file has no Date column, <strong>pick the
              business date</strong> (we&apos;ll guess it from the filename). We&apos;ll also
              roll the items up into a DailySales record for that day.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SquareItemSummaryImporter events={eventProps} defaultEventId={defaultEventId} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Manage imported data <Badge variant="muted" className="ml-2">Delete</Badge></CardTitle>
            <CardDescription>
              Every imported sales day at this location. Delete a single day, wipe a whole event,
              or clear everything to re-import from scratch. Deleting here removes sales totals and
              item rollups (your events themselves stay).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImportedDataManager days={managerDays} eventGroups={eventGroups} />
          </CardContent>
        </Card>

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
