"use server";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { requireOwner } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const inviteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  role: z.enum(["OWNER", "MANAGER"]),
});

// Generates a friendly 12-char password (no ambiguous chars like 0/O/l/1)
function generatePassword(): string {
  const chars = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 12; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

export async function inviteUserAction(formData: FormData): Promise<{ ok: true; email: string; password: string } | { error: string }> {
  await requireOwner();
  const scope = await getScope();
  const parsed = inviteSchema.safeParse({
    name: formData.get("name"),
    email: String(formData.get("email") ?? "").trim().toLowerCase(),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return { error: "A user with that email already exists." };

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        businessId: scope.businessId,
        name: parsed.data.name,
        email: parsed.data.email,
        role: parsed.data.role,
        passwordHash,
      },
    });
    // Give the new user access to every location in the business
    const locations = await tx.location.findMany({ where: { businessId: scope.businessId }, select: { id: true } });
    if (locations.length > 0) {
      await tx.userLocation.createMany({
        data: locations.map((l) => ({ userId: user.id, locationId: l.id })),
        skipDuplicates: true,
      });
    }
    await writeAudit({
      businessId: scope.businessId, userId: scope.userId,
      action: "user.invite", entityType: "User", entityId: user.id,
      diff: { name: user.name, email: user.email, role: user.role },
    });
  });

  revalidatePath("/settings/users");
  return { ok: true, email: parsed.data.email, password };
}

export async function resetPasswordAction(userId: string): Promise<{ ok: true; email: string; password: string } | { error: string }> {
  await requireOwner();
  const scope = await getScope();
  const user = await prisma.user.findFirst({ where: { id: userId, businessId: scope.businessId } });
  if (!user) return { error: "User not found" };

  const password = generatePassword();
  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });

  await writeAudit({
    businessId: scope.businessId, userId: scope.userId,
    action: "user.password_reset", entityType: "User", entityId: userId,
  });

  revalidatePath("/settings/users");
  return { ok: true, email: user.email, password };
}

export async function deleteUserAction(userId: string) {
  await requireOwner();
  const scope = await getScope();
  if (userId === scope.userId) throw new Error("You can't delete your own account.");
  const user = await prisma.user.findFirst({ where: { id: userId, businessId: scope.businessId } });
  if (!user) throw new Error("User not found");

  // Block deleting the last owner (we always need at least one OWNER)
  if (user.role === "OWNER") {
    const ownerCount = await prisma.user.count({ where: { businessId: scope.businessId, role: "OWNER" } });
    if (ownerCount <= 1) throw new Error("Can't delete the last owner. Promote someone else first.");
  }

  await prisma.user.delete({ where: { id: userId } });
  await writeAudit({
    businessId: scope.businessId, userId: scope.userId,
    action: "user.delete", entityType: "User", entityId: userId,
    diff: { name: user.name, email: user.email },
  });
  revalidatePath("/settings/users");
}

export async function updateUserRoleAction(userId: string, role: "OWNER" | "MANAGER") {
  await requireOwner();
  const scope = await getScope();
  if (userId === scope.userId && role !== "OWNER") {
    throw new Error("You can't demote yourself.");
  }
  const user = await prisma.user.findFirst({ where: { id: userId, businessId: scope.businessId } });
  if (!user) throw new Error("User not found");

  if (user.role === "OWNER" && role === "MANAGER") {
    const ownerCount = await prisma.user.count({ where: { businessId: scope.businessId, role: "OWNER" } });
    if (ownerCount <= 1) throw new Error("Can't demote the last owner.");
  }

  await prisma.user.update({ where: { id: userId }, data: { role } });
  await writeAudit({
    businessId: scope.businessId, userId: scope.userId,
    action: "user.role_change", entityType: "User", entityId: userId,
    diff: { from: user.role, to: role },
  });
  revalidatePath("/settings/users");
}
