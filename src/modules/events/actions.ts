"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { requireOwner } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";

const EVENT_COOKIE = "active-event";

const eventSchema = z.object({
  name: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  color: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  isActive: z.boolean().default(true),
});

export async function createEventAction(formData: FormData) {
  await requireOwner();
  const scope = await getScope();
  const parsed = eventSchema.parse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    color: formData.get("color"),
    notes: formData.get("notes"),
    isActive: formData.get("isActive") !== "false",
  });
  const ev = await prisma.event.create({
    data: {
      businessId: scope.businessId,
      name: parsed.name,
      startDate: new Date(parsed.startDate),
      endDate: new Date(parsed.endDate),
      color: parsed.color || null,
      notes: parsed.notes || null,
      isActive: parsed.isActive,
    },
  });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "event.create", entityType: "Event", entityId: ev.id, diff: { name: ev.name } });
  revalidatePath("/", "layout");
}

export async function updateEventAction(id: string, formData: FormData) {
  await requireOwner();
  const scope = await getScope();
  const parsed = eventSchema.parse({
    name: formData.get("name"),
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate"),
    color: formData.get("color"),
    notes: formData.get("notes"),
    isActive: formData.get("isActive") !== "false",
  });
  const ev = await prisma.event.findFirst({ where: { id, businessId: scope.businessId } });
  if (!ev) throw new Error("Not found");
  await prisma.event.update({
    where: { id },
    data: {
      name: parsed.name,
      startDate: new Date(parsed.startDate),
      endDate: new Date(parsed.endDate),
      color: parsed.color || null,
      notes: parsed.notes || null,
      isActive: parsed.isActive,
    },
  });
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "event.update", entityType: "Event", entityId: id });
  revalidatePath("/", "layout");
}

export async function deleteEventAction(id: string) {
  await requireOwner();
  const scope = await getScope();
  const ev = await prisma.event.findFirst({ where: { id, businessId: scope.businessId } });
  if (!ev) throw new Error("Not found");
  await prisma.$transaction([
    prisma.dailySales.updateMany({ where: { eventId: id }, data: { eventId: null } }),
    prisma.cashClose.updateMany({ where: { eventId: id }, data: { eventId: null } }),
    prisma.event.delete({ where: { id } }),
  ]);
  const cookieStore = await cookies();
  if (cookieStore.get(EVENT_COOKIE)?.value === id) cookieStore.delete(EVENT_COOKIE);
  await writeAudit({ businessId: scope.businessId, userId: scope.userId, action: "event.delete", entityType: "Event", entityId: id, diff: { name: ev.name } });
  revalidatePath("/", "layout");
}

export async function setActiveEventAction(eventId: string | null) {
  const cookieStore = await cookies();
  if (!eventId || eventId === "all") {
    cookieStore.delete(EVENT_COOKIE);
  } else {
    cookieStore.set(EVENT_COOKIE, eventId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 90,
      path: "/",
    });
  }
  revalidatePath("/", "layout");
}
