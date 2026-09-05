import Link from "next/link";
import { Camera, FileText, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { getScope } from "@/lib/scope";
import { getActiveEvent } from "@/modules/events/queries";
import { listInvoices, listSuppliersForInvoice } from "@/modules/invoices/queries";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TableOnDesktop, MobileList, MobileRow, MobileField, MobileEmpty } from "@/components/mobile-list";
import { DeleteButton } from "@/components/delete-button";
import { deleteInvoiceAction } from "@/modules/invoices/actions";
import { ReopenInvoiceButton } from "../_components/reopen-invoice-button";
import { InvoiceFilters } from "./_components/invoice-filters";
import { ExportInvoicesButton } from "./_components/export-invoices-button";
import { StatTile, StatTileRow } from "@/components/stat-tile";
import { formatMoney } from "@/lib/money";
import { fmtDate, safeDateParam } from "@/lib/date";

export const dynamic = "force-dynamic";

type SortKey = "invoiceDate" | "supplier" | "total" | "status";
type SortDir = "asc" | "desc";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string; status?: string; number?: string; from?: string; to?: string; untagged?: string; sort?: SortKey; dir?: SortDir }>;
}) {
  const sp = await searchParams;
  const scope = await getScope();
  const activeEvent = await getActiveEvent(scope.businessId);

  const onlyUntagged = sp.untagged === "1";

  const filters = {
    supplierId: sp.supplier,
    // Untagged means "belongs to no event", so an event scope would make the
    // view empty by construction.
    eventId: onlyUntagged ? null : activeEvent?.id ?? null,
    status: (sp.status as "open" | "closed" | "all" | undefined) ?? "all",
    invoiceNumber: sp.number,
    from: safeDateParam(sp.from),
    to: safeDateParam(sp.to),
  };


  const [allInvoices, suppliers] = await Promise.all([
    listInvoices(scope.locationId, filters),
    listSuppliersForInvoice(scope.businessId),
  ]);
  const invoices = onlyUntagged ? allInvoices.filter((i) => !i.event && !i.appliesToAllEvents) : allInvoices;

  const sortKey: SortKey = (sp.sort as SortKey) ?? "invoiceDate";
  const sortDir: SortDir = (sp.dir as SortDir) ?? "desc";
  const sorted = [...invoices].sort((a, b) => {
    const sign = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "supplier": return sign * a.supplier.name.localeCompare(b.supplier.name);
      case "total": return sign * (a.totalCents - b.totalCents);
      case "status": {
        const av = a.closedAt ? 1 : 0; const bv = b.closedAt ? 1 : 0;
        return sign * (av - bv);
      }
      case "invoiceDate":
      default:
        return sign * (a.invoiceDate.getTime() - b.invoiceDate.getTime());
    }
  });

  const totalSpend = sorted.reduce((a, i) => a + i.totalCents, 0);
  const openInvoices = sorted.filter((i) => !i.closedAt);
  const openTotal = openInvoices.reduce((a, i) => a + i.totalCents, 0);
  const untaggedCount = allInvoices.filter((i) => !i.event && !i.appliesToAllEvents).length;
  // Oldest still-open bill — the schema has no due date, so this is the real
  // stand-in for "what has been sitting unpaid longest".
  const oldestOpen = [...openInvoices].sort(
    (a, b) => a.invoiceDate.getTime() - b.invoiceDate.getTime(),
  )[0];
  const activeFilterCount =
    (filters.supplierId ? 1 : 0) +
    (filters.status && filters.status !== "all" ? 1 : 0) +
    (filters.invoiceNumber ? 1 : 0) +
    (filters.from ? 1 : 0) +
    (filters.to ? 1 : 0);

  const buildSortHref = (key: SortKey) => {
    const params = new URLSearchParams();
    if (filters.supplierId) params.set("supplier", filters.supplierId);
    if (filters.status && filters.status !== "all") params.set("status", filters.status);
    if (filters.invoiceNumber) params.set("number", filters.invoiceNumber);
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    params.set("sort", key);
    params.set("dir", sortKey === key && sortDir === "desc" ? "asc" : "desc");
    return `/purchasing/invoices?${params.toString()}`;
  };

  const ariaSort = (k: SortKey): "ascending" | "descending" | "none" =>
    sortKey !== k ? "none" : sortDir === "asc" ? "ascending" : "descending";

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-40" /> :
      sortDir === "asc" ? <ArrowUp className="inline h-3 w-3 ml-1" /> : <ArrowDown className="inline h-3 w-3 ml-1" />;

  return (
    <div>
      <PageHeader
        eyebrow="Purchasing · Invoices"
        title="Invoice tracking"
        description={`${sorted.length} invoice${sorted.length === 1 ? "" : "s"}${activeFilterCount > 0 ? " (filtered)" : ""} · ${formatMoney(totalSpend)} total`}
        actions={
          <>
            <ExportInvoicesButton count={sorted.length} />
            <Button asChild variant="outline" size="sm"><Link href="/purchasing">All purchasing</Link></Button>
          </>
        }
      />
      <div className="mx-auto max-w-[1400px] px-4 pb-10 pt-5 sm:px-6 lg:px-8 space-y-4">
        <StatTileRow>
          <StatTile
            label="Total · all invoices"
            value={formatMoney(totalSpend)}
            meta={`${sorted.length} invoice${sorted.length === 1 ? "" : "s"}`}
          />
          <StatTile
            label="Open"
            value={formatMoney(openTotal)}
            meta={`${openInvoices.length} invoice${openInvoices.length === 1 ? "" : "s"}`}
          />
          <StatTile
            variant="dark"
            label="Oldest open"
            value={oldestOpen ? fmtDate(oldestOpen.invoiceDate) : "—"}
            meta={oldestOpen ? oldestOpen.supplier.name : "nothing open"}
          />
          <StatTile
            variant="amber"
            label="Untagged to an event"
            value={untaggedCount}
            action={
              untaggedCount > 0 ? (
                <Button asChild size="sm"><Link href="/purchasing/invoices?untagged=1">Tag them</Link></Button>
              ) : undefined
            }
          />
        </StatTileRow>

        <InvoiceFilters suppliers={suppliers} />
        {onlyUntagged && (
          <div className="flex items-center justify-between gap-3 rounded-lg border border-warning/25 bg-warning-muted px-3 py-2 text-xs">
            <span>
              Showing only invoices <span className="font-semibold">not tagged to any event</span>.
              Open each one and pick an event from the event dropdown.
            </span>
            <Link href="/purchasing/invoices" className="underline text-warning-foreground shrink-0">Clear filter</Link>
          </div>
        )}

        <TableOnDesktop className="bento">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead aria-sort={ariaSort("supplier")}><Link href={buildSortHref("supplier")} className="hover:text-foreground">Supplier<SortIcon k="supplier" /></Link></TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Category</TableHead>
                <TableHead aria-sort={ariaSort("invoiceDate")}><Link href={buildSortHref("invoiceDate")} className="hover:text-foreground">Date<SortIcon k="invoiceDate" /></Link></TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right" aria-sort={ariaSort("total")}><Link href={buildSortHref("total")} className="hover:text-foreground">Total<SortIcon k="total" /></Link></TableHead>
                <TableHead aria-sort={ariaSort("status")}><Link href={buildSortHref("status")} className="hover:text-foreground">Status<SortIcon k="status" /></Link></TableHead>
                <TableHead>Created by</TableHead>
                <TableHead className="text-center">Photo</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((i) => (
                <TableRow key={i.id}>
                  <TableCell className="font-medium">
                    <Link href={`/purchasing/invoices/${i.id}`} className="hover:underline">
                      {i.supplier.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    {i.appliesToAllEvents ? (
                      <Badge variant="brand">All events</Badge>
                    ) : i.event ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: i.event.color ?? "hsl(var(--muted-foreground))" }} />
                        {i.event.name}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {i.category ? <Badge variant="muted">{i.category}</Badge> : <span className="text-xs text-muted-foreground">—</span>}
                  </TableCell>
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
                  <TableCell className="text-center">
                    {i.hasImage ? (
                      <a
                        href={`/api/purchasing/invoices/${i.id}/photo`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open invoice photo"
                        className="inline-flex h-7 w-7 items-center justify-center rounded-md text-brand hover:bg-brand/10 transition-colors"
                      >
                        <Camera className="h-4 w-4" />
                      </a>
                    ) : (
                      <span className="text-2xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DeleteButton
                      action={deleteInvoiceAction.bind(null, i.id)}
                      itemLabel="invoice"
                      itemName={`${i.supplier.name} · ${fmtDate(i.invoiceDate)}`}
                      confirmText={`This will delete the ${i.supplier.name} invoice from ${fmtDate(i.invoiceDate)} and REVERSE its inventory impact (subtract ${i._count.items} items' quantities from on-hand).`}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={12} className="text-center text-sm text-muted-foreground py-10">
                    <FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />
                    {activeFilterCount > 0
                      ? "No invoices match the current filters. Adjust filters above."
                      : <>No invoices yet. Use <Link href="/purchasing" className="underline">Purchasing → New invoice</Link> to create one.</>
                    }
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableOnDesktop>

        {/* Cards take no href: each row owns actions (photo, re-open, delete),
            which cannot be nested inside a link — the supplier name is the link. */}
        <MobileList>
          {sorted.map((i) => (
            <MobileRow
              key={i.id}
              title={
                <Link href={`/purchasing/invoices/${i.id}`} className="hover:underline">
                  {i.supplier.name}
                </Link>
              }
              subtitle={fmtDate(i.invoiceDate)}
              meta={formatMoney(i.totalCents)}
              badges={
                <>
                  {i.closedAt ? <Badge variant="success">Closed</Badge> : <Badge variant="muted">Open</Badge>}
                  {i.appliesToAllEvents ? (
                    <Badge variant="brand">All events</Badge>
                  ) : i.event ? (
                    <Badge variant="muted">
                      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: i.event.color ?? "hsl(var(--muted-foreground))" }} />
                      {i.event.name}
                    </Badge>
                  ) : (
                    <Badge variant="muted">No event</Badge>
                  )}
                  {i.category && <Badge variant="muted">{i.category}</Badge>}
                  <span className="ml-auto flex items-center gap-1">
                    {i.hasImage && (
                      <a
                        href={`/api/purchasing/invoices/${i.id}/photo`}
                        target="_blank"
                        rel="noreferrer"
                        title="Open invoice photo"
                        className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-2xs font-semibold text-brand hover:bg-brand/10 transition-colors"
                      >
                        <Camera className="h-3.5 w-3.5" /> Photo
                      </a>
                    )}
                    {i.closedAt && <ReopenInvoiceButton id={i.id} />}
                    <DeleteButton
                      action={deleteInvoiceAction.bind(null, i.id)}
                      itemLabel="invoice"
                      itemName={`${i.supplier.name} · ${fmtDate(i.invoiceDate)}`}
                      confirmText={`This will delete the ${i.supplier.name} invoice from ${fmtDate(i.invoiceDate)} and REVERSE its inventory impact (subtract ${i._count.items} items' quantities from on-hand).`}
                    />
                  </span>
                </>
              }
            >
              <MobileField label="Received" value={fmtDate(i.dateReceived)} />
              <MobileField label="Items" value={i._count.items} />
              <MobileField label="Subtotal" value={formatMoney(i.subtotalCents)} />
              <MobileField label="Created by" value={i.createdBy.name} />
            </MobileRow>
          ))}
          {sorted.length === 0 && (
            <MobileEmpty>
              <FileText className="h-6 w-6 mx-auto mb-2 opacity-40" />
              {activeFilterCount > 0
                ? "No invoices match the current filters. Adjust filters above."
                : <>No invoices yet. Use <Link href="/purchasing" className="underline">Purchasing → New invoice</Link> to create one.</>
              }
            </MobileEmpty>
          )}
        </MobileList>
      </div>
    </div>
  );
}
