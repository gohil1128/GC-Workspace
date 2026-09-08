"use server";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getScope } from "@/lib/scope";
import { requireOwner } from "@/lib/auth";
import { writeAudit } from "@/lib/audit";
import { SECTION_KEYS, UNLOCK_TTL_MINUTES, type SectionKey } from "./sections";

/*
  Section lock.

  One 4-digit PIN for the business, and a list of which sections sit behind it.
  Unlocking opens every locked section for an hour, because the alternative —
  a PIN per section — is three PINs nobody remembers and writes on the till.

  This started as a recipes-only lock; the PIN column was renamed rather than
  replaced so existing PINs keep working, and the migration carries anyone who
  had one over to lockedSections = ['RECIPES'].
*/

const UNLOCKED_COOKIE = "sections-unlocked";

const pinSchema = z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits");

/** True while the current session's unlock is still inside its window. */
async function unlockIsFresh(): Promise<boolean> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(UNLOCKED_COOKIE)?.value;
  if (!raw) return false;
  const unlockedAt = Number(raw);
  if (!Number.isFinite(unlockedAt)) return false;
  return Date.now() - unlockedAt <= UNLOCK_TTL_MINUTES * 60 * 1000;
}

export async function setSectionPinAction(formData: FormData) {
  await requireOwner();
  const scope = await getScope();
  const pin = pinSchema.parse(formData.get("pin"));
  const hash = await bcrypt.hash(pin, 10);
  await prisma.business.update({
    where: { id: scope.businessId },
    data: { sectionPinHash: hash },
  });
  // Setting a PIN should lock, not leave the setter unlocked by accident.
  (await cookies()).delete(UNLOCKED_COOKIE);
  await writeAudit({
    businessId: scope.businessId, userId: scope.userId,
    action: "sections.pin.set", entityType: "Business", entityId: scope.businessId,
  });
  revalidatePath("/", "layout");
}

export async function removeSectionPinAction() {
  await requireOwner();
  const scope = await getScope();
  // Clearing the list too: a PIN-less business with sections still marked
  // locked would show lock badges that guard nothing.
  await prisma.business.update({
    where: { id: scope.businessId },
    data: { sectionPinHash: null, lockedSections: [] },
  });
  (await cookies()).delete(UNLOCKED_COOKIE);
  await writeAudit({
    businessId: scope.businessId, userId: scope.userId,
    action: "sections.pin.remove", entityType: "Business", entityId: scope.businessId,
  });
  revalidatePath("/", "layout");
}

/** Choose which sections the PIN guards. Owner only. */
export async function setLockedSectionsAction(sections: string[]) {
  await requireOwner();
  const scope = await getScope();
  const clean = [...new Set(sections)].filter((s) => SECTION_KEYS.includes(s));
  await prisma.business.update({
    where: { id: scope.businessId },
    data: { lockedSections: clean },
  });
  await writeAudit({
    businessId: scope.businessId, userId: scope.userId,
    action: "sections.locked.set", entityType: "Business", entityId: scope.businessId,
    diff: { lockedSections: clean },
  });
  revalidatePath("/", "layout");
}

export async function unlockSectionsAction(formData: FormData) {
  const scope = await getScope();
  const pinRaw = String(formData.get("pin") ?? "");
  const business = await prisma.business.findUnique({
    where: { id: scope.businessId },
    select: { sectionPinHash: true },
  });
  if (!business?.sectionPinHash) return { ok: true as const };

  const ok = await bcrypt.compare(pinRaw, business.sectionPinHash);
  if (!ok) return { error: "Incorrect PIN" };

  (await cookies()).set(UNLOCKED_COOKIE, String(Date.now()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * UNLOCK_TTL_MINUTES,
    path: "/",
  });
  await writeAudit({
    businessId: scope.businessId, userId: scope.userId,
    action: "sections.unlock", entityType: "Business", entityId: scope.businessId,
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

/** Re-lock everything immediately, without waiting out the hour. */
export async function lockSectionsAction() {
  (await cookies()).delete(UNLOCKED_COOKIE);
  revalidatePath("/", "layout");
}

/** Is this one section closed to the current session right now? */
export async function isSectionLocked(businessId: string, section: SectionKey): Promise<boolean> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { sectionPinHash: true, lockedSections: true },
  });
  if (!business?.sectionPinHash) return false;
  if (!business.lockedSections.includes(section)) return false;
  return !(await unlockIsFresh());
}

/** Every section currently closed — one query, for the nav's lock badges. */
export async function lockedSectionsNow(businessId: string): Promise<SectionKey[]> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { sectionPinHash: true, lockedSections: true },
  });
  if (!business?.sectionPinHash) return [];
  if (await unlockIsFresh()) return [];
  return business.lockedSections.filter((s): s is SectionKey =>
    SECTION_KEYS.includes(s),
  );
}

/**
 * Is this section open right now *only* because someone entered the PIN?
 *
 * Distinct from "not locked": a section nobody chose to lock is open for good
 * and has nothing to re-lock. This is what decides whether the section shows a
 * "Lock" control.
 */
export async function isSectionUnlockedByPin(
  businessId: string,
  section: SectionKey,
): Promise<boolean> {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { sectionPinHash: true, lockedSections: true },
  });
  if (!business?.sectionPinHash) return false;
  if (!business.lockedSections.includes(section)) return false;
  return await unlockIsFresh();
}

/** What the settings card needs: the PIN's existence and the chosen sections. */
export async function sectionLockSettings(businessId: string) {
  const business = await prisma.business.findUnique({
    where: { id: businessId },
    select: { sectionPinHash: true, lockedSections: true },
  });
  return {
    hasPin: !!business?.sectionPinHash,
    locked: (business?.lockedSections ?? []).filter((s): s is SectionKey =>
      SECTION_KEYS.includes(s),
    ),
  };
}
