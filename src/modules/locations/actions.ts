"use server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getScope, setActiveLocation } from "@/lib/scope";
import { requireOwner } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const locationSchema = z.object({
  name: z.string().min(1, "Name is required"),
  kind: z.enum(["STORE", "EVENT"]),
  address: z.string().optional().nullable(),
});

export async function createLocationAction(formData: FormData) {
  await requireOwner();
  const scope = await getScope();
  const parsed = locationSchema.parse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    address: formData.get("address") || null,
  });
  const loc = await prisma.location.create({
    data: { businessId: scope.businessId, name: parsed.name, kind: parsed.kind, address: parsed.address || null },
  });
  // Auto-grant the creator (and all OWNER users) access
  const owners = await prisma.user.findMany({ where: { businessId: scope.businessId, role: "OWNER" }, select: { id: true } });
  await prisma.userLocation.createMany({
    data: owners.map((u) => ({ userId: u.id, locationId: loc.id })),
    skipDuplicates: true,
  });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "location.create", entityType: "Location", entityId: loc.id, diff: { name: loc.name } });
  revalidatePath("/settings");
}

export async function updateLocationAction(id: string, formData: FormData) {
  await requireOwner();
  const scope = await getScope();
  const parsed = locationSchema.parse({
    name: formData.get("name"),
    kind: formData.get("kind"),
    address: formData.get("address") || null,
  });
  const existing = await prisma.location.findFirst({ where: { id, businessId: scope.businessId } });
  if (!existing) throw new Error("Not found");
  await prisma.location.update({
    where: { id },
    data: { name: parsed.name, kind: parsed.kind, address: parsed.address || null },
  });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "location.update", entityType: "Location", entityId: id });
  revalidatePath("/settings");
}

export async function deleteLocationAction(id: string) {
  await requireOwner();
  const scope = await getScope();
  const target = await prisma.location.findFirst({ where: { id, businessId: scope.businessId } });
  if (!target) throw new Error("Not found");
  const totalLocations = await prisma.location.count({ where: { businessId: scope.businessId } });
  if (totalLocations <= 1) throw new Error("You must keep at least one location.");

  // Cascade-delete everything tied to the location (schema already has cascade on most relations,
  // but UserLocation is fine and PurchaseOrder cascades from Location)
  await prisma.location.delete({ where: { id } });

  // If they deleted the active location, switch to whichever remains
  if (scope.locationId === id) {
    const remaining = await prisma.location.findFirst({ where: { businessId: scope.businessId } });
    if (remaining) await setActiveLocation(remaining.id);
  }

  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "location.delete", entityType: "Location", entityId: id, diff: { name: target.name } });
  revalidatePath("/settings");
  revalidatePath("/dashboard");
}
