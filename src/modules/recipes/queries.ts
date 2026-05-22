import { prisma } from "@/lib/prisma";

export async function listRecipes(businessId: string) {
  const recipes = await prisma.recipe.findMany({
    where: { businessId },
    include: { ingredients: { include: { ingredient: true } } },
    orderBy: { name: "asc" },
  });
  return recipes.map((r) => ({
    ...r,
    plateCostCents: r.ingredients.reduce((acc, ri) => acc + Math.round(ri.qty * ri.ingredient.avgCostCents), 0),
  }));
}

export async function getRecipe(businessId: string, id: string) {
  const r = await prisma.recipe.findFirst({
    where: { id, businessId },
    include: { ingredients: { include: { ingredient: true }, orderBy: { id: "asc" } } },
  });
  if (!r) return null;
  const plateCostCents = r.ingredients.reduce((acc, ri) => acc + Math.round(ri.qty * ri.ingredient.avgCostCents), 0);
  return { ...r, plateCostCents };
}

export async function listIngredientsForPicker(businessId: string) {
  return prisma.ingredient.findMany({
    where: { businessId },
    select: { id: true, name: true, unit: true, avgCostCents: true },
    orderBy: { name: "asc" },
  });
}
