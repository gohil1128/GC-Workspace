// God's Chai Operations — category presets used across forms so everything is
// grouped the same way everywhere (ingredients, recipes, menu items).
//
// Menu-item categories (Hot Chai / Cold Chais / Food / Tips / Other) live in
// src/modules/items/categories.ts; these cover the supply side.

export const INGREDIENT_CATEGORIES = [
  "Chai & Tea",
  "Dairy & Milk",
  "Spices",
  "Sweeteners",
  "Syrups & Flavors",
  "Produce",
  "Food & Snacks",
  "Beverages",
  "Packaging", // cups, lids, sleeves, napkins, straws
  "Cleaning",
  "Equipment & Smallwares",
  "Other",
] as const;

export const RECIPE_CATEGORIES = [
  "Hot Chai",
  "Cold Chais",
  "Food",
  "Combos",
  "Seasonal / Specials",
  "Other",
] as const;

// What a supplier invoice was for — drives the "spend by category" report.
export const INVOICE_CATEGORIES = [
  "Ingredients & Supplies",
  "Packaging",
  "Beverages",
  "Equipment & Smallwares",
  "Cleaning",
  "Marketing",
  "Rent / Venue",
  "Repairs & Maintenance",
  "Other",
] as const;
