import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getScope } from "@/lib/scope";
import { analyzeReceiptImage } from "@/modules/receipts/analyze";
import { writeAudit } from "@/lib/audit";

const ACCEPTED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
]);

// 8 MB is generous for receipt photos and well below Claude's 5 MB-per-image
// recommendation when base64-encoded; we resize on the client only if needed.
const MAX_BYTES = 8 * 1024 * 1024;

export const maxDuration = 60;

export async function POST(req: Request) {
  const scope = await getScope();

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI is not configured. Add ANTHROPIC_API_KEY in Vercel → Settings → Environment Variables, then redeploy." },
      { status: 503 },
    );
  }

  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }
  const rawType = file.type === "image/jpg" ? "image/jpeg" : file.type;
  if (!ACCEPTED_TYPES.has(rawType)) {
    return NextResponse.json({ error: `Unsupported file type: ${file.type}. Use PNG, JPG, or WebP.` }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: `Image too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Max 8 MB.` }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");

  try {
    const analysis = await analyzeReceiptImage(
      base64,
      rawType as "image/png" | "image/jpeg" | "image/webp" | "image/gif",
    );

    await writeAudit({
      businessId: scope.businessId,
      userId: scope.userId,
      action: "ai.receipt.analyze",
      entityType: "Receipt",
      diff: {
        merchant: analysis.merchant,
        totalDollars: analysis.totalDollars,
        lineItemCount: analysis.lineItems.length,
        confidence: analysis.confidence,
      },
    });

    return NextResponse.json({ ok: true, analysis });
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      const friendly =
        err.status === 401
          ? "ANTHROPIC_API_KEY is invalid. Check the key in Vercel and redeploy."
          : err.status === 429
            ? "AI is rate-limited — try again in a moment."
            : err.status === 529
              ? "Anthropic is overloaded right now. Try again in a minute."
              : err.message;
      return NextResponse.json({ error: friendly }, { status: err.status ?? 500 });
    }
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
