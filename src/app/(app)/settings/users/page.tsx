import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtDate } from "@/lib/date";
import { InviteUserButton } from "./_components/invite-user-button";
import { UserRowActions } from "./_components/user-row-actions";

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
      <PageHeader
        title="Users"
        description={`${users.length} user${users.length === 1 ? "" : "s"} in this business`}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link href="/settings"><ArrowLeft className="h-3.5 w-3.5" /> Settings</Link></Button>
            <InviteUserButton />
          </>
        }
      />
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
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">
                    {u.name}
                    {u.id === scope.userId && <Badge variant="muted" className="ml-2 text-2xs">You</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{u.email}</TableCell>
                  <TableCell><Badge variant={u.role === "OWNER" ? "default" : "secondary"}>{u.role}</Badge></TableCell>
                  <TableCell className="text-muted-foreground">{u.locations.map((l) => l.location.name).join(", ") || "—"}</TableCell>
                  <TableCell className="text-muted-foreground">{fmtDate(u.createdAt)}</TableCell>
                  <TableCell>
                    <UserRowActions
                      userId={u.id}
                      userName={u.name}
                      userEmail={u.email}
                      currentRole={u.role}
                      isSelf={u.id === scope.userId}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
