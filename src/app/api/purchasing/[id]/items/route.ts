import { NextResponse } from "next/server";
import { getScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await getScope();
  const po = await prisma.purchaseOrder.findFirst({
    where: { id, locationId: scope.locationId },
    include: { items: { include: { ingredient: true } } },
  });
  if (!po) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    items: po.items.map((it) => ({
      id: it.id,
      name: it.ingredient.name,
      qtyOrdered: it.qtyOrdered,
      qtyReceived: it.qtyReceived,
      unit: it.unit,
    })),
  });
}
