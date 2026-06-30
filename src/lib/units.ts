// Shared unit catalog for ingredients & recipes.
//
// Units are grouped by dimension. Within a convertible dimension (weight,
// volume, count) any unit converts to any other via a base factor. "Discrete"
// pack-style units (case, box, bag…) don't have a universal numeric relation
// to each other, so they only "convert" to themselves.

export type UnitDimension = "weight" | "volume" | "count" | "discrete";

export type UnitDef = {
  value: string;      // canonical stored value, e.g. "g", "kg", "ml"
  label: string;      // human label for the dropdown
  dimension: UnitDimension;
  toBase: number;     // multiply qty by this to get the dimension's base unit
};

// Base units: weight → gram, volume → millilitre, count → each.
export const UNITS: UnitDef[] = [
  // Weight
  { value: "mg", label: "Milligram (mg)", dimension: "weight", toBase: 0.001 },
  { value: "g", label: "Gram (g)", dimension: "weight", toBase: 1 },
  { value: "kg", label: "Kilogram (kg)", dimension: "weight", toBase: 1000 },
  { value: "oz", label: "Ounce (oz)", dimension: "weight", toBase: 28.349523 },
  { value: "lb", label: "Pound (lb)", dimension: "weight", toBase: 453.59237 },

  // Volume
  { value: "ml", label: "Millilitre (ml)", dimension: "volume", toBase: 1 },
  { value: "L", label: "Litre (L)", dimension: "volume", toBase: 1000 },
  { value: "tsp", label: "Teaspoon (tsp)", dimension: "volume", toBase: 4.928922 },
  { value: "tbsp", label: "Tablespoon (tbsp)", dimension: "volume", toBase: 14.786765 },
  { value: "floz", label: "Fluid ounce (fl oz)", dimension: "volume", toBase: 29.57353 },
  { value: "cup", label: "Cup", dimension: "volume", toBase: 236.588236 },
  { value: "pt", label: "Pint (pt)", dimension: "volume", toBase: 473.176473 },
  { value: "qt", label: "Quart (qt)", dimension: "volume", toBase: 946.352946 },
  { value: "gal", label: "Gallon (gal)", dimension: "volume", toBase: 3785.411784 },

  // Count
  { value: "ea", label: "Each (ea)", dimension: "count", toBase: 1 },
  { value: "dozen", label: "Dozen", dimension: "count", toBase: 12 },

  // Discrete pack-style units (self-convert only)
  { value: "pack", label: "Pack", dimension: "discrete", toBase: 1 },
  { value: "case", label: "Case", dimension: "discrete", toBase: 1 },
  { value: "box", label: "Box", dimension: "discrete", toBase: 1 },
  { value: "bag", label: "Bag", dimension: "discrete", toBase: 1 },
  { value: "bottle", label: "Bottle", dimension: "discrete", toBase: 1 },
  { value: "can", label: "Can", dimension: "discrete", toBase: 1 },
  { value: "bunch", label: "Bunch", dimension: "discrete", toBase: 1 },
  { value: "tray", label: "Tray", dimension: "discrete", toBase: 1 },
  { value: "sleeve", label: "Sleeve", dimension: "discrete", toBase: 1 },
];

export const UNIT_GROUPS: { dimension: UnitDimension; label: string; units: UnitDef[] }[] = [
  { dimension: "weight", label: "Weight", units: UNITS.filter((u) => u.dimension === "weight") },
  { dimension: "volume", label: "Volume", units: UNITS.filter((u) => u.dimension === "volume") },
  { dimension: "count", label: "Count", units: UNITS.filter((u) => u.dimension === "count") },
  { dimension: "discrete", label: "Packaging", units: UNITS.filter((u) => u.dimension === "discrete") },
];

const UNIT_MAP = new Map(UNITS.map((u) => [u.value.toLowerCase(), u]));

// Tolerant lookup so legacy free-text units ("Lb", "litre", "gram") still map.
const ALIASES: Record<string, string> = {
  gram: "g", grams: "g", gm: "g", gms: "g",
  kilogram: "kg", kilograms: "kg", kgs: "kg",
  milligram: "mg",
  ounce: "oz", ounces: "oz",
  pound: "lb", pounds: "lb", lbs: "lb",
  litre: "L", liter: "L", litres: "L", liters: "L", l: "L",
  millilitre: "ml", milliliter: "ml", milliliters: "ml", mls: "ml",
  each: "ea", unit: "ea", units: "ea", piece: "ea", pieces: "ea", pcs: "ea", pc: "ea",
  doz: "dozen",
  "fluid ounce": "floz", "fl oz": "floz", "fluid oz": "floz",
  teaspoon: "tsp", tablespoon: "tbsp",
  cups: "cup", pint: "pt", quart: "qt", gallon: "gal", gallons: "gal",
  cases: "case", boxes: "box", bags: "bag", packs: "pack", bottles: "bottle", cans: "can",
};

export function resolveUnit(raw: string | null | undefined): UnitDef | null {
  if (!raw) return null;
  const key = String(raw).trim().toLowerCase();
  if (UNIT_MAP.has(key)) return UNIT_MAP.get(key)!;
  const alias = ALIASES[key];
  if (alias) return UNIT_MAP.get(alias.toLowerCase()) ?? null;
  return null;
}

export function unitLabel(raw: string | null | undefined): string {
  return resolveUnit(raw)?.value ?? String(raw ?? "").trim();
}

// Convert qty from one unit to another. Returns null when the conversion isn't
// defined (different/incompatible dimensions, or unknown units) so callers can
// fall back to a 1:1 assumption.
export function convertUnits(qty: number, from: string, to: string): number | null {
  const f = resolveUnit(from);
  const t = resolveUnit(to);
  if (!f || !t) return null;
  if (f.value === t.value) return qty;
  if (f.dimension !== t.dimension) return null;
  if (f.dimension === "discrete") return null; // only identity converts
  return (qty * f.toBase) / t.toBase;
}

// True when two units measure the same physical dimension (so a recipe qty in
// `recipeUnit` can be costed against an ingredient priced per `stockUnit`).
export function areCompatible(a: string, b: string): boolean {
  const ra = resolveUnit(a);
  const rb = resolveUnit(b);
  if (!ra || !rb) return false;
  if (ra.value === rb.value) return true;
  if (ra.dimension === "discrete" || rb.dimension === "discrete") return false;
  return ra.dimension === rb.dimension;
}
