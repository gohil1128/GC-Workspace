import { NextResponse } from "next/server";
import { getScope } from "@/lib/scope";
import { listOpenPosForSupplier } from "@/modules/invoices/queries";

export async function GET(req: Request) {
  const scope = await getScope();
  const url = new URL(req.url);
  const supplierId = url.searchParams.get("supplierId");
  if (!supplierId) return NextResponse.json({ pos: [] });
  const pos = await listOpenPosForSupplier(scope.locationId, supplierId);
  return NextResponse.json({
    pos: pos.map((p) => ({ id: p.id, orderedAt: p.orderedAt.toISOString(), totalCents: p.totalCents })),
  });
}
