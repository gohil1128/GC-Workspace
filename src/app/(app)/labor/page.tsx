import Link from "next/link";
import { Users, BarChart3 } from "lucide-react";
import { getScope } from "@/lib/scope";
import { listShifts, listEmployees, getWeekStart } from "@/modules/labor/queries";
import { addDays, fmtDate } from "@/lib/date";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { ScheduleGrid } from "./_components/schedule-grid";

export const dynamic = "force-dynamic";

export default async function LaborPage({ searchParams }: { searchParams: Promise<{ week?: string }> }) {
  const sp = await searchParams;
  const ref = sp.week ? new Date(sp.week) : new Date();
  const weekStart = getWeekStart(ref);
  const weekEnd = addDays(weekStart, 6);
  const scope = await getScope();
  const [shifts, employees] = await Promise.all([
    listShifts(scope.locationId, weekStart, addDays(weekEnd, 1)),
    listEmployees(scope.businessId),
  ]);
  const prev = addDays(weekStart, -7).toISOString().slice(0, 10);
  const next = addDays(weekStart, 7).toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Labor"
        description={`Schedule · ${fmtDate(weekStart)} – ${fmtDate(weekEnd)}`}
        actions={
          <>
            <Button asChild variant="outline" size="sm"><Link href={`/labor?week=${prev}`}>‹ Prev</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href={`/labor?week=${next}`}>Next ›</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href="/labor/employees"><Users className="h-3.5 w-3.5" /> Employees</Link></Button>
            <Button asChild variant="outline" size="sm"><Link href="/labor/report"><BarChart3 className="h-3.5 w-3.5" /> Report</Link></Button>
          </>
        }
      />
      <div className="p-4 sm:p-6">
        <ScheduleGrid
          weekStart={weekStart.toISOString()}
          employees={employees.filter((e) => e.isActive).map((e) => ({ id: e.id, name: e.name, position: e.position, rateCents: e.hourlyRateCents }))}
          shifts={shifts.map((s) => ({
            id: s.id,
            employeeId: s.employeeId,
            employeeName: s.employee.name,
            position: s.position,
            start: s.start.toISOString(),
            end: s.end.toISOString(),
            scheduledMinutes: s.scheduledMinutes,
            actualMinutes: s.timeEntry?.actualMinutes ?? null,
          }))}
        />
      </div>
    </div>
  );
}
