import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

const EVENT_COOKIE = "active-event";

export type EventLite = {
  id: string;
  name: string;
  color: string | null;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
};

export async function listAllEvents(businessId: string): Promise<EventLite[]> {
  return prisma.event.findMany({
    where: { businessId },
    orderBy: { startDate: "desc" },
  });
}

export async function listActiveEvents(businessId: string): Promise<EventLite[]> {
  return prisma.event.findMany({
    where: { businessId, isActive: true },
    orderBy: { startDate: "desc" },
  });
}

export async function getActiveEvent(businessId: string): Promise<EventLite | null> {
  const cookieStore = await cookies();
  const id = cookieStore.get(EVENT_COOKIE)?.value;
  if (!id) return null;
  return prisma.event.findFirst({ where: { id, businessId } });
}
