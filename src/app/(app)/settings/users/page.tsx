import { redirect } from "next/navigation";
import { getScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/date";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const scope = await getScope();
  if (scope.role !== "OWNER") redirect("/dashboard");

  const users = await prisma.user.findMany({
    where: { businessId: scope.businessId },
    include: { locations: { include: { location: { select: { name: true } } } } },
    orderBy: { name: "asc" },
  });
  return (
    <div>
      <PageHeader title="Users" description={`${users.length} users in this business`} />
      <div className="p-4 sm:p-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Locations</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell><Badge variant={u.role === "OWNER" ? "default" : "secondary"}>{u.role}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{u.locations.map((l) => l.location.name).join(", ") || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(u.createdAt)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
