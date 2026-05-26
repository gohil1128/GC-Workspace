"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { requireOwner } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const RECIPES_UNLOCKED_COOKIE = "recipes-unlocked";
const UNLOCK_TTL_MINUTES = 60;

const pinSchema = z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits");

export async function setRecipesPinAction(formData: FormData) {
  await requireOwner();
  const scope = await getScope();
  const pin = pinSchema.parse(formData.get("pin"));
  const hash = await bcrypt.hash(pin, 10);
  await prisma.business.update({ where: { id: scope.businessId }, data: { recipesPinHash: hash } });
  // Newly setting a PIN should LOCK by default — clear the unlocked cookie.
  const cookieStore = await cookies();
  cookieStore.delete(RECIPES_UNLOCKED_COOKIE);
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "recipes.pin.set", entityType: "Business", entityId: scope.businessId });
  revalidatePath("/", "layout");
}

export async function removeRecipesPinAction() {
  await requireOwner();
  const scope = await getScope();
  await prisma.business.update({ where: { id: scope.businessId }, data: { recipesPinHash: null } });
  const cookieStore = await cookies();
  cookieStore.delete(RECIPES_UNLOCKED_COOKIE);
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "recipes.pin.remove", entityType: "Business", entityId: scope.businessId });
  revalidatePath("/", "layout");
}

export async function unlockRecipesAction(formData: FormData) {
  const scope = await getScope();
  const pinRaw = String(formData.get("pin") ?? "");
  const business = await prisma.business.findUnique({ where: { id: scope.businessId }, select: { recipesPinHash: true } });
  if (!business?.recipesPinHash) {
    // Nothing to unlock
    return { ok: true };
  }
  const ok = await bcrypt.compare(pinRaw, business.recipesPinHash);
  if (!ok) return { error: "Incorrect PIN" };
  const cookieStore = await cookies();
  cookieStore.set(RECIPES_UNLOCKED_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * UNLOCK_TTL_MINUTES,
    path: "/",
  });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "recipes.unlock", entityType: "Business", entityId: scope.businessId });
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function lockRecipesAction() {
  const cookieStore = await cookies();
  cookieStore.delete(RECIPES_UNLOCKED_COOKIE);
  revalidatePath("/", "layout");
}

export async function isRecipesLocked(businessId: string): Promise<boolean> {
  const business = await prisma.business.findUnique({ where: { id: businessId }, select: { recipesPinHash: true } });
  if (!business?.recipesPinHash) return false;
  const cookieStore = await cookies();
  const raw = cookieStore.get(RECIPES_UNLOCKED_COOKIE)?.value;
  if (!raw) return true;
  const unlockedAt = Number(raw);
  if (!Number.isFinite(unlockedAt)) return true;
  const ageMs = Date.now() - unlockedAt;
  return ageMs > UNLOCK_TTL_MINUTES * 60 * 1000;
}

export async function hasRecipesPin(businessId: string): Promise<boolean> {
  const b = await prisma.business.findUnique({ where: { id: businessId }, select: { recipesPinHash: true } });
  return !!b?.recipesPinHash;
}
