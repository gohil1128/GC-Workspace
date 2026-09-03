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

// Bounding date range covering EVERY event the business has — used for the
// "All events" dashboard view so it shows all event data, not just a recent
// window. Returns null when there are no events (caller falls back to YTD).
export async function getAllEventsRange(
  businessId: string,
): Promise<{ start: Date; end: Date } | null> {
  const agg = await prisma.event.aggregate({
    where: { businessId },
    _min: { startDate: true },
    _max: { endDate: true },
  });
  if (!agg._min.startDate || !agg._max.endDate) return null;
  // Extend the end to "now" if the latest event ended in the past but data is
  // still being entered, so nothing recent is clipped.
  const now = new Date();
  const end = agg._max.endDate > now ? agg._max.endDate : now;
  return { start: agg._min.startDate, end };
}


// Events that haven't finished yet, soonest first — for the dashboard's
// "Upcoming events" card. EventLite omits feeCents, which the card shows, so
// this selects the fee explicitly.
export async function listUpcomingEvents(businessId: string, now: Date, limit = 3) {
  return prisma.event.findMany({
    where: { businessId, endDate: { gte: now } },
    select: {
      id: true,
      name: true,
      startDate: true,
      endDate: true,
      feeCents: true,
      color: true,
    },
    orderBy: { startDate: "asc" },
    take: limit,
  });
}
