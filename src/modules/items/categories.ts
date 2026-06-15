// Standard menu categories for God's Chai. "Other" is the catch-all for
// Custom Amount / uncategorized lines; "Tips" lets the operator pull gratuity
// lines out of revenue analysis.
export const ITEM_CATEGORIES = [
  "Hot Chai",
  "Cold Chais",
  "Food",
  "Tips",
  "Other",
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

// Normalize whatever Square sent (incl. blank / "Uncategorized" / "Custom
// Amount") into a clean display label, used wherever items are grouped.
export function normalizeCategory(category: string | null, itemName?: string): string {
  const c = (category ?? "").trim().toLowerCase();
  const name = (itemName ?? "").trim().toLowerCase();
  if (name.includes("tip") || name.includes("gratuity")) return "Tips";
  if (c === "" || c === "uncategorized" || c === "none") {
    if (name.includes("custom amount")) return "Other";
    return "Other";
  }
  if (c.includes("hot")) return "Hot Chai";
  if (c.includes("cold")) return "Cold Chais";
  if (c.includes("food")) return "Food";
  if (c.includes("tip")) return "Tips";
  // Title-case whatever else they used
  return (category ?? "Other").trim();
}

// Category → soft accent. Shared by dashboard rollup + item list.
export function categoryStyle(category: string | null) {
  const c = normalizeCategory(category).toLowerCase();
  if (c.includes("hot")) return { dot: "bg-destructive", text: "text-destructive", bar: "bg-destructive" };
  if (c.includes("cold")) return { dot: "bg-brand", text: "text-brand", bar: "bg-brand" };
  if (c.includes("food")) return { dot: "bg-warning", text: "text-warning", bar: "bg-warning" };
  if (c.includes("tip")) return { dot: "bg-success", text: "text-success", bar: "bg-success" };
  return { dot: "bg-muted-foreground/50", text: "text-muted-foreground", bar: "bg-muted-foreground/50" };
}
