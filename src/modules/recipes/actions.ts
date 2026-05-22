"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { writeAudit } from "@/lib/audit";
import { toCents } from "@/lib/money";
import { recipeSchema, updateBomSchema } from "./schemas";

export async function createRecipeAction(formData: FormData) {
  const scope = await getScope();
  const parsed = recipeSchema.parse({
    name: formData.get("name"),
    category: formData.get("category"),
    menuPriceDollars: formData.get("menuPriceDollars"),
    yieldQty: formData.get("yieldQty"),
    yieldUnit: formData.get("yieldUnit"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  const r = await prisma.recipe.create({
    data: {
      businessId: scope.businessId,
      name: parsed.name,
      category: parsed.category || null,
      menuPriceCents: toCents(parsed.menuPriceDollars),
      yieldQty: parsed.yieldQty,
      yieldUnit: parsed.yieldUnit,
      isActive: parsed.isActive,
    },
  });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "recipe.create", entityType: "Recipe", entityId: r.id });
  revalidatePath("/recipes");
  redirect(`/recipes/${r.id}`);
}

export async function updateRecipeAction(id: string, formData: FormData) {
  const scope = await getScope();
  const parsed = recipeSchema.parse({
    name: formData.get("name"),
    category: formData.get("category"),
    menuPriceDollars: formData.get("menuPriceDollars"),
    yieldQty: formData.get("yieldQty"),
    yieldUnit: formData.get("yieldUnit"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  });
  const r = await prisma.recipe.findFirst({ where: { id, businessId: scope.businessId } });
  if (!r) throw new Error("Not found");
  await prisma.recipe.update({
    where: { id },
    data: {
      name: parsed.name,
      category: parsed.category || null,
      menuPriceCents: toCents(parsed.menuPriceDollars),
      yieldQty: parsed.yieldQty,
      yieldUnit: parsed.yieldUnit,
      isActive: parsed.isActive,
    },
  });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "recipe.update", entityType: "Recipe", entityId: id });
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${id}`);
}

export async function updateBomAction(recipeId: string, payload: unknown) {
  const scope = await getScope();
  const parsed = updateBomSchema.parse(payload);
  const r = await prisma.recipe.findFirst({ where: { id: recipeId, businessId: scope.businessId } });
  if (!r) throw new Error("Not found");
  await prisma.$transaction([
    prisma.recipeIngredient.deleteMany({ where: { recipeId } }),
    prisma.recipeIngredient.createMany({
      data: parsed.items
        .filter((i) => i.qty > 0)
        .map((i) => ({ recipeId, ingredientId: i.ingredientId, qty: i.qty, unit: i.unit })),
      skipDuplicates: true,
    }),
  ]);
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "recipe.bom.update", entityType: "Recipe", entityId: recipeId });
  revalidatePath("/recipes");
  revalidatePath(`/recipes/${recipeId}`);
}
