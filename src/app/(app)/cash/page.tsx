import Link from "next/link";
import { Plus, Download, CheckCircle2 } from "lucide-react";
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
                <TableHead>Event</TableHead>
                <TableHead className="text-right">Cash</TableHead>
                <TableHead className="text-right">Credit</TableHead>
                <TableHead className="text-right">Deposit</TableHead>
                <TableHead className="text-right">Expected</TableHead>
                <TableHead className="text-right">Over/Short</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead className="text-right">Flag</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {closes.map((c) => {
                const flagged = Math.abs(c.overShortCents) > 2000;
                const dateStr = c.businessDate.toISOString().slice(0, 10);
                return (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">
                      <Link href={`/cash/new?date=${dateStr}`} className="hover:underline">{fmtDate(c.businessDate)}</Link>
                      <div className="text-2xs text-muted-foreground">{c.closedBy.name}</div>
                    </TableCell>
                    <TableCell>
                      {c.event ? (
                        <span className="inline-flex items-center gap-1.5 text-xs">
                          <span className="h-2 w-2 rounded-full" style={{ backgroundColor: c.event.color ?? "hsl(var(--muted-foreground))" }} />
                          {c.event.name}
                        </span>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-right num">{formatMoney(c.cashCents)}</TableCell>
                    <TableCell className="text-right num">{formatMoney(c.creditCents)}</TableCell>
                    <TableCell className="text-right num">{formatMoney(c.depositCents)}</TableCell>
                    <TableCell className="text-right num">{formatMoney(c.expectedCents)}</TableCell>
                    <TableCell className={`text-right num ${c.overShortCents < 0 ? "text-destructive" : c.overShortCents > 0 ? "text-warning" : "text-success"}`}>{formatMoney(c.overShortCents, { signed: true })}</TableCell>
                    <TableCell>
                      {c.verifiedBy ? (
                        <span className="inline-flex items-center gap-1 text-success text-xs">
                          <CheckCircle2 className="h-3 w-3" /> {c.verifiedBy.name}
                        </span>
                      ) : <span className="text-muted-foreground text-xs">—</span>}
                    </TableCell>
                    <TableCell className="text-right">{flagged ? <Badge variant="danger">Over $20</Badge> : <Badge variant="muted">OK</Badge>}</TableCell>
                  </TableRow>
                );
              })}
              {closes.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-sm text-muted-foreground py-8">No closes recorded yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
