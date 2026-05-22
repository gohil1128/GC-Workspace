import Link from "next/link";
import { Plus, Download } from "lucide-react";
import { getScope } from "@/lib/scope";
import { listCashCloses } from "@/modules/cash/queries";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatMoney } from "@/lib/money";
import { fmtDate } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function CashPage() {
  const scope = await getScope();
  const closes = await listCashCloses(scope.locationId, 30);
  const totalOverShort = closes.reduce((a, c) => a + c.overShortCents, 0);
  return (
    <div>
      <PageHeader
        title="Cash close"
        description={`${closes.length} closes in last 30 days · Net over/short: ${formatMoney(totalOverShort, { signed: true })}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><a href="/api/exports/cash"><Download className="h-3.5 w-3.5" /> CSV</a></Button>
            <Button asChild size="sm"><Link href="/cash/new"><Plus className="h-3.5 w-3.5" /> New close</Link></Button>
          </>
        }
      />
      <div className="p-4 sm:p-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Closed by</TableHead>
                <TableHead className="text-right">Opening</TableHead>
                <TableHead className="text-right">Closing</TableHead>
                <TableHead className="text-right">Deposit</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Over/Short</TableHead>
                <TableHead className="text-right">Flag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closes.map((c) => {
                const flagged = Math.abs(c.overShortCents) > 2000;
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{fmtDate(c.businessDate)}</TableCell>
                    <TableCell className="text-muted-foreground">{c.closedBy.name}</TableCell>
                    <TableCell className="text-right num">{formatMoney(c.openingCents)}</TableCell>
                    <TableCell className="text-right num">{formatMoney(c.closingCents)}</TableCell>
                    <TableCell className="text-right num">{formatMoney(c.depositCents)}</TableCell>
                    <TableCell className="text-right num">{formatMoney(c.expectedCents)}</TableCell>
                    <TableCell className={`text-right num ${c.overShortCents < 0 ? "text-destructive" : c.overShortCents > 0 ? "text-warning" : "text-success"}`}>{formatMoney(c.overShortCents, { signed: true })}</TableCell>
                    <TableCell className="text-right">{flagged ? <Badge variant="danger">Over $20</Badge> : <Badge variant="muted">OK</Badge>}</TableCell>
                  </TableRow>
                );
              })}
              {closes.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-8">No closes recorded yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
