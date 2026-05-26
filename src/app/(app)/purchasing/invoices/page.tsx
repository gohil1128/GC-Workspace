import Link from "next/link";
import { FileText, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { getScope } from "@/lib/scope";
import { listInvoices, listSuppliersForInvoice } from "@/modules/invoices/queries";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteButton } from "@/components/delete-button";
import { deleteInvoiceAction } from "@/modules/invoices/actions";
import { ReopenInvoiceButton } from "../_components/reopen-invoice-button";
import { InvoiceFilters } from "./_components/invoice-filters";
import { formatMoney } from "@/lib/money";
import { fmtDate } from "@/lib/date";

export const dynamic = "force-dynamic";

type SortKey = "invoiceDate" | "invoiceNumber" | "supplier" | "total" | "status";
type SortDir = "asc" | "desc";

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ supplier?: string; status?: string; number?: string; from?: string; to?: string; sort?: SortKey; dir?: SortDir }>;
}) {
  const sp = await searchParams;
  const scope = await getScope();

  const filters = {
    supplierId: sp.supplier,
    status: (sp.status as "open" | "closed" | "all" | undefined) ?? "all",
    invoiceNumber: sp.number,
    from: sp.from,
    to: sp.to,
  };

  const [invoices, suppliers] = await Promise.all([
    listInvoices(scope.locationId, filters),
    listSuppliersForInvoice(scope.businessId),
  ]);

  const sortKey: SortKey = (sp.sort as SortKey) ?? "invoiceDate";
  const sortDir: SortDir = (sp.dir as SortDir) ?? "desc";
  const sorted = [...invoices].sort((a, b) => {
    const sign = sortDir === "asc" ? 1 : -1;
    switch (sortKey) {
      case "invoiceNumber": return sign * a.invoiceNumber.localeCompare(b.invoiceNumber);
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

  const SortIcon = ({ k }: { k: SortKey }) =>
    sortKey !== k ? <ArrowUpDown className="inline h-3 w-3 ml-1 opacity-40" /> :
      sortDir === "asc" ? <ArrowUp className="inline h-3 w-3 ml-1" /> : <ArrowDown className="inline h-3 w-3 ml-1" />;

  return (
    <div>
      <PageHeader
        title="Invoices"
        description={`${sorted.length} invoice${sorted.length === 1 ? "" : "s"}${activeFilterCount > 0 ? " (filtered)" : ""} · ${formatMoney(totalSpend)} total`}
        actions={
          <Button asChild variant="outline" size="sm"><Link href="/purchasing">All purchasing</Link></Button>
        }
      />
      <div className="p-4 sm:p-6 space-y-4">
        <InvoiceFilters suppliers={suppliers} />

        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead><Link href={buildSortHref("invoiceNumber")} className="hover:text-foreground">Invoice #<SortIcon k="invoiceNumber" /></Link></TableHead>
                <TableHead><Link href={buildSortHref("supplier")} className="hover:text-foreground">Supplier<SortIcon k="supplier" /></Link></TableHead>
                <TableHead><Link href={buildSortHref("invoiceDate")} className="hover:text-foreground">Date<SortIcon k="invoiceDate" /></Link></TableHead>
                <TableHead>Received</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right"><Link href={buildSortHref("total")} className="hover:text-foreground">Total<SortIcon k="total" /></Link></TableHead>
                <TableHead><Link href={buildSortHref("status")} className="hover:text-foreground">Status<SortIcon k="status" /></Link></TableHead>
                <TableHead>Created by</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((i) => (
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
              {sorted.length === 0 && (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-10">
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
        </div>
      </div>
    </div>
  );
}
