import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { receiptAnalysisSchema, type ReceiptAnalysis } from "./schemas";

const SYSTEM_PROMPT = `You are a receipt-parsing assistant for a small food & beverage business (God's Chai Operations). The user uploads a photo or scan of a supplier/grocery receipt and you extract every line item.

For each line item you MUST compute:
- qty: the numeric quantity that appears on the receipt (e.g. for "5 lb chicken" the qty is 5)
- unit: the unit of measure exactly as listed (lb, kg, g, oz, ea, case, gal, L, ml, pack...). If no unit is shown, use "ea" (each).
- totalDollars: the total dollars paid for this line
- perUnitDollars: totalDollars / qty, rounded to 4 decimals. This is the per-unit cost the operator cares about most.

Rules:
- If a line shows a pack size (e.g. "Milk 1 gal × 4 = $18.00"), the qty is 4 and unit is "gal" if the operator pays per gallon; otherwise use the larger pack unit. Use the smallest unit the receipt itself prices by.
- If you see weight in kilograms or grams, keep it in those units — do not convert.
- Treat refunds and discounts as negative totals.
- If you cannot read a number confidently, omit that line rather than guess.
- Currency defaults to USD unless the receipt clearly shows otherwise.
- Date format MUST be YYYY-MM-DD.
- Set confidence to LOW if the image is blurry, partial, or you skipped lines.

Return ONLY structured JSON matching the provided schema. No prose.`;

export async function analyzeReceiptImage(
  imageBase64: string,
  mediaType: "image/png" | "image/jpeg" | "image/webp" | "image/gif",
): Promise<ReceiptAnalysis> {
  const client = new Anthropic();

  const response = await client.messages.parse({
    model: "claude-opus-4-8",
    max_tokens: 4096,
    thinking: { type: "adaptive" },
    system: [
      {
        type: "text",
        text: SYSTEM_PROMPT,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: imageBase64 },
          },
          {
            type: "text",
            text: "Parse this receipt. Return every visible line item with per-unit cost.",
          },
        ],
      },
    ],
    output_config: { format: zodOutputFormat(receiptAnalysisSchema) },
  });

  if (!response.parsed_output) {
    throw new Error("Model returned no parsed output");
  }
  return response.parsed_output as ReceiptAnalysis;
}
