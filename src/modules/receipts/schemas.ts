// We use zod/v4 here so the schema is compatible with @anthropic-ai/sdk's
// zodOutputFormat helper, which only accepts v4 schemas. The rest of the app
// uses zod (v3 mode) — these two coexist fine inside zod 3.25.
import * as z from "zod/v4";

export const lineItemSchema = z.object({
  name: z.string().describe("Product or item name as it appears on the receipt"),
  qty: z.number().describe("Numeric quantity (e.g. 5 for '5 lb', 2 for '2 cases')"),
  unit: z.string().describe("Unit of measure as listed: lb, kg, g, oz, ea, case, gal, L, ml, pack, etc."),
  totalDollars: z.number().describe("Total dollar amount paid for this line (post-discount if shown)"),
  perUnitDollars: z.number().describe("Per-unit cost: totalDollars divided by qty, rounded to 4 decimals"),
  category: z
    .enum(["PRODUCE", "MEAT", "DAIRY", "DRY_GOODS", "BEVERAGE", "PACKAGING", "EQUIPMENT", "CLEANING", "OTHER"])
    .describe("Best-guess category for the item"),
});

export const receiptAnalysisSchema = z.object({
  merchant: z.string().nullable().describe("Store/vendor name from the receipt; null if not visible"),
  receiptDate: z.string().nullable().describe("Date on the receipt in YYYY-MM-DD format; null if not visible"),
  currency: z.string().describe("3-letter ISO currency code (default USD if not visible)"),
  lineItems: z.array(lineItemSchema).describe("Every distinct line on the receipt"),
  subtotalDollars: z.number().nullable().describe("Subtotal before tax, if shown"),
  taxDollars: z.number().nullable().describe("Tax amount, if shown"),
  totalDollars: z.number().describe("Grand total paid"),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]).describe("How confident you are in the extraction"),
  notes: z.string().nullable().describe("Anything unusual: handwritten edits, missing fields, illegible sections"),
});

export type ReceiptAnalysis = z.infer<typeof receiptAnalysisSchema>;
export type ReceiptLineItem = z.infer<typeof lineItemSchema>;
