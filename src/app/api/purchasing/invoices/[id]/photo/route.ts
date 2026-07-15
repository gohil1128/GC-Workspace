import { NextResponse } from "next/server";
import { getScope } from "@/lib/scope";
import { prisma } from "@/lib/prisma";

// Serves an invoice's attached photo as a real image URL. Browsers block
// opening data: URLs in a new tab, so every "view photo" link goes through
// here instead.
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const scope = await getScope();
  const inv = await prisma.invoice.findFirst({
    where: { id, locationId: scope.locationId },
    select: { imageDataUrl: true },
  });
  if (!inv?.imageDataUrl) {
    return NextResponse.json({ error: "No photo attached" }, { status: 404 });
  }
  const match = /^data:(image\/[a-z+.-]+|application\/pdf);base64,(.+)$/s.exec(inv.imageDataUrl);
  if (!match) {
    return NextResponse.json({ error: "Stored attachment is unreadable" }, { status: 500 });
  }
  const [, mime, b64] = match;
  return new NextResponse(Buffer.from(b64, "base64"), {
    headers: {
      "Content-Type": mime,
      // inline → browsers render the PDF/image in the tab instead of downloading
      "Content-Disposition": `inline; filename="invoice.${mime === "application/pdf" ? "pdf" : "jpg"}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
