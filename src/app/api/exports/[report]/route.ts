import { NextResponse } from "next/server";
import { scopeFor } from "@/lib/scope";
import { toCsv } from "@/lib/csv";
import { findExport } from "@/modules/exports/registry";
import { isSectionLocked } from "@/modules/section-lock/actions";
import type { SectionKey } from "@/modules/section-lock/sections";

// Downloads that would hand over exactly what a locked section hides. Removing
// the button is not enough when the URL is guessable.
const GATED: Record<string, SectionKey | undefined> = {
  pnl: "REPORTS",
  "event-summary": "EVENTS",
};

// Every downloadable dataset lives in the export registry — this route just
// resolves the key, runs its builder and serves the CSV.
export async function GET(req: Request, { params }: { params: Promise<{ report: string }> }) {
  const { report } = await params;
  const def = findExport(report);
  if (!def) {
    return NextResponse.json({ error: "unknown report" }, { status: 404 });
  }

  const scope = await scopeFor("exports");
  if (!scope) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const section = GATED[report];
  if (section && (await isSectionLocked(scope.businessId, section))) {
    return NextResponse.json({ error: "section locked" }, { status: 403 });
  }

  const sp = new URL(req.url).searchParams;
  const { columns, rows } = await def.build({ scope, sp });

  const csv = toCsv(rows, columns);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${report}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
