import { getScope } from "@/lib/scope";
import { listEmployees } from "@/modules/labor/queries";
import { PageHeader } from "@/components/page-header";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatMoney } from "@/lib/money";
import { NewEmployeeButton } from "./_components/new-employee";
import { DeleteButton } from "@/components/delete-button";
import { deleteEmployeeAction } from "@/modules/labor/actions";

export const dynamic = "force-dynamic";

export default async function EmployeesPage() {
  const scope = await getScope();
  const employees = await listEmployees(scope.businessId);
  return (
    <div>
      <PageHeader title="Employees" description={`${employees.length} employees · ${employees.filter((e) => e.isActive).length} active`} actions={<NewEmployeeButton />} />
      <div className="p-4 sm:p-6">
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Position</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-right">Wage</TableHead>
                <TableHead className="text-right">Status</TableHead>
                <TableHead className="w-12" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {employees.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.name}</TableCell>
                  <TableCell className="text-muted-foreground">{e.position}</TableCell>
                  <TableCell className="text-muted-foreground">{e.email ?? "—"}</TableCell>
                  <TableCell className="text-right num">{formatMoney(e.hourlyRateCents)}/hr</TableCell>
                  <TableCell className="text-right">{e.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="muted">Inactive</Badge>}</TableCell>
                  <TableCell>
                    <DeleteButton
                      action={deleteEmployeeAction.bind(null, e.id)}
                      itemLabel="employee"
                      itemName={e.name}
                      confirmText={`This will permanently remove ${e.name} and any shifts assigned to them.`}
                    />
                  </TableCell>
                </TableRow>
              ))}
              {employees.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">No employees yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
