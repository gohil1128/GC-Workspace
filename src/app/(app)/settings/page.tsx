import { redirect } from "next/navigation";
import Link from "next/link";
import { Users, Plug } from "lucide-react";
import { getScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const scope = await getScope();
  if (scope.role !== "OWNER") redirect("/dashboard");

  const [business, locations] = await Promise.all([
    prisma.business.findUnique({ where: { id: scope.businessId } }),
    prisma.location.findMany({ where: { businessId: scope.businessId }, orderBy: { name: "asc" } }),
  ]);

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Business, locations, users, and integrations"
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link href="/settings/users"><Users className="h-3.5 w-3.5" /> Users</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href="/settings/integrations"><Plug className="h-3.5 w-3.5" /> Integrations</Link></Button>
          </>
        }
      />
      <div className="p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>{business?.name}</CardTitle>
            <CardDescription>{business?.timezone} · {business?.currency}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <Row label="Food target %" value={`${business?.foodTargetPct ?? 32}%`} />
            <Row label="Labor target %" value={`${business?.laborTargetPct ?? 30}%`} />
            <Row label="Created" value={business?.createdAt.toDateString() ?? "—"} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Locations</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {locations.map((l) => (
              <div key={l.id} className="flex items-center justify-between rounded-md border p-2">
                <div>
                  <div className="font-medium text-sm">{l.name}</div>
                  <div className="text-2xs text-muted-foreground">{l.address ?? "—"}</div>
                </div>
                <Badge variant="muted">{l.kind}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="num">{value}</span>
    </div>
  );
}
