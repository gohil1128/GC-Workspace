import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

const LOCATION_COOKIE = "active-location";

export type Scope = {
  userId: string;
  businessId: string;
  role: "OWNER" | "MANAGER";
  locationId: string;
  locationName: string;
  availableLocations: { id: string; name: string; kind: "STORE" | "EVENT" }[];
};

export async function getScope(): Promise<Scope> {
  const user = await requireUser();
  const cookieStore = await cookies();
  const requested = cookieStore.get(LOCATION_COOKIE)?.value;

  const memberships = await prisma.userLocation.findMany({
    where: { userId: user.id },
    include: { location: true },
    orderBy: { location: { name: "asc" } },
  });

  const available = memberships.map((m) => m.location);
  if (available.length === 0) throw new Error("NO_LOCATION_ACCESS");

  let active = available.find((l) => l.id === requested);
  if (!active) active = available[0];

  return {
    userId: user.id,
    businessId: user.businessId,
    role: user.role,
    locationId: active.id,
    locationName: active.name,
    availableLocations: available.map((l) => ({ id: l.id, name: l.name, kind: l.kind })),
  };
}

export async function setActiveLocation(locationId: string) {
  const cookieStore = await cookies();
  cookieStore.set(LOCATION_COOKIE, locationId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90,
    path: "/",
  });
}
