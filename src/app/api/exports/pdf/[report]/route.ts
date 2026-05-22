import { NextResponse } from "next/server";

// PDF export placeholder. The contract intentionally mirrors what a real
// implementation (Playwright/react-pdf) would honor: same path, same params.
export async function GET(_req: Request, { params }: { params: Promise<{ report: string }> }) {
  const { report } = await params;
  return NextResponse.json(
    {
      error: "not_implemented",
      report,
      message: "PDF export is wired but not implemented in MVP. Use the CSV export at /api/exports/[report].",
    },
    { status: 501 }
  );
}
